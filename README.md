# AgriShield — web prototipi

> Kuraklık Nisan'da olur. Para da Nisan'da gelmeli.

AgriShield, tarlayı uzaydan (uydu), yerden (köy istasyonu) ve resmi meteorolojiden izler; üç bağımsız tanıktan
ikisi kuraklığı doğruladığında kimse başvurmadan, kanıtıyla birlikte ödeme talimatını üretir.
Bu depo **TEKNOFEST 2026 Finansal Teknolojiler finali (AlgoVest)** için sahne demosu + herkese açık inceleme sitesidir.

**Dürüstlük notu.** Ekranda üç tür içerik vardır ve her biri rozetle işaretlidir:

| Rozet | Anlamı |
|---|---|
| `GERÇEK VERİ` | Siverek'in 1991–2026 ERA5 iklim serisi, SPI normalleri, geriye dönük test (Open-Meteo arşivi) |
| `ÖRNEK VERİ` | 2025–26 sezonu senaryoları (deterministik, gerçekçi ama sentetik); parseller takma adlı, sınırlar örnek |
| `SİMÜLASYON` | Ödeme talimatı, SMS ve (test ağı dışında) blokzincir kaydı. **Hiçbir yerde gerçek para hareket etmez.** |

Sitede görünen her rakam `src/content/facts.ts`'ten gelir ve bir kaynağa bağlıdır (`/kaynaklar`).
"Mehmet Amca" kurgu bir karakterdir. Kurum adları yalnız kaynak göstermek için geçer; ortaklık iması yoktur.

---

## Hızlı başlangıç

Gereksinim: **Node.js ≥ 20.12** (öneri 22 LTS), Chrome. İnternet yalnız `npm install` için gerekir.

```bash
npm install
npm run setup      # .env oluşturur, veritabanı + tohum verisi + QR kodları
npm run dev        # http://localhost:3000
```

Windows PowerShell'de komutlar aynıdır (`npm run …`). Veritabanı boşsa uygulama açılışta tohum verisini kendisi yükler.

## Sayfalar

| Adres | Ne var |
|---|---|
| `/` | Tek akış: problem → üç tanık → mimari → **3D saha** → canlı demo → ticari → risk → yol haritası → takım. `P` ile sunum modu |
| `/k/7F3A` | **Kanıt sayfası** (QR hedefi): üç tanık, kural, hakem modeli, zincir kaydı, ödeme, *hash'i kendin doğrula* |
| `/parsel/P-1182` | NDVI grafiği, gün gün tanık şeridi, ölçüm serileri, poliçe kartı, karar günlüğü (`?senaryo=`) |
| `/asistan` | Kaynak gösteren soru-cevap (varsayılan: internetsiz yerel bilgi tabanı) |
| `/durum` | Bileşen bileşen sağlık (yeşil / sarı = taklit mod / kırmızı) + açık API listesi |
| `/kaynaklar` | Tüm rakamlar ve kaynakları, `#hesaplar` (ERA5, backtest, prim, pazar, SPI), `#motor` (kurallar) |
| `/sunucu` | Sunucu (2. ekran): sahne, konuşma notu, süre, acil düğmeler |
| `/operator` | PIN'li operatör paneli (dakikada 5 deneme, her işlem denetim kaydına) |
| `/?kiosk=1` | Stant döngüsü (90 sn): 3D tur → hızlandırılmış kuraklık → karar + ödeme → QR'lar |
| `/?fallback2d=1` | 3D yerine 2B saha görünümü |

## Sunum modu (klavye)

| Tuş | İşlev |
|---|---|
| `P` | Sunum modunu aç/kapa (tam ekran, koyu tema, üstte sahne şeridi, sağ altta 15:00 sayaç) |
| `1`…`9`, `0` | Sahne 1–10 · `←` / `→` önceki / sonraki |
| `Space` | Zaman makinesi oynat / duraklat |
| `R` | Senaryoyu başa al · `B` karart · `Esc` çık |
| `Shift`+`1`–`6` | 3D sahnesinde (4) kamera presetleri |
| 3D içinde | `L` etiket · `X` toprak kesiti · `E` patlatılmış görünüm · `F` veri akışı · `C` bulut · `W` rüzgâr · `N` gece |

Sahne hedef süreleri toplam ~12 dk (sayaç 15:00'ten geri sayar). `/sunucu`'daki her tuş ana ekrandaki sahneyi de
değiştirir (SSE). Sahneye girişte gereken hazırlık otomatik yapılır: 6. sahnede kuraklık senaryosu yüklenir ve
ödeme 8. sahneye kadar bekletilir, 9. sahnede manipülasyon senaryosu yüklenir.

---

## Sunum günü çalıştırma kılavuzu

**bash (macOS/Linux, Git Bash)**

```bash
# 1) Sahne bilgisayarında, internetsiz (varsayılan her şey taklit + yerel):
npm run build && npm run stage
# 2) İnternet varsa testnet ile (önce: npm run contract:deploy, .env.local'a anahtar/adres):
OFFLINE=0 CHAIN_MODE=amoy npm start
# 3) Prova (sunumdan önce ZORUNLU; sunucu açıkken):
npm run dry-run
# 4) Cihaz testi: ESP32'yi aç → /durum'da "Yer istasyonu: YEŞİL", ana sayfada "CANLI DONANIM BAĞLI"
# 5) Yedek görüntüler + video (USB'ye kopyala):
npm run screens -- --video
```

**Windows PowerShell**

```powershell
npm run build; if ($?) { npm run stage }
$env:OFFLINE="0"; $env:CHAIN_MODE="amoy"; npm start
npm run dry-run
npm run screens -- --video
```

- Tarayıcı: Chrome, tam ekran (F11), donanım hızlandırma açık, diğer sekmeler kapalı. Ekran 1920×1080, ölçekleme %100.
- İkinci ekranda `/sunucu`. Telefonların QR'ı açabilmesi için: `npm run qr -- --base http://<bilgisayar-IP>:3000`.
- `npm run stage` = `OFFLINE=1 CHAIN_MODE=mock AI_MODE=local` ile üretim sunucusu (cross-env; PowerShell'de de çalışır).

### Yedek planlar

| Sorun | Ne yapılır |
|---|---|
| İnternet / hotspot yok | `CHAIN_MODE=mock` (varsayılan): yerel SHA-256 zinciri, `/durum` sarı gösterir, rozet "TAKLİT ZİNCİR" |
| ESP32 yok ya da bozuk | 20 sn veri gelmezse **simüle cihaz** otomatik devreye girer (rozet "SİMÜLE CİHAZ"); `/sunucu` → *Donanımı simülasyona çevir*; kuru/ıslak saksı düğmeleri |
| 3D takılıyor | `/?fallback2d=1` (açılışta fps < 30 ise kendiliğinden 2B'ye düşer; `?perf=off` otomatik düşüşü kapatır) |
| Ana ekran takıldı | `/sunucu` → *Sahneyi yeniden yükle* (ana ekran kendini yeniler, sahne ve süre korunur) |
| Senaryo geç kaldı | `/sunucu` → *Senaryoyu ileri sar* (karar gününün 2 gün öncesine sarar ve oynatır) |
| Her şey çöktü | `public/yedek/index.html` (çevrimdışı galeri) + `public/yedek/yedek-demo.webm` — `npm run screens -- --video` ile üretilir |

---

## Donanım (ESP32 yer istasyonu)

`firmware/` — Arduino/PlatformIO taslağı: kapasitif nem + DHT22/SHT31, HMAC-SHA256 imzalı JSON → `POST /api/ingest`,
`GET /api/time` ile saat eşitleme (±120 sn penceresi internetsiz de tutar), NVS'de kalıcı `seq`, nem değişince anında
gönderim, Wi-Fi yeniden bağlanma, LED. Demoda Wi-Fi, sahada LoRa (`// SAHADA: LoRa modülü buraya`). Ayrıntı: `firmware/README.md`.

Donanım yoksa aynı protokolle imzalı paket atan emülatör:

```bash
npm run device:emulate          # k kuru · i ıslak · s sulama (şüpheli) · t kurcalama · r tekrar saldırısı · b bozuk imza
```

## Testler ve ölçümler

| Komut | Ne yapar | Son sonuç |
|---|---|---|
| `npm test` | Vitest: karar motoru (6 senaryo), anti-manipülasyon, emniyetler, fiyatlama, SPI, hakem modeli, SHA-256 ve hash kararlılığı, asistan | 45/45 |
| `npm run e2e` | Playwright: spesifikasyondaki 7 kabul testi (sunucu yoksa `npm run dev`'i kendisi açar) | 7/7 |
| `npm run dry-run` | Sahne provası: motor, sağlık, sayfalar, 4 senaryo uçtan uca (karar → zincir → ödeme → SMS, hash yeniden hesaplanır), asistan, cihaz protokolü, sahne senkronu → `reports/dry-run.md` | 32/32 |
| `npm run lint:facts` | Yasaklı/eskimiş rakam taraması + her rakamın kaynağı var mı | temiz |
| `npm run perf` | Lighthouse (mobil) + 3D fps (gerçek GPU'da) → `reports/perf.md` | aşağıda |
| `npm run screens` | Sunumu klavyeyle baştan sona oynatır, 22 yedek görüntü (+ `--video`), taşma/hata denetimi | hatasız |

Üretim derlemesinde ölçüm (Lighthouse mobil, uygulanan ağ/CPU kısıtlaması — yöntem notu için `DECISIONS.md`):

| Sayfa | Performans | Erişilebilirlik | LCP | CLS |
|---|---|---|---|---|
| `/` (2B) | 96 | 100 | 1,9 sn | 0 |
| `/k/7F3A` | 99 | 100 | 1,8 sn | 0,001 |
| `/parsel/P-1182` | 96 | 100 | 1,7 sn | 0 |
| `/asistan` | 99 | 100 | 1,7 sn | 0 |
| `/durum` | 99 | 100 | 1,7 sn | 0 |
| `/kaynaklar` | 95 | 100 | 1,9 sn | 0 |

3D saha (1920×1080, RTX 4070): ortalama **143 fps**, en düşük 133; ≤ 110 bin üçgen; ≤ 82 çizim çağrısı (bütçe ≤ 150 bin / ≤ 120).

---

## Mimari

```
src/engine     karar motoru (saf TS, test edilir): tanıklar, fenoloji, SPI, anomali, hakem modeli, fiyat, kanıt + hash
src/sim        senaryolar, parseller, günlük değerlendirme (başsız koşturma — testler ve dry-run bunu kullanır)
src/server     simülasyon motoru (tek örnek), SSE yayını, karar hattı (itiraz → zincir → ödeme → SMS), zincir
               (mock / Polygon Amoy), cihaz girişi + anti-manipülasyon, asistan, sağlık, denetim kaydı
src/app        sayfalar + /api/* (zod doğrulamalı; hata biçimi { error: { code, message } })
src/scene3d    React Three Fiber saha simülatörü (dış model dosyası yok; primitif geometri + kendi shader'ları)
src/components arayüz; src/store Zustand; src/content metinler, rakamlar (facts.ts), kaynaklar, sahneler
contracts/     AgriShieldPolicy.sol (openCase, submitWitness, finalize, referencePayment, pause, roller, tavanlar)
data/          ERA5 serisi, iklim normalleri, backtest, senaryo verisi, parseller, asistan bilgi tabanı
firmware/      ESP32 istasyon kodu · scripts/ kurulum, veri üretimi, prova, ölçüm, QR, dağıtım betikleri
```

Tüm ekranlar tek bir sunucu durumuna bağlıdır: zaman makinesi sunucuda akar, her değişiklik SSE ile (`/api/stream`)
`/`, `/sunucu`, telefonlar ve operatör paneline aynı anda gider.

### Veri

- `npm run fetch:weather` — Siverek (37,75°K 39,32°D) ERA5 günlük serisi → normaller, SPI-30 gamma parametreleri
  (1991–2020), 35 sezonluk geriye dönük test. Bu veriler depodadır; sahne internetsiz çalışır.
- `npm run data:generate` — 2025–26 senaryo dünyaları (deterministik). `npm run seed` — veritabanı.
- `npm run fetch:sentinel` — *isteğe bağlı* gerçek Sentinel-2 NDVI (Copernicus Data Space; `CDSE_CLIENT_ID/SECRET`).

### Blokzincir

Varsayılan `CHAIN_MODE=mock`: yerel, bağlantılı SHA-256 blok zinciri (bütünlüğü `/durum`'da denetlenir).
Test ağı için: `npm run contract:compile` → `.env.local`'a `AMOY_PRIVATE_KEY` (yalnız test cüzdanı) → `npm run contract:deploy -- --yaz`
→ `OFFLINE=0 CHAIN_MODE=amoy`. Test ağı yanıt vermezse karar taklit zincire düşer ve ekranda söylenir.

### Asistan

`AI_MODE=local` (varsayılan): `data/knowledge.json` üzerinde Türkçe normalizasyon + kök kırpma + eş anlamlılar + BM25.
`AI_MODE=api`: Anthropic API (varsayılan model `claude-opus-5`, `.env.local`'da `ANTHROPIC_API_KEY`); bilgi tabanı
sistem bağlamında önbellekli gider, kaynaksız cevap yayınlanmaz → yerel cevaba düşülür.

## Ortam değişkenleri

Tam liste ve açıklamalar `.env.example`'da. Gizli anahtarlar (`INGEST_SECRET`, `AMOY_PRIVATE_KEY`,
`ANTHROPIC_API_KEY`) **yalnız `.env.local`**'a yazılır; `.env*` dosyaları repoya girmez.

| Değişken | Varsayılan | |
|---|---|---|
| `OFFLINE` | `1` | 1: zincir, SMS, asistan yerel taklitçilere düşer |
| `CHAIN_MODE` | `mock` | `amoy` için anahtar + sözleşme adresi gerekir |
| `AI_MODE` | `local` | `api` için `ANTHROPIC_API_KEY` |
| `SMS_MODE` | `mock` | `provider`: yalnız takımın kendi numarasına (`SMS_WEBHOOK_URL`, `SMS_TEST_NUMBER`) |
| `OPERATOR_PIN` | `1907` | Sahneden önce `.env.local`'da değiştirin |
| `INGEST_SECRET` | `degistir-bunu` | ESP32 ile aynı olmalı; `.env.local`'da değiştirin |
| `ITIRAZ_PENCERESI_SN` | `5` | Karar sonrası itiraz penceresi (gerçekte 60) |
| `INGEST_INTERVAL_SN` | `2` | Cihaza dönülen ölçüm aralığı (sahada 900) |
| `PUBLIC_BASE_URL` / `SMS_LINK_HOST` | yerel / `agrishield.app` | QR'ların ve SMS bağlantısının alan adı |
| `PUBLIC_DEPLOY` / `TRUST_PROXY` | `0` | Herkese açık sürüm: `/operator` kapalı, durum değiştiren uçlar operatör ister |

## Güvenlik, gizlilik, dürüstlük

- Veritabanında ve zincirde kişisel veri yok: parsel takma adı (P-1182), IBAN ve telefon maskeli; zincirde yalnız hash'ler.
- `/api/ingest`: HMAC-SHA256 imza + ±120 sn zaman penceresi + `seq` kontrolü + dakikada 120 istek.
- `/operator`: PIN (sabit zamanlı karşılaştırma), dakikada 5 deneme, imzalı `httpOnly` oturum çerezi, her işlem `AuditLog`'da.
- Hız sınırında `X-Forwarded-For` yalnız `TRUST_PROXY=1` iken dikkate alınır (başlık sahtelenerek sınır atlatılamaz).
- Kullanıcı metni hiçbir yerde ham HTML olarak basılmaz; asistan soruları loglara 120 karakterle kısaltılarak yazılır.
- Simülasyon rozetleri kaldırılamaz; "ödeme yapıldı" yerine "ödeme talimatı (simülasyon)" denir; sahte banka arayüzü yok.

## Dağıtım (ikincil)

Öncelik sahnede **yerel** çalışmaktır. Herkese açık sürüm için (Netlify/Vercel): `DB_PROVIDER=postgres` + Postgres
`DATABASE_URL` (`npm run db:generate`, `npx prisma db push --schema prisma/schema.postgres.prisma`), `PUBLIC_DEPLOY=1`,
`CHAIN_MODE=amoy`, `SMS_MODE=mock`, `PUBLIC_BASE_URL=https://<alan-adınız>`. QR'ları kendi alan adınızla yeniden üretin (`npm run qr`).

## Bilinen sınırlar

- Demo sezonu (2025–26) örnek veridir; gerçek Sentinel-2 NDVI betiği hazırdır ama sahne ona bağlı değildir.
- Hakem modeli açıklanabilir bir lojistik skordur; katsayılar uzman ayarıdır, eğitilmiş model değildir (ekranda yazar).
- Geriye dönük test yalnız yağışa dayalı bir üst yaklaşımdır (uydu ve toprak nemi geçmiş için ölçülemedi).
- Bu ortamda denenmeyenler: Amoy'a gerçek yükleme (test cüzdanı anahtarı yok), `AI_MODE=api` (API anahtarı yok),
  firmware derlemesi (Arduino araç zinciri yok), gerçek SMS sağlayıcısı. Kodları yazıldı; sahne varsayılanları bunlara bağlı değildir.

## Lisanslar

Fontlar (Inter, Bricolage Grotesque, JetBrains Mono) SIL Open Font License 1.1 — `public/fonts/LICENSE-*.txt`.
ERA5 verisi: Copernicus İklim Değişikliği Servisi (Open-Meteo arşiv API'si üzerinden).
