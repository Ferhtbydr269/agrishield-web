# AgriShield Web — Claude Code Yapım Promptu (v1.0)

> **Bu dosya nedir?** Claude Code'a verilecek tek kaynaklı iş emri. TEKNOFEST 2026 Finansal
> Teknolojiler finalinde (30 Eylül – 4 Ekim 2026, Şanlıurfa) sahnede kullanılacak, backend'li,
> yapay zekâ asistanlı ve 3D saha simülatörlü AgriShield web sitesini uçtan uca tarif eder.
> Takım: AlgoVest (Takım ID 958027).
>
> **Nasıl kullanılır?**
> 1. Bu dosyayı proje klasörüne koy (`agrishield-web/AGRISHIELD_PROMPT.md`).
> 2. Terminalde klasörde `claude` başlat ve şunu yaz:
>    `AGRISHIELD_PROMPT.md dosyasını baştan sona oku. Faz 0'dan başlayarak uygula. Her fazın sonunda dur, "Faz X bitti" raporu ver, kabul kriterlerini kendin test et ve commit at. Ben onaylamadan bir sonraki faza geçme.`
> 3. Faz aralarında ekran görüntüsü iste, sahneye göre ayar yaptır.

---

## 0. Claude Code için çalışma kuralları (bunlara harfiyen uy)

1. **Fazlı çalış.** Faz 0 → Faz 8. Her fazın sonunda: `git add -A && git commit -m "faz-X: ..."`,
   kısa rapor (ne yapıldı, ne eksik), kabul kriterlerinin kendi testin.
2. **Rakam uydurma.** Sitede görünen her sayı `src/content/facts.ts` dosyasından gelir ve her
   sayının yanında kaynak etiketi vardır (bkz. Bölüm 14). Bu dosyada olmayan bir sayıyı ekranda
   gösterme. Eksik veri varsa `null` bırak ve UI'da "veri bekleniyor" rozetini göster.
3. **Simülasyonu gizleme.** Gerçek olmayan her adım (banka ödemesi, SMS, oracle) ekranda
   `SİMÜLASYON` rozetiyle işaretlenir. Jüriye yalan söyleyen bir ekran, projeyi bitirir.
4. **Kurum logosu/markası kullanma.** TARSİM, MGM, Ziraat, TCMB gibi kurumların logoları,
   resmi görselleri veya "iş ortağımız" imasını içeren hiçbir öğe olmayacak. Kurum adları sadece
   düz metin olarak, "veri kaynağı" ya da "hedef müşteri" bağlamında geçer.
5. **İnternet olmadan çalışmalı.** Yazı tipleri, ikonlar, 3D varlıklar, uydu verisi, harita
   görselleri — hepsi repoda yerel. Runtime'da hiçbir CDN'e istek atılmayacak. Harita için
   uzaktan tile çekme; yerel GeoJSON + kendi çizdiğin parsel poligonları kullan.
6. **Sahne önceliklidir.** Bir özellik sahnede 15 dakikada gösterilemiyorsa, onu "detay sayfası"na
   koy, ana akışı sadeleştir. Sunum akışı Bölüm 13'te; ona göre optimize et.
7. **Küçük commit, çalışır durum.** Her commit sonrası `npm run build` hatasız geçmeli.
8. **Türkçe.** Tüm arayüz metinleri Türkçe, kod/değişken adları İngilizce. Metinleri Bölüm 14'ten
   birebir al; kendi kopyanı yazma (bu metinler kaynak kontrolünden geçti).
9. **Karar verirken sor değil, varsayıp yaz.** Belirsizlikte en basit ve en sağlam olanı seç,
   `DECISIONS.md` dosyasına "şunu şu yüzden seçtim" diye tek satır yaz.
10. **Bana hazır komut ver.** Her fazın raporunda çalıştırma komutunu ve test edilecek URL'yi yaz.

---

## 1. Bağlam: proje 10 satırda

AgriShield, kuraklık için **parametrik tarım sigortası altyapısıdır**. Klasik sigorta zararı ölçer;
parametrik sigorta zarara sebep olan olayı ölçer ve eşik aşılınca **başvuru olmadan** öder.

- **Problem:** Türkiye'de kuraklık sigortası köy ortalamasına göre ve hasattan sonra ödüyor.
  Tarlası kuruyan çiftçi ya çok geç alıyor ya hiç alamıyor (basis risk).
- **Çözüm:** Her parsel uydudan, her köy bir yer istasyonundan izlenir; resmi meteoroloji üçüncü
  tanıktır. **Üç tanıktan en az ikisi** kuraklığı doğrularsa akıllı sözleşme ödemeyi onaylar; para
  **TL olarak FAST ile IBAN'a** gider. Tek tanık "evet" derse vaka **eksper incelemesine** düşer.
- **Yapay zekâ tanık değildir, hakemdir:** eşikleri ürüne/döneme göre ayarlar, primi hesaplar,
  erken uyarı üretir, şüpheli veriyi işaretler.
- **Blokzincir parayı taşımaz**, kuralı ve kanıtı korur (çok taraflı güven: çiftçi, sigortacı,
  devlet, reasürör).
- **Konumlandırma:** TARSİM'in rakibi değil; parsel bazlı sigortanın ölçüm–karar–ödeme altyapısı.

Sitenin görevi: **bu zinciri jürinin gözünde canlandırmak.** Metin değil, çalışan sistem göstereceğiz.

---

## 2. Hedef kullanım senaryoları (tasarım bunlara göre yapılacak)

| # | Senaryo | Kısıtlar |
|---|---------|----------|
| S1 | **Sahne sunumu** — 1920×1080 projeksiyon, 8–10 m uzaktan izleyen jüri, 15 dk | Dev tipografi, yüksek kontrast, koyu tema, klavye kısayollarıyla sürülen akış, fare arama yok |
| S2 | **Jüri etkileşimi** — jüri üyesi sensörü kuru toprağa taşır, ekran canlı tepki verir | Gerçek donanımdan gelen veriye < 2 sn tepki, gösterişli ama abartısız animasyon |
| S3 | **Jüri telefonu** — QR ile kanıt sayfası ve asistan açılır | Mobil öncelikli, 3G'de < 3 sn, offline yedek metin |
| S4 | **Stant/sonrası** — kendi kendine dönen demo, ziyaretçi keşfi | Kiosk modu, 90 sn'de bir kendi kendine başa saran döngü |
| S5 | **Geliştirici/hakem incelemesi** — "bu gerçekten çalışıyor mu?" | Açık API, `/durum` sağlık sayfası, testnet işlem linki, kaynak kodu README'si |

**Altın kural:** Sahnede internet yoksa hiçbir şey bozulmaz. `OFFLINE=1` ile tüm dış bağımlılıklar
(zincir, SMS, AI) yerel taklitçilere düşer ve UI bunu rozetle söyler.

---

## 3. Sayfa haritası ve rotalar

```
/                     Ana sahne (tek sayfa akış, sunum modunun omurgası)
  #problem            Problem: Mehmet Amca ve iki tablo (köy ortalaması / hasat sonrası)
  #cozum              Üç tanık ve 2/3 kuralı (interaktif oylama)
  #urun               Mimari: 6 adım (Ölç → Topla → Anla → Doğrula → Karar → Öde)
  #saha               3D SAHA SİMÜLATÖRÜ (Bölüm 12) — sitenin yıldızı
  #demo               Canlı demo konsolu: zaman makinesi + tetik + zincir + ödeme
  #ticari             İş modeli + prim hesaplayıcı + pazar (aşağıdan yukarıya)
  #risk               Risk matrisi (olasılık × etki, tıklanabilir önlemler)
  #yol                3 fazlı yol haritası + gölge mod pilot
  #takim              Takım
/parsel/[id]          Parsel detay: NDVI grafiği, tanık geçmişi, poliçe kartı, karar günlüğü
/k/[kod]              KANIT SAYFASI (QR hedefi): tek bir kararın tüm delili, herkese açık
/asistan              AgriShield Asistanı (AI soru-cevap, kaynak göstererek)
/operator             Operatör paneli (şifreli): senaryo seçimi, cihaz durumu, manuel tetik
/sunucu               Sunum kontrol ekranı (2. ekran): sahne listesi, süre sayacı, notlar
/api/*                Bölüm 7
/durum                Sistem sağlık sayfası: bileşen bileşen yeşil/kırmızı
```

Ana sayfa **tek akış** (scroll-snap section'lar) + her bölümün sağ üstünde "detaya git" bağlantısı.
Sunum modunda scroll yok; sahneler klavye ile değişir.

---

## 4. Tasarım sistemi

### 4.1 Marka ve his
"Toprak + uydu": sıcak toprak tonları üzerine hassas, ölçüm aleti gibi bir arayüz. NASA görev
kontrol paneli ile tarım defteri arası. Gereksiz gradient, cam efekti, mor-mavi "AI" klişesi yok.

### 4.2 Renk paleti (tam değerler)
```css
/* Koyu (sahne) tema — varsayılan */
--bg:        #0E1A14;  /* gece tarlası */
--surface:   #142218;
--surface-2: #1B2C21;
--line:      #2A3C31;
--text:      #F2F7F3;
--text-dim:  #A9BCAF;

--green:     #2F9E6B;  /* sağlıklı bitki / EVET */
--green-dim: #1D5A43;
--wheat:     #E0A526;  /* uyarı / gri bölge / vurgu */
--wheat-dim: #8A5D06;
--sky:       #4AA3E8;  /* uydu / veri */
--violet:    #8B7BD8;  /* yapay zekâ */
--soil:      #B07C4F;  /* toprak / istasyon */
--red:       #E05A47;  /* kuraklık / HAYIR / hata */
--chain:     #C9D6CE;  /* blokzincir gri-yeşil */

/* Açık (gündüz/stant) tema */
--bg: #FBF8F1; --surface:#FFFFFF; --text:#16211B; --line:#E5DDCB; (vurgu renkleri aynı, %15 koyultulur)
```
Anlam sabittir: **yeşil = doğrulandı, sarı = belirsiz/gri bölge, kırmızı = kuraklık/ret,
mavi = uydu, mor = yapay zekâ, kahve = yer istasyonu.** Bu eşleme tüm sitede ve 3D sahnede aynı.

### 4.3 Tipografi
- Başlık: **Bricolage Grotesque** (700/800) — `@fontsource/bricolage-grotesque`, self-host.
- Gövde: **Inter** (400/600/700) — `@fontsource/inter`.
- Sayı/teknik: **JetBrains Mono** (hash, işlem no, koordinat).
- Sahne modu minimumları: gövde 22 px, etiket 18 px, ana rakam 96–160 px, başlık 48–72 px.
- Normal mod: gövde 16–17 px, satır yüksekliği 1.6.

### 4.4 Hareket (motion) kuralları
- Süreler: mikro 120 ms, bileşen 220 ms, sahne geçişi 420 ms. Easing `cubic-bezier(.2,.8,.2,1)`.
- Veri değişimi animasyonu **anlamlı** olmalı: sayı sayaçla artar, tanık çipi "yanar", zincir
  bloğu yerine oturur. Süsleme amaçlı parlama/parallax yok.
- `prefers-reduced-motion` açıksa tüm sahne geçişleri anında olur, 3D otomatik dönüş durur.

### 4.5 Bileşen kütüphanesi (yazılacaklar)
`Stat` (dev rakam + etiket + kaynak tooltip), `SourceTag` (küçük üst simge, hover'da kaynak +
link), `WitnessChip` (uydu/istasyon/meteoroloji: gri → yeşil/kırmızı geçişli), `DecisionBadge`
(ÖDE / GRİ BÖLGE / ÖDEME YOK), `Timeline` (aylar, olaylar), `NDVIChart` (normal aralık bandı +
bu yıl çizgisi + eşik çizgisi), `SoilGauge` (0–%50 nem, kritik bölge taralı), `RainBars`
(30 günlük yağış), `BlockCard` (zincir bloğu: önceki hash, içerik, hash), `ProofCard` (kanıt
özeti + QR), `PhoneMock` (SMS ekranı), `ScenePanel` (sunum modunda tam ekran sahne kabuğu),
`SimBadge` (SİMÜLASYON), `LiveBadge` (CANLI DONANIM BAĞLI), `HotspotMarker` (3D için 2B etiket).

---

## 5. Teknik mimari

### 5.1 Stack (varsayılan; değiştirme, sadece sürümleri güncelle)
- **Next.js 15 (App Router) + TypeScript (strict)** — tek repoda hem UI hem API.
- **Tailwind CSS v4** + CSS değişkenleriyle tema; `shadcn/ui` bileşen tabanı (kopyalayarak, paket değil).
- **React Three Fiber + drei** (3D), **Framer Motion** (2D hareket), **Zustand** (istemci durumu),
  **Recharts** (grafikler; NDVI grafiğini kendi SVG'nle de yazabilirsin, daha iyi kontrol için serbestsin).
- **Prisma + SQLite** (varsayılan, dosya tabanlı, internetsiz çalışır) — `DATABASE_URL="file:./dev.db"`.
  Dağıtım için `DB_PROVIDER=postgres` ile Supabase/Neon'a geçebilecek şekilde soyutla.
- **SSE (Server-Sent Events)** ile canlı yayın (`/api/stream`). WebSocket'e gerek yok, tek yönlü akış yeterli.
- **ethers v6** (Polygon Amoy testnet) — opsiyonel; yoksa `MockChain` devreye girer.
- **Playwright** (uçtan uca test), **Vitest** (karar motoru birim testleri).

### 5.2 Klasör yapısı
```
agrishield-web/
├─ AGRISHIELD_PROMPT.md          (bu dosya)
├─ DECISIONS.md                  (aldığın kararlar, tek satırlık gerekçelerle)
├─ README.md                     (kurulum, sahne günü komutları, yedek planlar)
├─ prisma/schema.prisma
├─ scripts/
│  ├─ seed.ts                    (parseller, poliçeler, 2025 sezonu verisi)
│  ├─ fetch-sentinel.ts          (opsiyonel: gerçek NDVI çekme, çıktı JSON'a)
│  └─ dry-run.ts                 (sunum provası: tüm senaryoları başsız koşturur, rapor basar)
├─ data/
│  ├─ parcels.geojson            (Şanlıurfa/Siverek örnek parsel poligonları)
│  ├─ ndvi-2025.json             (parsel × tarih → NDVI; kaynak etiketli)
│  ├─ weather-2025.json          (günlük yağış, sıcaklık, toprak nemi)
│  └─ knowledge.json             (asistanın bilgi tabanı: 32 soru + gerçekler)
├─ contracts/AgriShieldPolicy.sol
├─ src/
│  ├─ app/                       (rotalar, Bölüm 3)
│  ├─ components/                (Bölüm 4.5)
│  ├─ scene3d/                   (Bölüm 12: Field, Station, Satellite, DataFlow, Hotspots…)
│  ├─ engine/                    (decision.ts, phenology.ts, anomaly.ts, pricing.ts)
│  ├─ server/                    (db.ts, chain.ts, payments.ts, sms.ts, ai.ts, bus.ts)
│  ├─ content/                   (facts.ts, copy.ts, sources.ts, scenes.ts)
│  └─ store/                     (presentation.ts, sim.ts, device.ts)
└─ public/                       (self-host fontlar, favicon, QR)
```

### 5.3 Ortam değişkenleri (`.env.example` olarak yaz)
```
DATABASE_URL="file:./dev.db"
OFFLINE=1                      # 1: tüm dış servisler taklit
DEMO_SEED=2025-sanliurfa       # seed senaryosu
CHAIN_MODE=mock                # mock | amoy
AMOY_RPC_URL=
AMOY_PRIVATE_KEY=              # SADECE testnet cüzdanı, .env.local'da, repoya asla girmez
CONTRACT_ADDRESS=
AI_MODE=local                  # local (bilgi tabanı) | api (Anthropic)
ANTHROPIC_API_KEY=
SMS_MODE=mock                  # mock | provider
OPERATOR_PIN=1907              # /operator girişi
INGEST_SECRET=degistir-bunu    # ESP32 HMAC anahtarı
NEXT_PUBLIC_STAGE_MODE=1       # sahne (koyu, dev tipografi) varsayılan
```

### 5.4 Çalıştırma
```
npm i && npx prisma migrate dev && npm run seed && npm run dev     # geliştirme
npm run build && npm start                                          # sahne (daha akıcı)
npm run dry-run                                                     # sunum provası, rapor
```
Sahne bilgisayarında **build alınmış hali** çalışacak (dev modu takılabilir). README'ye yaz.

---

## 6. Veri modeli ve tohum (seed) verisi

### 6.1 Prisma şeması (birebir kullan, gerekirse alan ekle)
```prisma
model Parcel {
  id           String   @id                 // "P-1182" (takma ad; kişisel veri YOK)
  name         String                        // "Siverek / Karakoyun mevkii"
  village      String
  district     String
  crop         String                        // "bugday" | "kirmizi_mercimek" | "arpa"
  areaDonum    Float
  soilType     String                        // "killi" | "tinli" | "kumlu"
  irrigated    Boolean  @default(false)
  geojson      String                        // poligon
  centroidLat  Float
  centroidLng  Float
  policies     Policy[]
  readings     Reading[]
  decisions    Decision[]
}

model Policy {
  id           String   @id @default(cuid())
  parcelId     String
  parcel       Parcel   @relation(fields: [parcelId], references: [id])
  season       String                        // "2025-2026"
  sumInsuredTl Int                           // sigorta bedeli
  payoutRate   Float                         // 0.5 → tetiklenirse bedelin %50'si
  premiumTl    Int                           // brüt prim
  subsidyRate  Float                         // 0.7
  thresholds   String                        // JSON: karar motoru eşikleri (Bölüm 8)
  status       String   @default("aktif")
  decisions    Decision[]
}

model Station {                               // köy referans istasyonu
  id           String   @id                   // "IST-SVK-01"
  village      String
  lat          Float
  lng          Float
  batteryV     Float?
  lastSeenAt   DateTime?
  tamper       Boolean  @default(false)
  readings     Reading[]
}

model Reading {                               // her ölçüm (gerçek cihaz veya simülasyon)
  id           String   @id @default(cuid())
  ts           DateTime
  source       String                         // "station" | "satellite" | "meteo" | "device"
  stationId    String?
  parcelId     String?
  soilMoisture Float?                         // %
  airTempC     Float?
  humidity     Float?
  rainMm       Float?
  windMs       Float?
  ndvi         Float?
  ndmi         Float?
  cloudCover   Float?                         // 0–1, uydu için
  spi30        Float?                         // meteoroloji için
  flags        String?                        // JSON: ["supheli_nem_artisi"]
  raw          String?                        // ham paket (denetim için)
}

model Decision {
  id           String   @id @default(cuid())
  code         String   @unique               // "7F3A" → /k/7F3A
  ts           DateTime
  parcelId     String
  policyId     String
  witnessSat   String                         // "EVET" | "HAYIR" | "VERI_YOK"
  witnessStation String
  witnessMeteo String
  yesCount     Int
  outcome      String                         // "ODE" | "GRI_BOLGE" | "ODEME_YOK"
  amountTl     Int?
  evidence     String                         // JSON: tüm ölçümler + eşikler + model skoru
  evidenceHash String                         // sha256(evidence)
  txHash       String?                        // zincir işlem no (mock ise "mock:...")
  blockNumber  Int?
  paymentRef   String?                        // FAST referansının hash'i
  notifiedAt   DateTime?
}

model AuditLog {
  id        String   @id @default(cuid())
  ts        DateTime @default(now())
  actor     String                             // "engine" | "operator" | "device" | "ai"
  action    String
  detail    String
}
```

### 6.2 Tohum verisi (seed)
Üç parsel, tek köy, tek istasyon, 2025–2026 sezonu:

| Parsel | Ürün | Alan | Toprak | Rol |
|---|---|---|---|---|
| **P-1182** "Mehmet Amca" | buğday (kıraç) | 80 dönüm | killi | **Kuraklık senaryosu** — 3/3 EVET |
| **P-1207** | kırmızı mercimek | 45 dönüm | tınlı | **Gri bölge** — 1/3 EVET, eksper |
| **P-1244** | buğday (sulu) | 120 dönüm | tınlı | **Sağlıklı** — 0/3, ödeme yok |

- Günlük veri: 1 Kasım 2025 – 30 Haziran 2026 arası her gün yağış/sıcaklık/nem; 5 günde bir NDVI/NDMI.
- Veri **gerçek olabildiği kadar gerçek** olsun:
  - `scripts/fetch-sentinel.ts` yaz: Copernicus Data Space (veya Google Earth Engine export)
    üzerinden Siverek civarı 3 poligon için 2025 sezonu NDVI/NDMI serisi çeker, `data/ndvi-2025.json`
    dosyasına yazar. **Bu script internet ister, sadece hazırlık aşamasında bir kez çalışır.**
  - Yağış/sıcaklık için ERA5-Land veya CHIRPS'ten aynı şekilde tek seferlik export.
  - Çekemezsen: `scripts/seed.ts` içindeki üreteç, gerçekçi bir kuraklık sezonunu sentetik üretir ve
    veri `"synthetic": true` bayrağıyla işaretlenir; UI'da "örnek veri" rozeti çıkar. **Gerçek diye sunma.**
- "Normal aralık" (geçmiş yılların bandı): aynı kaynaktan 2017–2024 NDVI'nin 10./90. yüzdelikleri;
  yoksa sentetik banttan üretilir ve yine rozetlenir.

---

## 7. API sözleşmeleri

Hepsi `src/app/api/...` altında Route Handler. Girdi doğrulaması **zod** ile. Hata biçimi:
`{ error: { code: string, message: string } }`.

### 7.1 Cihaz girişi (ESP32 → sunucu)
```
POST /api/ingest
Header: X-Device-Id: IST-SVK-01
        X-Signature: hex(hmac_sha256(INGEST_SECRET, body))
Body:   { "ts": 1790000000, "soilMoisture": 12.4, "airTempC": 31.2, "humidity": 22,
          "rainMm": 0, "windMs": 3.1, "batteryV": 4.02, "tamper": false, "seq": 118 }
200:    { "ok": true, "serverTs": ..., "nextIntervalSec": 15 }
```
- İmza tutmazsa 401. `seq` geri giderse "tekrar saldırısı" uyarısı, kayıt `flags`'e düşer.
- Her kabul edilen ölçüm `bus.publish("reading", ...)` ile SSE'ye yayılır.
- Cihaz 20 sn veri göndermezse UI'daki `LiveBadge` griye döner ("cihaz sessiz").

### 7.2 Canlı akış
```
GET /api/stream            → text/event-stream
events: reading | witness | decision | chain | payment | sms | device | scene
```

### 7.3 Simülasyon (zaman makinesi)
```
POST /api/sim/load      { "scenario": "kuraklik-2025" | "manipulasyon" | "gri-bolge" | "saglikli" }
POST /api/sim/play      { "speed": 30 }        // 1 sn = 30 sim-günü, 0 = duraklat
POST /api/sim/seek      { "date": "2026-04-28" }
POST /api/sim/reset
GET  /api/sim/state     → { date, speed, scenario, witnesses, parcelStates[] }
```
Zaman makinesi **sunucu tarafında** tek gerçeğin kaynağıdır; tüm ekranlar SSE'den beslenir
(sahnede 2 ekran/2 cihaz senkron kalsın).

### 7.4 Karar ve kanıt
```
POST /api/decide        { "parcelId": "P-1182", "force": false }   → Decision
GET  /api/decision/:code                                            → kanıt paketi (public)
GET  /api/parcel/:id                                                → seri + poliçe + kararlar
```

### 7.5 Ödeme ve bildirim (taklit)
```
POST /api/payout        { "decisionId": "..." }
   → { "paymentRef": "FAST-SIM-8831", "amountTl": 50000, "simulated": true }
POST /api/sms           { "decisionId": "..." }  → gönderilen metni döner (mock veya gerçek)
```

### 7.6 Zincir
```
POST /api/chain/anchor  { "decisionId": "..." }
   → { "txHash": "0x...", "blockNumber": 1234, "explorerUrl": "https://amoy.polygonscan.com/tx/0x...",
       "mode": "amoy" | "mock" }
GET  /api/chain/status  → { mode, network, contract, lastTx, balance }
```

### 7.7 Asistan
```
POST /api/ask   { "q": "Neden blokzincir?" }
   → { "answer": "...", "sources": [{title,url}], "confidence": "yuksek|orta|dusuk", "mode": "local|api" }
```

### 7.8 Sağlık
```
GET /api/health → { db, device, chain, ai, sms, sim, uptime }  (/durum sayfası bunu gösterir)
```

---

## 8. Karar motoru (`src/engine/decision.ts`) — projenin kalbi

### 8.1 Üç tanık, üç bağımsız değerlendirme
```ts
type Verdict = "EVET" | "HAYIR" | "VERI_YOK";

// TANIK 1 — UYDU (parsel bazlı)
// Girdi: son 30 günün NDVI anomalisi = (ndvi_guncel - ndvi_normal_ortanca) / ndvi_normal_ortanca
// EVET: anomali <= -0.25  VE  fenolojik pencere içinde (bkz. 8.2)  VE  bulutluluk < 0.4
// VERI_YOK: 15 gündür bulut → Sentinel-1 yedeği (yüzey nemi z-skoru <= -1.0 ise EVET)

// TANIK 2 — YER İSTASYONU (köy ölçeği)
// EVET: 30 günlük toplam yağış <= 10 mm  VE  kök bölgesi nemi, ürün+toprak için tanımlı
//       solma eşiğinin altında (killi %18, tınlı %14, kumlu %9 — bkz. 8.3)
// Şüpheli veri (8.4) varsa tanık otomatik VERI_YOK olur.

// TANIK 3 — RESMİ METEOROLOJİ (bölge ölçeği)
// EVET: SPI-30 <= -1.5 (çok kurak)  VEYA  MGM/ERA5 30 günlük yağış, uzun yıllar ortalamasının %40'ının altında
```

### 8.2 Fenoloji penceresi (`src/engine/phenology.ts`)
Kuraklık her dönemde aynı zararı vermez. Kıraç buğday için:
| Dönem | Tarih (yaklaşık) | Ağırlık |
|---|---|---|
| Çıkış–kardeşlenme | 15 Kas – 15 Şub | 0.4 |
| Sapa kalkma | 15 Şub – 31 Mar | 0.8 |
| **Başaklanma–tane dolumu** | **1 Nis – 20 May** | **1.0 (kritik)** |
| Olgunlaşma–hasat | 20 May – 30 Haz | 0.2 (NDVI düşüşü normaldir, tetik kapalı) |
Kırmızı mercimek için pencereyi ~10 gün öne al. Ağırlık, NDVI eşiğini ölçekler:
`esik_efektif = -0.25 / agirlik` (ağırlık düşükse daha sert düşüş gerekir). Hasat penceresinde
uydu tanığı **daima HAYIR** döner — bu, "hasadı kuraklık sanma" hatasına karşı korumadır ve
sahnede özellikle anlatılacak bir ayrıntıdır.

### 8.3 Toprak eşikleri
`solmaNoktasi = { killi: 18, tinli: 14, kumlu: 9 }` (hacimsel %). UI'da bunu göster:
"Aynı %15 nem kumlu toprakta iyi, killi toprakta kuraklıktır."

### 8.4 Anti-manipülasyon (`src/engine/anomaly.ts`)
Yer istasyonu ölçümü şu durumlarda `supheli` işaretlenir ve tanık VERI_YOK olur:
1. Bölgede yağış yokken 1 saatte nem artışı > 8 puan ("biri sensörü suladı").
2. Kurcalama sensörü (`tamper=true`) ya da eğim/konum değişimi.
3. Uydu ve meteoroloji "kurak değil" derken istasyon aşırı kuru okuyor (çapraz tutarsızlık > 3σ).
4. Paket sıra numarası geri gidiyor veya imza tutarsız.
Her işaret `AuditLog`'a yazılır ve kanıt sayfasında görünür.

### 8.5 Karar
```
yes = [sat, station, meteo].filter(v => v === "EVET").length
yes >= 2 → ODE        (amount = sumInsuredTl * payoutRate)
yes == 1 → GRI_BOLGE  (eksper incelemesi kuyruğuna düşer, çiftçiye bilgi SMS'i)
yes == 0 → ODEME_YOK  (itiraz hakkı korunur)
```
Ek emniyetler (kanıt sayfasında ve UI'da göster):
- **Ödeme tavanı:** parsel başına sezonda 1 tetik; köy başına günde en fazla N parsel (devre kesici).
- **Karantina:** aynı parsel 7 gün içinde ikinci kez tetiklenemez.
- **Soğuma:** karar üretildikten sonra 60 sn "itiraz penceresi" (sahnede 5 sn'ye indirilebilir),
  operatör panelinden durdurulabilir. Bu, "otomatik ama kontrolsüz değil" mesajının görsel kanıtı.

### 8.6 Fiyatlama (`src/engine/pricing.ts`, /ticari sayfasındaki hesaplayıcı)
```
beklenenHasar = tetikOlasiligi * (sumInsured * payoutRate)
brutPrim      = beklenenHasar * (1 + giderVeGuvenlikPayi)      // varsayılan 0.25
ciftciOdemesi = brutPrim * (1 - subsidyRate)                   // varsayılan 0.70 destek
```
`tetikOlasiligi` geçmiş seriden backtest ile gelir (kaç sezonda tetiklenirdi / toplam sezon).
Hesaplayıcı kaydırıcıları: sigorta bedeli, ödeme oranı, tetik olasılığı, destek oranı, gider payı.
Çıktıda **"Bu bir varsayım hesabıdır"** notu sabit görünür.

### 8.7 Birim testleri (Vitest, zorunlu)
- Hasat penceresinde NDVI çökse bile uydu tanığı HAYIR döner.
- Killi toprakta %15 nem EVET, kumlu toprakta HAYIR üretir.
- Yağışsız ani nem artışı istasyonu VERI_YOK yapar ve 3/3 senaryosunu 2/3'e düşürür.
- 1 EVET → GRI_BOLGE; 0 EVET → ODEME_YOK.
- Aynı sezonda ikinci tetik reddedilir.
- `evidenceHash`, aynı kanıt için deterministik; kanıtın tek bir alanı değişince hash değişir.

---

## 9. Blokzincir katmanı

### 9.1 Sözleşme (`contracts/AgriShieldPolicy.sol`, Solidity ^0.8.24, sade tut)
```solidity
struct Witnesses { bool sat; bool station; bool meteo; bool satSet; bool stationSet; bool meteoSet; }

event DecisionAnchored(bytes32 indexed decisionId, string parcelPseudoId, uint8 yesCount,
                       uint8 outcome, uint256 amountTl, bytes32 evidenceHash, uint256 ts);
event PaymentReferenced(bytes32 indexed decisionId, bytes32 paymentRefHash, uint256 ts);
event CircuitBreakerTripped(string reason, uint256 ts);

function submitWitness(bytes32 decisionId, uint8 witnessIndex, bool verdict, bytes32 dataHash) external onlyOracle;
function finalize(bytes32 decisionId, bytes32 evidenceHash) external onlyOracle returns (uint8 outcome);
function referencePayment(bytes32 decisionId, bytes32 paymentRefHash) external onlyPayer;
```
Kurallar: kişisel veri yok (sadece takma ad + hash), `onlyOracle` rol bazlı, `pause()` devre
kesici, parsel/gün ödeme tavanı sözleşmede sabit. Kodu yorum satırlarıyla **jüriye okunacak
kadar sade** yaz; `/urun` sayfasında bu kodun 12 satırlık özeti gösterilecek.

### 9.2 İki mod
- `CHAIN_MODE=amoy`: ethers v6 ile Amoy testnet'e yazar, `explorerUrl` döner, UI'da QR ile açılır.
- `CHAIN_MODE=mock`: aynı arayüz, yerel "zincir" (sha256 zinciri, blok no artan, 1,5 sn gecikme
  taklidi). UI'da `SİMÜLASYON` rozeti + "gerçek testnet için CHAIN_MODE=amoy" notu.
Sahne planı: **internet varsa amoy, yoksa mock.** `/durum` hangisinin aktif olduğunu gösterir.

### 9.3 Kanıt paketi (evidence)
```json
{ "decisionCode":"7F3A","parcel":"P-1182","policy":"2025-2026","ts":"2026-04-28T09:12:03Z",
  "witnesses":{
    "satellite":{"verdict":"EVET","ndvi":0.38,"normalMedian":0.59,"anomaly":-0.356,"cloud":0.05,"source":"Sentinel-2 / Copernicus"},
    "station":{"verdict":"EVET","rain30mm":6.0,"soilMoisture":12.4,"threshold":18,"stationId":"IST-SVK-01","flags":[]},
    "meteo":{"verdict":"EVET","spi30":-1.82,"source":"ERA5-Land / MGM"}},
  "rules":{"window":"basaklanma","weight":1.0,"ndviThreshold":-0.25,"soilThreshold":18,"spiThreshold":-1.5},
  "model":{"riskScore":0.86,"topFactors":[["30 günlük yağış",0.41],["NDVI anomalisi",0.29],["toprak nemi",0.16]]},
  "decision":{"yesCount":3,"outcome":"ODE","amountTl":50000},
  "chain":{"mode":"amoy","txHash":"0x...","blockNumber":123456},
  "payment":{"refHash":"0x...","channel":"FAST","simulated":true}}
```
`evidenceHash = sha256(JSON.stringify(evidence-without-chain-and-payment))`.

---

## 10. Ödeme, bildirim ve kanıt sayfası

- **Ödeme (taklit):** `/api/payout` bir `FAST-SIM-xxxx` referansı üretir, 1,2 sn gecikmeyle
  "başarılı" döner, referansın hash'i zincire `referencePayment` ile yazılır. UI'da banka
  ekranı taklidi **yok** (gerçek banka arayüzü taklidi etik değil); onun yerine sade bir
  "Ödeme talimatı" kartı: tutar, IBAN maskesi (TR** **** **** 4417), kanal FAST, referans, süre.
- **SMS:** `PhoneMock` bileşeninde canlanır. Metin:
  `"AgriShield: Tarlanızda (P-1182) kuraklık tespit edildi. 50.000 TL hesabınıza gönderildi.
   Kanıt: agrishield.app/k/7F3A"` — `SMS_MODE=mock` ise sadece ekranda; gerçek gönderim
  opsiyonel ve yalnız takımın kendi numarasına.
- **/k/[kod] kanıt sayfası (QR hedefi, mobil öncelikli):**
  1. Üstte karar rozeti + tarih + parsel takma adı (kişisel veri yok).
  2. Üç tanık kartı: ölçülen değer, eşik, sonuç; her birinin veri kaynağı.
  3. Kural kartı: hangi fenolojik pencere, hangi eşik, neden.
  4. Model kartı: risk skoru + en etkili 3 faktör (SHAP mantığı, sade çubuklarla).
  5. Zincir kartı: işlem no, blok, explorer linki (veya mock rozeti), `evidenceHash`.
  6. Ödeme kartı: tutar, kanal, referans hash, `SİMÜLASYON` rozeti.
  7. "Bu kaydın doğruluğunu nasıl kontrol ederim?" açılır bölümü: hash'i kendin hesapla adımları.
  8. En altta: "Kişisel veri içermez (KVKK)" notu.

---

## 11. AgriShield Asistanı (yapay zekâ)

**Amaç:** Jüri ya da ziyaretçi "neden blokzincir?", "basis risk nedir?", "prim ne kadar?" diye
sorduğunda, projeye sadık, kaynak gösteren, kısa cevaplar. Sahnede takımın yerine konuşmaz;
soru-cevap sonrası stantta ve QR üzerinden çalışır.

### 11.1 İki mod
- `AI_MODE=local` (**varsayılan, internetsiz**): `data/knowledge.json` üzerinde gömme yerine
  basit ama isabetli bir arama: Türkçe normalizasyon (küçük harf, aksan/ı-i düzeltme), kelime
  kökü kırpma, BM25 benzeri skorlama + eş anlamlı sözlüğü ("eksper→hasar tespit",
  "uydu→sentinel, ndvi", "zincir→blokzincir, polygon"). En iyi eşleşen kayıt döner.
- `AI_MODE=api`: Anthropic API. Sistem promptu: *"Sen AgriShield ekibinin asistanısın. SADECE
  sana verilen bilgi tabanındaki bilgilerle cevap ver. Bilmiyorsan 'Bu konuda doğrulanmış
  bilgimiz yok' de. En fazla 4 cümle. Sonunda kullandığın kaynakları listele. Rakam uydurma."*
  Bilgi tabanı her istekte bağlam olarak gönderilir (küçük, ~30–40 KB).

### 11.2 Bilgi tabanı (`data/knowledge.json`)
Şu kayıtlardan oluşur (hepsi rehberdeki doğrulanmış içerikten):
1. **32 jüri sorusu ve cevabı** (Bölüm 6, takım rehberi) — `{q, a, owner, tags}`.
2. **Doğrulanmış rakamlar** (Bölüm 14 facts) — `{claim, value, source, url}`.
3. **Kavram sözlüğü** (NDVI, basis risk, SPI, oracle, multi-sig…) — `{term, oneLiner, analogy}`.
4. **Karar kuralları** — eşikler, fenoloji tablosu (motorla aynı kaynaktan üretilir, kopya değil).

### 11.3 Arayüz kuralları
- Cevap kartı: cevap + "Kaynak" rozetleri + `mode` rozeti (yerel bilgi tabanı / API).
- Hazır soru çipleri: "Neden blokzincir?", "Basis risk nedir?", "TARSİM'in yaptığından farkı ne?",
  "Prim ne kadar?", "Sensörü sularsam?" (ilk ikisi sahnede sık gelen sorular).
- **Güvenlik:** kullanıcı metni asla `dangerouslySetInnerHTML` ile basılmaz; prompt enjeksiyonuna
  karşı bilgi tabanı dışına çıkma yasağı sistem promptunda + cevaba "kaynak yoksa yayınlama" filtresi.
- Bilinmeyen soru: *"Bu konuda doğrulanmış bilgimiz yok. Takıma sorun: pilot aşamasında ölçeceğimiz
  şeylerden biri olabilir."* (Rehberdeki dürüstlük kuralıyla aynı.)

---

## 12. 3D SAHA SİMÜLATÖRÜ — tam spesifikasyon

> Sitenin en çok iş yapan parçası. Amaç: jüri, kuraklığın nasıl **ölçüldüğünü** ve donanımın ne
> yaptığını *görsün*. Tek bir sahnede: tarla, istasyon, uydu, gateway, veri akışı, karar ve ödeme.
> Fotogerçekçilik hedefi **yok**; "anlaşılır, temiz, ölçüm aleti gibi" bir görsel dil hedefi var.
> **Hiçbir dış 3D model dosyası indirme** — tüm geometri kod içinde primitiflerden kurulacak
> (kutu, silindir, koni, düzlem, extrude edilmiş şekil). Böylece repo hafif, internetsiz çalışır.

### 12.1 Sahne yerleşimi (dünya koordinatları, 1 birim = 1 metre)
```
            ▲ +Z (kuzey)
  köy/gateway (-60, 0, -40)          uydu yörüngesi: r=220, eğimli elips, 
        ┌─────────────────────────┐   sahnenin üstünden geçer
        │  P-1244  │   P-1207     │
        │──────────┼──────────────│   parseller: 60×40 m'lik extrude poligonlar,
        │      P-1182 (odak)      │   aralarında 3 m tarla yolu
        └─────────────────────────┘
   istasyon (0, 0, 28) — P-1182'nin kuzey kenarında, tarafsız noktada
   kamera başlangıç: (46, 26, 52) → hedef (0, 2, 0)
```
Zemin: 400×400 m düzlem, hafif tümsekli (yükseklik gürültüsü ±0.6 m). Ufukta düşük tepeler
(3 adet, alçak poligonlu). Gökyüzü: `drei/Sky` yerine **kendi gradient shader'ın** (offline,
hafif): üstte `#0E1A14`→ ufuk `#2A3C31`, koyu temada gece; sabah/öğle/akşam için 3 hazır palet.

### 12.2 Zaman ve ışık
- Sahne, simülasyon tarihine ve saatine bağlıdır (`/api/sim/state`).
- Güneş: azimut/yükseklik basit formülle (Şanlıurfa ~37.2°K) hesaplanır; `directionalLight`
  buna göre döner, gölge haritası 1024 (sadece istasyon ve köy gölge alır, tarla almaz — performans).
- Gece geçişi: ışık soğur, istasyon LED'i belirginleşir, uydu izi parlar. Zaman 30 gün/sn akarken
  gündüz-gece döngüsü **yumuşatılır** (stroboskop etkisi yapma: 1 sn'de en fazla 1 gün-gece geçişi
  görünsün, üstü lineer harmanlansın).

### 12.3 Tarla ve bitki örtüsü
- Her parsel `THREE.Shape` → `ExtrudeGeometry` ile 0.15 m kalınlıkta plaka; üst yüzeyine
  **NDVI'ye bağlı renk**: `lerp(#8A5D06 → #2F9E6B)`; ek olarak ince şerit dokusu (ekim sıraları)
  bir `ShaderMaterial` ile çizilir (çizgi aralığı 0.7 m).
- **Buğday:** `InstancedMesh`, parsel başına **2.000–3.000** sap (toplam ≤ 9.000). Sap = 3 düzlemli
  "cross-billboard" değil, 4 segmentli ince koni (alçak poligonlu, ~24 üçgen). Yükseklik ve renk
  NDVI'ye bağlı: NDVI 0.6 → 0.8 m yeşil; NDVI 0.3 → 0.45 m sarı-kahve; başak ucu ayrı renk.
- **Rüzgâr:** vertex shader'da `sin(time*hız + instanceOffset)` ile eğilme; rüzgâr hızı gerçek
  veriden (`windMs`) gelir. Rüzgâr yoksa salınım durur — bu, "veri gerçekten sahneyi sürüyor"
  mesajının kanıtıdır, sahnede söylenecek.
- **Kuraklık ilerlemesi:** zaman aktıkça NDVI serisi okunur; renk ve boy yumuşak geçişle değişir
  (her karede değil, 250 ms'de bir hedef değere `damp`). Toprakta **çatlak dokusu** opaklığı
  `1 - soilMoisture/25` ile artar (shader'da procedural Voronoi çizgileri; doku dosyası yok).

### 12.4 Yer istasyonu (donanım ikizi — parça parça)
Her parça ayrı `group` ve **hotspot** taşır (tıklanınca kart açılır, metinler Bölüm 12.9):

| # | Parça | Geometri | Animasyon / veri bağı |
|---|-------|----------|------------------------|
| H1 | **Direk** | silindir r=0.05, h=3.0, alüminyum gri | — |
| H2 | **Güneş paneli** | kutu 0.6×0.4×0.03, 25° eğimli, koyu mavi, hafif fresnel | Güneş açısına göre parlama; gece söner. Şarj akışı: panelden kutuya doğru minik parıltı |
| H3 | **LoRa anteni** | ince silindir + uç küre | Veri gönderirken ucundan **3 halka dalga** (genişleyip sönen `RingGeometry`) çıkar, gateway'e doğru paket uçar |
| H4 | **Yağış ölçer** | huni (koni, kesik) + iç tahterevalli (iki küçük kutu, pivot) | Yağış olayında kova **devrilir** (0.25 sn), sayaç +0.2 mm; yağış yoksa kıpırdamaz |
| H5 | **Anemometre** | 3 kol + 3 yarım küre fincan | Dönme hızı = `windMs * 0.9 rad/s`; durgun havada durur |
| H6 | **Radyasyon kalkanı** | üst üste 6 kesik koni (beyaz) | Sıcaklık yükseldikçe yanındaki etiket kırmızıya kayar |
| H7 | **Elektronik kutu (IP65)** | kutu 0.22×0.16×0.09, kapak çizgisi | İçinde 2 küçük kart (yeşil = ESP32, sarı = batarya). **Kapak açılır** (exploded modda) |
| H8 | **Durum LED'i** | küre r=0.012, emissive | Her ölçümde 1 kez yeşil yanıp söner; iletişim yoksa kırmızı nefes alır; kurcalama algılanırsa turuncu hızlı yanıp söner |
| H9 | **Toprak nem probları** | 3 çubuk, 10/30/60 cm derinlikte | Kesit modunda görünür; her birinin yanında anlık % değeri |
| H10 | **Batarya + kablolar** | kutu + eğri çizgiler (`TubeGeometry`) | Batarya doluluk çubuğu `batteryV`'den |

**Kesit (cutaway) modu:** `clippingPlanes` ile zeminin bir dilimi kaldırılır; altında **toprak
profili** görünür: 0–10 cm, 10–30 cm, 30–60 cm katmanları, her biri nem değerine göre renklenir
(koyu kahve ıslak → açık bej kuru). Kök sistemi basit çizgi geometrisiyle çizilir; kuraklıkta
kökler kısalır. Bu görünüm, "uydu yüzeyi görür, kökü göremez" cümlesinin görsel karşılığıdır.

**Patlatılmış (exploded) görünüm:** 0–1 arası kaydırıcı; tüm parçalar kendi normalleri yönünde
0.6 m'ye kadar ayrılır, aralarına ince ölçü çizgileri ve parça adları gelir (teknik çizim hissi).

### 12.5 Köy, gateway ve kapsama
- Köy: 8–12 basit ev (kutu + prizma çatı), bir kooperatif binası (biraz büyük, üstünde anten).
- **Gateway:** binanın çatısında kutu + çubuk anten; menzili **yarı saydam kubbe** (r=8 km ölçekli
  değil; sahnede 140 m yarıçaplı sembolik kubbe, üzerinde "LoRa kapsama ~10 km" etiketi).
- İstasyondan gateway'e paket: `CatmullRomCurve3` üzerinde hareket eden parlak küre + iz;
  gateway'den yukarı "buluta" doğru dikey ışık huzmesi.

### 12.6 Uydular
- **Sentinel-2 (optik):** eğimli elips yörüngede dolanır; parselin üzerinden geçerken aşağı doğru
  **tarama konisi** açılır (mavi, yarı saydam), koni tarlanın üstünden süpürülür ve geçtiği yerde
  NDVI renk katmanı "yenilenir" (bir dalga gibi). Demo zamanında her ~5 günde bir geçiş.
- **Bulut:** hafif bulut katmanı (2–3 düzlem, procedural gürültü, yavaş kayan). Bulut parselin
  üstündeyken Sentinel-2 geçişi **gri** olur ve UI'da "bulutlu geçiş: veri yok" çıkar.
- **Sentinel-1 (radar):** bulut senaryosunda devreye girer; farklı renk (mor-mavi), konisi
  bulutun **içinden geçer** (bulut düzleminde `depthWrite:false` hilesiyle görünür kalır).
  Etiket: "Radar bulutu deler; ama sadece yüzey nemini görür."
- Uydu modelleri: gövde kutu + 2 panel + küçük anten (toplam < 400 üçgen).

### 12.7 Veri akışı ve karar görselleştirmesi (sahnenin finali)
Kamera preset 5'te sahne hafifçe "şemaya" dönüşür: zemin soluklaşır, üstte akış katmanı belirir.
```
İSTASYON ──LoRa──▶ GATEWAY ──internet──▶ BULUT/API ──▶ YAPAY ZEKÂ (mor küre, içinde dönen düğümler)
UYDU ─────tarama───────────────────────▶ BULUT/API        │
METEOROLOJİ (bulut ikonu, mavi) ───────▶ BULUT/API        ▼
                                          ÜÇ TANIK ÇİPİ → OYLAMA HALKASI (2/3 dolunca yeşile döner)
                                                   │
                                          AKILLI SÖZLEŞME (küp yığını = bloklar; yeni blok yerine oturur)
                                                   │
                                          BANKA/FAST (sarı) ──▶ ÇİFTÇİ TELEFONU (SMS baloncuğu)
```
- Her ok üzerinde küçük paketler akar; gecikme rozetleri gerçek ölçülen sürelerden gelir
  (örn. "sensör→zincir: 3,4 sn").
- Oylama halkası: 3 dilimli halka; her tanık kararını verdikçe dilim yeşil/kırmızı dolar.
  2. yeşil dilim tamamlandığında halka kapanır, merkezde `ÖDE` rozeti belirir, kamera hafif zoom.
- Blok küpü yerine oturduğunda `txHash` metni belirir; tıklanınca explorer QR'ı açılır.

### 12.8 Etkileşim ve kamera
- `OrbitControls`: `minPolarAngle=0.15π`, `maxPolarAngle=0.48π` (yer altına girilemez),
  `minDistance=6`, `maxDistance=160`, `enableDamping`. Sahne modunda **otomatik yavaş dönüş**
  (0.02 rad/s) boşta 8 sn sonra başlar, herhangi bir etkileşimde durur.
- **Kamera presetleri (1–6 tuşları ve ekrandaki şerit):**
  1. Tüm saha (kuş bakışı 45°) · 2. İstasyon yakın plan · 3. Toprak kesiti (yer altı)
  4. Uydu görüşü (yukarıdan, NDVI haritası) · 5. Veri akışı şeması · 6. Köy + gateway
  Geçişler `damp3` ile 900 ms, hedef ve konum birlikte yumuşatılır. Asla ani kesme yok.
- **Hotspot'lar:** `drei/Html` ile 2B etiket noktaları (+ işareti). Hover'da parça `Outlines`
  ile vurgulanır ve adı belirir; tıklanınca sağdan **parça kartı** açılır:
  *Nedir / Neye benzer / Bizde ne işe yarar / Jüri sorarsa* (metinler 12.9'da).
- **Katman anahtarları (sağ üst):** Etiketler · Kesit · Patlatılmış görünüm · Veri akışı ·
  Bulut · Rüzgâr · Gece. Her biri klavyeden de (L, X, E, F, C, W, N).
- **Donanım bağlıysa** (`device` olayı geldiyse): istasyonun tepesinde `CANLI` rozeti; jüri
  sensörü kuru toprağa koyduğunda **2 sn içinde** toprak profili renk değiştirir, H9 etiketleri
  düşer, H8 LED'i yanar, sağ panelde "Yer tanığı: EVET" çipi yanar. Bu, sunumun en kritik anı —
  gecikmeyi ölç ve ekranda göster.

### 12.9 Hotspot kartı metinleri (bunları birebir kullan)
```
H2 GÜNEŞ PANELİ
Nedir: 5–10 W'lık panel, gündüz bataryayı doldurur.
Benzetme: Bahçe lambası gibi; prizsiz tarlada kendi enerjisini üretir.
Bizde: İstasyon yıllarca kimse dokunmadan çalışmalı. Batarya voltajı da veriyle gönderilir.
Jüri sorarsa: "Cihaz zamanının çoğunu derin uykuda geçirir; güneş paneliyle sezonlarca bakımsız çalışır."

H3 LORA ANTENİ
Nedir: Küçük veri paketlerini kilometrelerce uzağa çok az enerjiyle taşıyan telsiz.
Benzetme: Köy meydanındaki hoparlör — uzağa ulaşır ama kısa anons içindir.
Bizde: Bir ölçüm paketimiz 20–50 bayt; kırsalda GSM olmasa da köy gateway'ine ulaşır.
Jüri sorarsa: "Neden GSM değil? Pil, abonelik ve kapsama. Kapsama iyiyse NB-IoT de takılabilir."

H4 YAĞIŞ ÖLÇER
Nedir: Huninin altında devrilen iki kova; her 0,2 mm'de bir devrilir ve sinyal verir.
Benzetme: Su doldukça devrilen bir tahterevalli ve onu sayan sayaç.
Bizde: "30 günde 10 mm'den az yağış" koşulunun ölçümü. Tanık 2'nin en güçlü kanıtı.
Jüri sorarsa: "Tıkanırsa? Uydu yağış verisi ve en yakın MGM istasyonuyla çapraz kontrol; sapma varsa arıza alarmı."

H5 ANEMOMETRE
Nedir: Rüzgârda dönen üç fincan; dönme hızı rüzgâr hızını verir.
Benzetme: Rüzgârın kilometre saati.
Bizde: Sıcak-kuru rüzgâr zararı ve buharlaşma hesabı; fırtına teminatında kanıt.
Jüri sorarsa: "Kuraklık ürünü için zorunlu değil; temel istasyonda opsiyonel."

H6 RADYASYON KALKANI
Nedir: Üst üste dizilmiş beyaz tabaklar; sensörü güneşten korur.
Benzetme: Sensöre şapka takmak.
Bizde: Kalkansız sensör havanın değil kendi gövdesinin ısısını ölçer, sıcaklığı yüksek gösterir.
Jüri sorarsa: "Sahada DHT22 yerine SHT31/SHT40 sınıfı sensör, kalkan içinde kullanılır."

H7 ELEKTRONİK KUTU
Nedir: IP65 kutu; içinde mikrodenetleyici (ESP32/STM32), LoRa modülü ve batarya.
Benzetme: İstasyonun beyni ve kalbi aynı kutuda.
Bizde: Sensörleri okur, paketler, gönderir, uyur. Yağışsız ani nem artışını "şüpheli" işaretler.
Jüri sorarsa: "Kutu kilitli ve kurcalama sensörlü; açılırsa merkez anında haber alır."

H9 TOPRAK NEM PROBLARI
Nedir: 10, 30 ve 60 cm derinlikte kapasitif problar.
Benzetme: Parmağını toprağa sokup ıslak mı kuru mu diye bakmak — ama 15 dakikada bir ve sayıyla.
Bizde: Bitkinin kök bölgesindeki suyu ölçer. Uydu bunu göremez; radar sadece yüzeyi görür.
Jüri sorarsa: "Eşik toprağa göre değişir: killi toprakta %18, kumlu toprakta %9 solma noktasıdır."

UYDU (SENTINEL-2)
Nedir: Copernicus'un optik uydusu; 10 m çözünürlük, ~5 günde bir geçiş, veri ücretsiz.
Benzetme: Her 5 günde bir tarlanın fotoğrafını çeken bedava fotoğrafçı.
Bizde: Her parselin NDVI ve NDMI değeri; ölçeklenebilirliğin sırrı bu.
Jüri sorarsa: "5 dekarlık parsel ~50 piksel eder; çok küçük parsellerde köy istasyonu ağırlık kazanır."

UYDU (SENTINEL-1 RADAR)
Nedir: Kendi sinyalini gönderip yankısını ölçen radar uydusu; bulut ve gece onu etkilemez.
Benzetme: Yarasa gibi — ışığa değil yankıya bakar.
Bizde: Bulutlu dönemde yedek göz; yüzey nemi ve bitki yapısı.
Jüri sorarsa: "Radar renk görmez, NDVI veremez. Sadece yüzeyin ilk birkaç santimini görür."

GATEWAY
Nedir: LoRa mesajlarını toplayıp internete aktaran kutu.
Benzetme: Köyün postanesi.
Bizde: Kooperatif çatısında tek gateway, çevredeki köylerin istasyonlarını dinler.
Jüri sorarsa: "Maliyeti tüm bölge paylaşır; parsel başına düşen donanım maliyeti ~8 dolara iner."
```

### 12.10 Performans bütçesi ve yedekler (pazarlık yok)
- Hedef: **60 fps @ 1920×1080**, orta seviye dizüstü (entegre GPU) üzerinde.
- Toplam ≤ **150k üçgen**, çizim çağrısı ≤ 120, doku yok (procedural), `dpr=[1, 1.5]`.
- Post-processing yok (bloom dahil). Gölge sadece 1 ışık, 1024 harita, yumuşak filtre kapalı.
- Ağır sahneler (`InstancedMesh` buğday) `useMemo` ile bir kez kurulur; her karede sadece uniform
  güncellenir. `useFrame` içinde nesne yaratma yasak.
- `Suspense` + `lazy` ile 3D bölümü ayrı chunk; ana sayfa 3D olmadan da tam çalışır.
- **WebGL yoksa / fps 30'un altına düşerse:** otomatik "2B Saha Görünümü"ne geçilir (SVG şema +
  aynı hotspot kartları + aynı veri). Kullanıcıya küçük bir bilgi çubuğu gösterilir.
- Ekran kaydı için `?record=1` parametresi: otomatik tur (12 sn) + arayüzü gizle.

### 12.11 Geliştirme sırası (3D için)
1. Boş sahne + zemin + kamera + kontroller + preset sistemi.
2. Parseller + NDVI renklendirme (sabit veriyle).
3. İstasyon geometrisi (H1–H10) + hotspot'lar + kartlar.
4. Zaman bağı: `/api/sim/state` → NDVI/nem/rüzgâr → renk, boy, dönüş, LED.
5. Buğday instancing + rüzgâr shader'ı.
6. Uydu + tarama konisi + bulut + Sentinel-1 yedeği.
7. Gateway + paket animasyonu + kapsama kubbesi.
8. Veri akışı katmanı + oylama halkası + blok yığını.
9. Kesit ve patlatılmış görünüm.
10. Performans geçişi + 2B yedek + kayıt modu.

---

## 13. Canlı demo akışı ve sunum modu

### 13.1 Sahne listesi (`src/content/scenes.ts`) ve kısayollar
| Tuş | Sahne | Ekranda ne var | Söylenen cümle (sunum notu) |
|-----|-------|----------------|------------------------------|
| `1` | **Mehmet Amca** | Tek ekran hikâye: harita + parsel + takvim | "Siverek'te 80 dönüm kıraç buğday. Kuraklık Nisan'da, para Eylül'de." |
| `2` | **Bugün nasıl ödeniyor** | İki zaman çizelgesi yan yana (köy ortalaması vs AgriShield) | "Köy ortalaması iyiyse hiç ödenmiyor." |
| `3` | **Üç tanık** | Üç kart + 2/3 kuralı animasyonu | "Uydu, yer istasyonu, resmi meteoroloji. İkisi yeterli." |
| `4` | **3D saha** | Simülatör, preset 1 → 2 | "Bu, kurduğumuz istasyonun dijital ikizi." |
| `5` | **Jüri testi (canlı donanım)** | 3D preset 3 (toprak kesiti) + canlı nem grafiği | "Sayın jüri, sensörü kuru toprağa koyar mısınız?" |
| `6` | **Zaman makinesi** | NDVI grafiği + tarih akışı (2026 Mart→Mayıs, 30 gün/sn) | "Bu gerçek uydu verisi. Nisan sonunda normalin %35 altına iniyor." |
| `7` | **Karar** | Oylama halkası → ÖDE + zincir bloğu + txHash | "Üç tanıktan üçü evet. Sözleşme kaydı attı." |
| `8` | **Ödeme** | Ödeme talimatı kartı + telefon SMS + kanıt QR | "Para FAST ile IBAN'a. Kripto yok; mevzuata uygun." |
| `9` | **Manipülasyon testi** | Sensör ıslatılır → şüpheli bayrak → 1/3 → GRİ BÖLGE | "Çiftçi sensörü sularsa sistem ödemez, eksper devreye girer." |
| `0` | **Ticari** | Gelir modeli + prim hesaplayıcı + SOM | "Çiftçiden değil, sigortacıdan parsel başı ücret." |
| `R` | Sıfırla | Tüm senaryo başa | — |
| `B` | Karart | Siyah ekran (jüriyle konuşurken) | — |
| `P` | Sunum modu aç/kapa | Dev tipografi + scroll kilidi + sahne şeridi | — |
| `←/→` | Sahne değiştir | | |
| `Space` | Zaman makinesi oynat/duraklat | | |

### 13.2 Sunum modu davranışı
- `P` ile: tam ekran, koyu tema zorunlu, üstte ince ilerleme şeridi (sahne 5/10), sağ altta
  **15:00 geri sayım** (bölüm hedef süreleri renkli; 30 sn kalınca sarı, aşınca kırmızı).
- Fare imleci 3 sn hareketsizse gizlenir. Bildirim/uyarı kutusu çıkmaz.
- `/sunucu` ikinci ekran: sıradaki sahne, konuşma notu, süre, "şimdi ne diyeceğim" satırı,
  ve **acil düğmeler**: senaryoyu ileri sar, donanımı simülasyona çevir, sahneyi yeniden yükle.
- Tüm ekranlar SSE ile senkron: `/sunucu`'daki tuş `/`'daki sahneyi de değiştirir.

### 13.3 Kiosk/stant modu
`/?kiosk=1`: 90 saniyelik döngü — 3D tur (25 sn) → zaman makinesi hızlandırılmış kuraklık (25 sn)
→ karar + ödeme (20 sn) → QR ve "Asistana sor" çağrısı (20 sn). Herhangi bir tıklamada döngü durur.

### 13.4 Dayanıklılık (sahnede hiçbir şey patlamasın)
- Uygulama açılışında `preflight` çalışır: veritabanı, tohum verisi, cihaz, zincir, AI modları
  kontrol edilir; eksik olan **otomatik taklit moda** düşer ve `/durum` sayfasında sarı görünür.
- Cihazdan 20 sn veri gelmezse UI "simüle cihaz" moduna geçer; sahnede kimse fark etmez, rozet değişir.
- Her sahne kendi verisini bağımsız yükler; biri hata verirse diğerleri çalışmaya devam eder
  (error boundary + "bu bölüm şu an gösterilemiyor" kartı).
- `npm run dry-run`: tüm sahneleri başsız (headless) koşturur, her adımın süresini ve hatasını
  raporlar. **Sunumdan önce zorunlu.**

---

## 14. İçerik: metinler, rakamlar, kaynaklar

`src/content/facts.ts` — tek gerçek kaynağı. Her kayıt: `{ id, label, value, unit, source, url, asOf }`.
UI'da her rakam `<Stat factId="..."/>` ile basılır; kaynak rozeti otomatik gelir.

```ts
export const FACTS = {
  tarsimBitkiselPrim2024:   { value: 15.02, unit: "milyar ₺", label: "Bitkisel ürün primi (2024)",
      source: "TARSİM 2024 Faaliyet Raporu", url: "https://www.tarsim.gov.tr/staticweb/krm-web/dergi/faaliyet-raporlari/2024.pdf" },
  tarsimToplamPrim2024:     { value: 27.23, unit: "milyar ₺", label: "Toplam prim (2024)", source: "TARSİM 2024 Faaliyet Raporu", url: "…" },
  tarsimBitkiselPolice2024: { value: 2697381, unit: "poliçe", label: "Bitkisel ürün poliçesi (2024)", source: "TARSİM 2024", url: "…" },
  tarsimTazminat2024:       { value: 6.64, unit: "milyar ₺", label: "Bitkisel tazminat (2024, +%30,9)", source: "TARSİM 2024", url: "…" },
  hasarIhbari2024:          { value: 471000, unit: "ihbar", label: "Hasar ihbarı (2024)", source: "TARSİM 2024", url: "…" },
  doluPayi2024:             { value: 54.6, unit: "%", label: "Bitkisel hasarların dolu payı (2024)", source: "TARSİM 2024", url: "…" },
  sigortaliUretici2024:     { value: 866000, unit: "üretici/işletme", label: "Sigortalı üretici (2024)", source: "TARSİM 2024", url: "…" },
  sigortaliAlan2024:        { value: 35.6, unit: "milyon dekar", label: "Sigortalı alan (2024)", source: "TARSİM 2024", url: "…" },
  ciftciSayisiCKS:          { value: 2.25, unit: "milyon", label: "ÇKS'ye kayıtlı çiftçi", source: "Tarım ve Orman Bakanı açıklaması (Milliyet)", url: "…" },
  koyBazliOdemeSuresi:      { value: 30, unit: "gün", label: "Köy verimi açıklandıktan sonra ödeme", source: "TARSİM – Köy Bazlı Verim Sigortası", url: "https://www.tarsim.gov.tr/subPage/koy-bazli-verim-sigortasi" },
  koyBazliDestek:           { value: 70, unit: "%", label: "Köy bazlı üründe devlet prim desteği", source: "TARSİM / 2026 Havuz Kararı", url: "…" },
  tekirdagPilotKatilim:     { value: 80, unit: "%+", label: "Tekirdağ parsel bazlı pilotta sigortalılık (2026)", source: "Sabah, 24.08.2026", url: "…" },
  parametrikPazar2031:      { value: 29.3, unit: "milyar $", label: "Global parametrik sigorta pazarı (2031 tahmini)", source: "Allied Market Research", url: "…" },
  dijitalTLUcuncuAsama:     { value: 23, unit: "proje", label: "Dijital TL 3. aşamadaki proje sayısı (Ağu 2026)", source: "TCMB duyurusu / Alomaliye", url: "…" },
  sanliurfaKayip2025:       { value: 100, unit: "%'e varan", label: "Şanlıurfa kuru tarımda kayıp (Mayıs 2025)", source: "TZOB açıklaması / yerel basın", url: "…" },
  sentinel2Cozunurluk:      { value: 10, unit: "m", label: "Sentinel-2 çözünürlük", source: "Copernicus", url: "https://dataspace.copernicus.eu/" },
  sentinel2Gecis:           { value: 5, unit: "gün", label: "Sentinel-2 geçiş sıklığı", source: "Copernicus", url: "…" },
} as const;
```
**Yasaklı rakamlar** (eski sunumdan gelen, doğrulanamayan): "%340 artış", "%28 sigortalılık",
"₺12,8 milyar prim", "3 milyon çiftçi", "15–30 gün eksper süresi", "Polygon 7.000 TPS",
"<$50 sensör paketi", "2026'da $29,3 milyar". Kod tabanında bunlar **geçmeyecek**; `npm run lint:facts`
adında küçük bir script yaz: bu ifadeleri repoda arar, bulursa hata verir.

### 14.1 Bölüm metinleri (birebir kullan)

**Hero (ana ekran):**
- Üst etiket: `TEKNOFEST 2026 · Finansal Teknolojiler · AlgoVest`
- Başlık: **"Kuraklık Nisan'da olur. Para da Nisan'da gelmeli."**
- Alt başlık: "AgriShield, tarlayı uzaydan ve yerden izler; kuraklık gerçekten yaşandığında
  kimse başvurmadan, kanıtıyla birlikte çiftçinin hesabına parayı yatırır."
- Butonlar: `Canlı demoyu başlat` · `3D sahayı gez` · `Kanıt sayfası örneği`
- Altta üç canlı sayaç: aktif parsel · son karar · sistem durumu.

**Problem:** "Türkiye'de kuraklık sigortası bugün **köy ortalamasına** göre ve **hasattan sonra**
ödüyor. Tarlası kuruyan çiftçi ya çok geç alıyor ya da köy ortalaması iyi diye hiç alamıyor."
+ Stat: hasar ihbarı 471.000 · dolu payı %54,6 · köy verimi sonrası ödeme ≤30 gün.

**Çözüm:** "Zararı değil, zarara sebep olan olayı ölçüyoruz. Üç bağımsız tanıktan ikisi
kuraklığı doğrularsa ödeme otomatik. Tek tanık doğrularsa vaka eksper incelemesine gider."

**Ürün:** 6 adım şeridi + "Yapay zekâ tanık değil, hakem: eşiği ürüne ve döneme göre ayarlar,
primi hesaplar, çiftçiyi önceden uyarır, şüpheli veriyi işaretler."

**Blokzincir kartı:** "Blokzinciri parayı taşımak için değil, kuralı ve kanıtı korumak için
kullanıyoruz. Çiftçi, sigortacı, devlet ve reasürör aynı kurallara ve aynı kanıtlara bakar;
kimse sonradan değiştiremez."

**Ödeme kartı:** "Para TL olarak, FAST ile çiftçinin kayıtlı IBAN'ına gider. Ödemelerde kripto
varlık kullanımı Türkiye'de yasaktır (TCMB yönetmeliği, 16.04.2021). Dijital TL yaygınlaştığında
ödeme servisimiz doğrudan ona bağlanabilir."

**Ticari:** "Çiftçiden para almıyoruz. TARSİM ve havuz şirketlerinden parsel başı sezonluk izleme
ücreti alıyoruz (örnek: ₺50, ortalama bitkisel primin ~%1'i)." + SAM/SOM kartları + hesaplayıcı.

**Yol haritası:** Faz 1 eksper asistanı + gölge mod pilot (regülasyon değişikliği gerekmez) →
Faz 2 parsel verim ölçüm motoru → Faz 3 otomatik parametrik ödeme + Dijital TL.

**Dipnot (her sayfanın altı):** "Bu site bir prototiptir. Ödeme, SMS ve (test ağı dışında)
blokzincir adımları simülasyondur. Kurumlarla kurulmuş bir iş ortaklığı ima edilmez."

---

## 15. Erişilebilirlik, dil, performans bütçesi

- WCAG 2.1 AA: metin kontrastı ≥ 4.5:1 (koyu temada özellikle `--text-dim` kontrolü), odak halkası
  görünür, tüm etkileşimler klavyeyle erişilebilir, 3D dışındaki hiçbir bilgi sadece renge dayanmaz
  (tanık çiplerinde ikon + metin de var).
- `aria-live="polite"` bölgesi: karar değiştiğinde ekran okuyucuya "Karar: öde, 50.000 TL" duyurulur.
- Dil: TR varsayılan; `?lang=en` ile İngilizce (kısa sürüm: hero, üç tanık, karar, kanıt sayfası).
  Çeviri dosyası `src/content/i18n.ts`; eksik anahtar TR'ye düşer.
- Performans: LCP < 2,0 sn (3D hariç ana sayfa), JS ilk yük < 250 KB gzip (3D ayrı chunk),
  `next/font` yerine self-host fontsource + `font-display: swap`.
- Görseller: SVG ve procedural; raster kullanılacaksa `next/image` + AVIF, toplam < 1,5 MB.

---

## 16. Güvenlik, gizlilik ve dürüstlük kuralları

1. **KVKK:** Veritabanında ve zincirde gerçek kişi verisi yok. Parsel takma adı (P-1182),
   IBAN maskeli, telefon maskeli. Seed'de gerçek kişi adı kullanma ("Mehmet Amca" kurgu karakter
   olarak geçer ve ekranda "örnek senaryo" notu bulunur).
2. `INGEST_SECRET`, `AMOY_PRIVATE_KEY`, `ANTHROPIC_API_KEY` sadece `.env.local`; repoya asla.
   Testnet cüzdanında gerçek değer tutulmaz.
3. `/operator` PIN ile korunur, rate-limit (dakikada 5 deneme), tüm işlemler `AuditLog`'a yazılır.
4. `/api/ingest` HMAC + zaman penceresi (±120 sn) + `seq` kontrolü. Basit bir hız sınırı (IP başına
   dakikada 120 istek).
5. Kullanıcı girdisi (asistan sorusu) hiçbir yerde ham HTML olarak basılmaz; sunucu loglarına
   kısaltılarak yazılır.
6. **Dürüstlük:** Simülasyon rozetleri kaldırılamaz; "gerçek ödeme yapıldı" ifadesi hiçbir yerde
   geçmez; kurum logosu/ortaklık iması yok; ekran görüntülerinde sahte banka arayüzü yok.

---

## 17. Test ve kabul kriterleri

### 17.1 Otomatik
- **Vitest:** karar motoru (Bölüm 8.7'deki 6 senaryo), fiyatlama, anomali tespiti, hash kararlılığı.
- **Playwright (headless):**
  1. Ana sayfa yüklenir, hero'daki üç sayaç veri gösterir.
  2. `POST /api/sim/load {kuraklik-2025}` → `/` üzerinde tanık çipleri sırayla yeşile döner,
     60 sn içinde `ÖDE` rozeti görünür.
  3. `/k/[kod]` açılır, üç tanık kartı ve `evidenceHash` görünür.
  4. Manipülasyon senaryosu → `GRİ BÖLGE` rozeti.
  5. `/durum` tüm bileşenleri listeler.
  6. `/asistan` "Neden blokzincir?" sorusuna kaynaklı cevap döner.
  7. 3D sayfası WebGL kapalı tarayıcıda 2B yedeğe düşer.
- **Performans:** `npm run perf` — Lighthouse (mobil) ≥ 90 performans, ≥ 95 erişilebilirlik
  (3D sayfası hariç tutulur, ayrı ölçülür: fps log'u ile 55+ ortalama).
- **`npm run lint:facts`** — yasaklı rakam taraması temiz.

### 17.2 İnsan kabulü (sunumdan önce, takım birlikte)
- [ ] İnterneti kapat: her şey çalışıyor, hiçbir kırık simge yok.
- [ ] Projeksiyon çözünürlüğünde (1920×1080) arka sıradan tüm metin okunuyor.
- [ ] 1→0 tuşlarıyla sahneler 15 dakikada akıyor, süre sayacı tutuyor.
- [ ] Gerçek ESP32 bağlıyken sensörü kuru toprağa koyunca ekran 2 sn içinde tepki veriyor.
- [ ] Telefondan QR ile kanıt sayfası 3 sn'de açılıyor.
- [ ] Manipülasyon senaryosu "ödemez" sonucunu net gösteriyor.
- [ ] `npm run dry-run` hatasız.
- [ ] Yedek video (3 dk) ve ekran görüntüleri USB'de.

---

## 18. Fazlı yol haritası (Claude Code bu sırayla ilerleyecek)

| Faz | Kapsam | Bittiğinde görmem gereken |
|-----|--------|----------------------------|
| **0** | Repo, Next.js, Tailwind, tema, fontlar, tasarım tokenları, boş rotalar, `/durum` | `npm run dev` açılıyor, koyu tema ve tipografi hazır |
| **1** | Prisma şeması, seed, `data/*` üretimi, `/api/parcel`, `/parsel/[id]` | Üç parsel, NDVI grafiği, poliçe kartı |
| **2** | Karar motoru + testler + `/api/decide`, `/k/[kod]` kanıt sayfası | Konsoldan tetiklenen karar, çalışan kanıt sayfası |
| **3** | Simülasyon motoru (`/api/sim/*`) + SSE + ana sayfa canlı bölümleri | Zaman makinesi akıyor, tanık çipleri canlı |
| **4** | Zincir katmanı (mock + amoy) + ödeme/SMS taklidi + telefon mock | Karar → blok → ödeme → SMS zinciri uçtan uca |
| **5** | **3D saha simülatörü** (Bölüm 12, alt adım 12.11) | Gezilebilir sahne, hotspot kartları, kesit, veri bağı |
| **6** | Cihaz girişi (`/api/ingest`) + HIL + `CANLI` rozeti + anti-manipülasyon | Gerçek ESP32 verisi 3D'yi sürüyor |
| **7** | Sunum modu, `/sunucu`, kiosk, kısayollar, süre sayacı | Klavyeyle 15 dk akış |
| **8** | Asistan, `/asistan`, bilgi tabanı, testler, dry-run, README, dağıtım | Kaynaklı cevaplar + yeşil test raporu |

**Zaman tahmini (yoğun çalışmayla):** Faz 0–2 bir gün, Faz 3–4 bir gün, Faz 5 bir buçuk gün,
Faz 6–8 bir gün. Yetişmezse kesme sırası: kiosk → i18n → Sentinel-1 yedeği → patlatılmış görünüm.
**Asla kesilmeyecekler:** karar motoru, kanıt sayfası, 3D istasyon + kesit, canlı donanım, sunum modu.

---

## 19. Sunum günü çalıştırma kılavuzu (README'ye de yaz)

```bash
# 1) Sahne bilgisayarında, internetsiz:
OFFLINE=1 CHAIN_MODE=mock AI_MODE=local npm run build && npm start
# 2) İnternet varsa testnet ile:
CHAIN_MODE=amoy npm start
# 3) Prova:
npm run dry-run
# 4) Cihaz testi: ESP32'yi aç, /durum sayfasında "device: yeşil" olmalı.
# 5) Tarayıcı: Chrome, tam ekran (F11), donanım hızlandırma açık, diğer sekmeler kapalı.
# 6) Ekran: 1920×1080, ölçekleme %100. İkinci ekranda /sunucu.
```
**Yedek planlar:** (a) hotspot yoksa `CHAIN_MODE=mock`, (b) cihaz yoksa simüle cihaz rozeti,
(c) 3D takılırsa `?fallback2d=1`, (d) her şey çökerse `public/yedek-demo.mp4` ve ekran görüntüleri.

---

## 20. Ekler

### 20.1 ESP32 tarafı (ayrı klasör, `firmware/`)
Arduino/PlatformIO taslağı da üret: 15 sn'de bir kapasitif nem + DHT22/SHT31 okuyup HMAC'li
JSON'u `POST /api/ingest`'e atan, Wi-Fi düşerse yeniden bağlanan, `seq` sayacı tutan, LED'i
yanıp söndüren sade bir firmware. Gerçek LoRa yoksa Wi-Fi ile çalışsın; kod içinde
`// SAHADA: LoRa modülü buraya` yorumu bulunsun. Sunumda "demoda Wi-Fi, sahada LoRa" denecek.

### 20.2 QR kodları
`scripts/qr.ts` ile üç QR üret ve `public/qr/` altına koy: (1) site kökü, (2) örnek kanıt sayfası,
(3) asistan. Sunum slaytında ve stantta kullanılacak. QR'lar **kendi alan adınıza** baksın;
üçüncü taraf kısaltma servisi kullanma (final öncesi süresi dolabilir).

### 20.3 Dağıtım
- Öncelik: sahnede **yerel**. İkincil: Netlify/Vercel üzerinde public sürüm (SQLite yerine
  Postgres'e geçiş `DB_PROVIDER` ile). Public sürümde `/operator` kapalı, `CHAIN_MODE=amoy`,
  `SMS_MODE=mock`.
- Alan adı hazırsa README'ye yaz; değilse `agrishield.vercel.app` benzeri bir ad yeterli.

### 20.4 Bu prompt dışındaki referanslar
Takım rehberi PDF'i (`AgriShield_Takim_Rehberi.pdf`) içindeki Bölüm 2 (cihaz kartları),
Bölüm 4 (AgriShield 2.0 kararları), Bölüm 6 (32 soru) bu sitenin içerik kaynağıdır.
Çelişki olursa **bu prompt** geçerlidir.

---

### Son söz (Claude Code'a)
Bu site bir "landing page" değil; **çalışan bir sistemin vitrini**. Jüri, ekranda gördüğü her
şeyin arkasında gerçek bir karar motoru, gerçek bir ölçüm ve doğrulanabilir bir kanıt olduğunu
hissetmeli. Süslemeye harcayacağın her dakikayı, **kararın ve kanıtın görünürlüğüne** harca.
