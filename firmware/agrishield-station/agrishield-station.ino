/*
 * AgriShield yer istasyonu — ESP32 firmware taslağı (AGRISHIELD_PROMPT.md 20.1)
 *
 * Ne yapar?
 *   - Kapasitif toprak nemi + DHT22 (ya da SHT31) okur; isteğe bağlı yağış kovası, kapak (kurcalama) anahtarı, pil gerilimi.
 *   - Ölçümü JSON'a çevirir, HMAC-SHA256 ile imzalar ve POST /api/ingest'e atar.
 *       Başlıklar: X-Device-Id: IST-SVK-01, X-Signature: hex(hmac_sha256(INGEST_SECRET, gövde))
 *   - Sunucu saatini GET /api/time ile eşitler (±120 sn zaman penceresi internetsiz sahnede de tutsun).
 *   - seq sayacı yeniden başlatmada geri gitmez (NVS'de blok rezervasyonu) → sunucu "tekrar saldırısı" sanmaz.
 *   - Nem belirgin değişince beklemeden gönderir (sahnede "sensörü kuru toprağa koy → ekran 2 sn içinde tepki").
 *   - Wi-Fi düşerse geri bağlanır; LED: gönderimde kısa yanıp söner, bağlantı yokken hızlı yanıp söner.
 *
 * Demoda Wi-Fi, sahada LoRa. Kurulum: firmware/README.md
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include "mbedtls/md.h"
#include "secrets.h"  // secrets.example.h'yi kopyalayın: WIFI_SSID, WIFI_PASS, SERVER_BASE, INGEST_SECRET

// ───────────── donanım seçimi ─────────────
#define USE_DHT22 1      // 1: DHT22 (GPIO4)  0: SHT31 (I2C, SDA 21 / SCL 22)
#define USE_RAIN_BUCKET 0 // 1: yağış kovası reed anahtarı GPIO27'de
#define USE_LID_SWITCH 0  // 1: kapak anahtarı GPIO26'da (açık = kurcalama)

#if USE_DHT22
#include <DHT.h>
#else
#include <Wire.h>
#include <Adafruit_SHT31.h>
#endif

// ───────────── pinler ─────────────
const int PIN_SOIL = 34;     // kapasitif nem sensörü (analog, yalnız giriş pini)
const int PIN_BATT = 35;     // pil gerilimi, 2:1 bölücü (100k/100k)
const int PIN_DHT = 4;
const int PIN_RAIN = 27;
const int PIN_LID = 26;
const int PIN_LED = 2;       // kart üstü LED

// ───────────── ayarlar ─────────────
const char* DEVICE_ID = "IST-SVK-01";
// Kalibrasyon (12 bit ADC): sensör havada ≈ DRY_RAW, suda ≈ WET_RAW. Kendi sensörünüzle ölçüp güncelleyin.
const int DRY_RAW = 3000;
const int WET_RAW = 1250;
// Ham değer → hacimsel nem (%). Kaba doğrusal eşleme: kuru toprak ~%5, doygun toprak ~%45.
const float VWC_AT_DRY = 0.0f;
const float VWC_AT_WET = 50.0f;
const float RAIN_MM_PER_TIP = 0.2794f;   // tipik kova: 0,2794 mm / devrilme
const float CHANGE_SEND_THRESHOLD = 1.5f; // nem bu kadar puan değişirse hemen gönder
const uint32_t SAMPLE_MS = 500;           // örnekleme aralığı
const uint32_t MIN_GAP_MS = 1000;         // iki gönderim arası en az
const uint32_t TIME_SYNC_MS = 10UL * 60UL * 1000UL;
const uint32_t SEQ_BLOCK = 100;           // NVS'ye 100 pakette bir yazılır

#if USE_DHT22
DHT dht(PIN_DHT, DHT22);
#else
Adafruit_SHT31 sht31;
#endif
Preferences prefs;

uint32_t seq = 0;
uint32_t seqReservedUntil = 0;
int64_t epochOffset = 0;        // sunucu epoch (sn) − millis()/1000
bool timeSynced = false;
uint32_t lastSendMs = 0;
uint32_t lastSampleMs = 0;
uint32_t lastSyncMs = 0;
uint32_t intervalMs = 15000;    // sunucu yanıtındaki nextIntervalSec ile güncellenir (sahnede 2 sn)
float lastSentSoil = -100;
float soilSmoothed = -1;
volatile uint32_t rainTips = 0;
float rainAccumMm = 0;          // son gönderimden beri yağış

void IRAM_ATTR onRainTip() {
  static uint32_t last = 0;
  uint32_t now = millis();
  if (now - last > 150) {  // reed anahtarı sıçramasını süz
    rainTips++;
    last = now;
  }
}

// ───────────── yardımcılar ─────────────
void blink(int times, int ms) {
  for (int i = 0; i < times; i++) {
    digitalWrite(PIN_LED, HIGH);
    delay(ms);
    digitalWrite(PIN_LED, LOW);
    delay(ms);
  }
}

String hmacHex(const String& body) {
  uint8_t out[32];
  mbedtls_md_context_t ctx;
  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), 1);
  mbedtls_md_hmac_starts(&ctx, (const unsigned char*)INGEST_SECRET, strlen(INGEST_SECRET));
  mbedtls_md_hmac_update(&ctx, (const unsigned char*)body.c_str(), body.length());
  mbedtls_md_hmac_finish(&ctx, out);
  mbedtls_md_free(&ctx);
  static const char* hex = "0123456789abcdef";
  String s;
  s.reserve(64);
  for (int i = 0; i < 32; i++) {
    s += hex[out[i] >> 4];
    s += hex[out[i] & 0x0f];
  }
  return s;
}

/** seq: yeniden başlatmada geri gitmesin diye NVS'de SEQ_BLOCK'luk bloklar rezerve edilir. */
void seqInit() {
  prefs.begin("agrishield", false);
  uint32_t base = prefs.getULong("seq", 0);
  seq = base;
  seqReservedUntil = base + SEQ_BLOCK;
  prefs.putULong("seq", seqReservedUntil);
}

uint32_t seqNext() {
  seq++;
  if (seq >= seqReservedUntil) {
    seqReservedUntil = seq + SEQ_BLOCK;
    prefs.putULong("seq", seqReservedUntil);
  }
  return seq;
}

bool ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  Serial.println("[wifi] bağlanıyor…");
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 10000) {
    digitalWrite(PIN_LED, !digitalRead(PIN_LED));  // hızlı yanıp sönme = bağlantı yok
    delay(120);
  }
  digitalWrite(PIN_LED, LOW);
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[wifi] bağlandı: %s\n", WiFi.localIP().toString().c_str());
    return true;
  }
  Serial.println("[wifi] bağlanamadı, sonra tekrar denenecek");
  return false;
}

/** Sunucu saatine eşitle: GET /api/time → epoch saniye (düz metin). */
bool syncTime() {
  HTTPClient http;
  http.setTimeout(4000);
  http.begin(String(SERVER_BASE) + "/api/time");
  int code = http.GET();
  if (code == 200) {
    int64_t serverEpoch = http.getString().toInt();
    if (serverEpoch > 1600000000) {
      epochOffset = serverEpoch - (int64_t)(millis() / 1000);
      timeSynced = true;
      lastSyncMs = millis();
      Serial.printf("[saat] eşitlendi: %ld\n", (long)serverEpoch);
    }
  } else {
    Serial.printf("[saat] /api/time hata: %d\n", code);
  }
  http.end();
  return timeSynced;
}

int64_t nowEpoch() { return epochOffset + (int64_t)(millis() / 1000); }

float readSoilPct() {
  // 16 örneğin ortalaması (ADC gürültüsü)
  uint32_t sum = 0;
  for (int i = 0; i < 16; i++) sum += analogRead(PIN_SOIL);
  float raw = sum / 16.0f;
  float t = (DRY_RAW - raw) / float(DRY_RAW - WET_RAW);  // 0 = kuru (hava), 1 = ıslak (su)
  t = constrain(t, 0.0f, 1.0f);
  return VWC_AT_DRY + t * (VWC_AT_WET - VWC_AT_DRY);
}

float readBatteryV() {
  uint32_t mv = analogReadMilliVolts(PIN_BATT);
  return (mv * 2) / 1000.0f;  // 2:1 bölücü
}

// ───────────── gönderim ─────────────
bool sendReading(float soil, float tempC, float hum, float rainMm, float battV, bool tamper) {
  if (!ensureWifi()) return false;
  if (!timeSynced || millis() - lastSyncMs > TIME_SYNC_MS) syncTime();
  if (!timeSynced) return false;  // saatsiz paket sunucuda zaman penceresine takılır

  uint32_t s = seqNext();
  // İmza gövdenin kendisi üzerinden atılır; anahtar sırası önemli değil. Sayılar nokta ondalıklı.
  // Okunamayan sensör (NaN) alanı hiç gönderilmez; sunucu opsiyonel kabul eder.
  String extra;
  if (!isnan(tempC)) extra += "\"airTempC\":" + String(tempC, 1) + ",";
  if (!isnan(hum)) extra += "\"humidity\":" + String(constrain(hum, 0.0f, 100.0f), 0) + ",";
  char body[256];
  int n = snprintf(body, sizeof(body), "{\"ts\":%ld,\"soilMoisture\":%.1f,%s\"rainMm\":%.2f,\"batteryV\":%.2f,\"tamper\":%s,\"seq\":%lu}",
                   (long)nowEpoch(), soil, extra.c_str(), rainMm, battV, tamper ? "true" : "false", (unsigned long)s);
  if (n <= 0 || n >= (int)sizeof(body)) return false;
  String payload(body);

  // SAHADA: LoRa modülü buraya — paket HTTP yerine LoRa ile köy gateway'ine gider (SX1276/RFM95, 868 MHz),
  //         gateway aynı gövde + imzayı /api/ingest'e iletir. İmza cihazda atıldığı için gateway paketi değiştiremez.
  HTTPClient http;
  http.setTimeout(5000);
  http.begin(String(SERVER_BASE) + "/api/ingest");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Signature", hmacHex(payload));
  int code = http.POST(payload);
  String resp = http.getString();
  http.end();

  if (code == 200) {
    digitalWrite(PIN_LED, HIGH);
    delay(40);
    digitalWrite(PIN_LED, LOW);
    // sunucu ölçüm aralığını söyler (sahnede 2, sahada 900 sn)
    int k = resp.indexOf("\"nextIntervalSec\":");
    if (k >= 0) {
      long sec = resp.substring(k + 18).toInt();
      if (sec >= 1 && sec <= 3600) intervalMs = sec * 1000UL;
    }
    Serial.printf("[gönder] seq=%lu nem=%.1f → 200\n", (unsigned long)s, soil);
    return true;
  }
  Serial.printf("[gönder] seq=%lu → %d %s\n", (unsigned long)s, code, resp.c_str());
  if (code == 401 && resp.indexOf("ZAMAN") >= 0) timeSynced = false;  // saat kaydı → yeniden eşitle
  blink(3, 60);
  return false;
}

// ───────────── Arduino ─────────────
void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED, OUTPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_SOIL, ADC_11db);
#if USE_DHT22
  dht.begin();
#else
  Wire.begin(21, 22);
  sht31.begin(0x44);
#endif
#if USE_RAIN_BUCKET
  pinMode(PIN_RAIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_RAIN), onRainTip, FALLING);
#endif
#if USE_LID_SWITCH
  pinMode(PIN_LID, INPUT_PULLUP);
#endif
  seqInit();
  Serial.printf("\nAgriShield istasyonu %s · seq başlangıcı %lu\n", DEVICE_ID, (unsigned long)seq);
  ensureWifi();
  syncTime();
}

void loop() {
  uint32_t now = millis();
  if (now - lastSampleMs < SAMPLE_MS) {
    delay(10);
    return;
  }
  lastSampleMs = now;

  float soil = readSoilPct();
  soilSmoothed = soilSmoothed < 0 ? soil : soilSmoothed * 0.5f + soil * 0.5f;

#if USE_RAIN_BUCKET
  noInterrupts();
  uint32_t tips = rainTips;
  rainTips = 0;
  interrupts();
  rainAccumMm += tips * RAIN_MM_PER_TIP;
#endif

  bool changed = fabsf(soilSmoothed - lastSentSoil) >= CHANGE_SEND_THRESHOLD;
  bool due = now - lastSendMs >= intervalMs;
  if ((changed && now - lastSendMs >= MIN_GAP_MS) || due) {
#if USE_DHT22
    float t = dht.readTemperature();
    float h = dht.readHumidity();
#else
    float t = sht31.readTemperature();
    float h = sht31.readHumidity();
#endif
#if USE_LID_SWITCH
    bool tamper = digitalRead(PIN_LID) == HIGH;  // kapak açık
#else
    bool tamper = false;
#endif
    if (sendReading(soilSmoothed, t, h, rainAccumMm, readBatteryV(), tamper)) {
      lastSentSoil = soilSmoothed;
      rainAccumMm = 0;
    }
    lastSendMs = now;  // başarısızsa da bir sonraki aralığı bekle (sunucuyu boğma)
  }
}
