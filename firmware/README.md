# AgriShield yer istasyonu (ESP32)

Demoda **Wi-Fi**, sahada **LoRa**. Kod içinde `// SAHADA: LoRa modülü buraya` yorumu LoRa'nın gireceği yeri gösterir.

## Parçalar
| Parça | Bağlantı |
|---|---|
| ESP32 DevKit | — |
| Kapasitif toprak nemi sensörü v1.2 | AOUT → GPIO34, VCC → 3V3, GND |
| DHT22 (ya da SHT31) | DATA → GPIO4 (SHT31: SDA 21 / SCL 22) |
| Pil gerilimi (isteğe bağlı) | 100k/100k bölücü orta noktası → GPIO35 |
| Yağış kovası reed anahtarı (isteğe bağlı) | GPIO27 ↔ GND, `USE_RAIN_BUCKET 1` |
| Kapak anahtarı (isteğe bağlı) | GPIO26 ↔ GND, açık = kurcalama, `USE_LID_SWITCH 1` |

## Kurulum
1. `agrishield-station/secrets.example.h` → `agrishield-station/secrets.h` kopyalayın; Wi-Fi, sunucu adresi (`http://<bilgisayar-IP>:3000`) ve `INGEST_SECRET` yazın.
   `INGEST_SECRET` sunucudaki `.env.local` ile **aynı** olmalı.
2. Arduino IDE: kart **ESP32 Dev Module**, kütüphaneler *DHT sensor library* + *Adafruit Unified Sensor* (SHT31 için *Adafruit SHT31*).
   PlatformIO: `cd firmware && pio run -t upload && pio device monitor`.
3. Kalibrasyon: sensörü havada ve bir bardak suda tutup seri monitördeki ham değerleri `DRY_RAW` / `WET_RAW` sabitlerine yazın.
4. Sunucuda `/durum` sayfasında **Yer istasyonu: YEŞİL** görünmeli; ana sayfada rozet **CANLI DONANIM BAĞLI** olur.

## Protokol (`POST /api/ingest`)
```
X-Device-Id: IST-SVK-01
X-Signature: hex(hmac_sha256(INGEST_SECRET, gövde))
{"ts":1777000000,"soilMoisture":12.4,"airTempC":24.1,"humidity":38,"rainMm":0,"batteryV":4.02,"tamper":false,"seq":1043}
```
- `ts` sunucu saatine ±120 sn içinde olmalı → cihaz saati `GET /api/time` ile eşitlenir (internet/NTP gerekmez).
- `seq` her pakette artar; geri giderse sunucu **tekrar saldırısı** bayrağı koyar. Firmware seq'i NVS'de blok blok saklar, yeniden başlatmada geri gitmez.
- İmza tutmazsa 401 ve istasyon tanığı **VERİ YOK** olur.
- Yanıttaki `nextIntervalSec` ölçüm aralığını belirler (sahnede 2 sn, sahada 900 sn). Nem 1,5 puandan fazla değişirse beklemeden gönderilir.

## Donanımsız test
Cihaz yoksa aynı protokolle imzalı paket atan emülatör: `npm run device:emulate` (klavyeden kuru/ıslak/sulama/kurcalama/tekrar saldırısı).
Cihaz 20 sn sessiz kalırsa sunucu simüle cihaza geçer; rozet **SİMÜLE CİHAZ** olur.

> Emülatör büyük sıra numaralarıyla başlar. Ardından gerçek ESP32'ye geçerken sunucudaki sıra sayacını sıfırlayın
> (`/operator` → *Simülasyonu sıfırla*); yoksa gerçek cihazın küçük `seq` değerleri “tekrar saldırısı” diye işaretlenir.
