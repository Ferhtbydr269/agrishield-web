# Kararlar günlüğü

İş emrinden (`AgriShield_Web_Claude_Code_Promptu.md`) ayrılan ya da iş emrinin açık bıraktığı her nokta burada,
gerekçesiyle. Çelişkide iş emri esastır; buradaki sapmalar dürüstlük, sahne güvenliği veya ölçülmüş performans içindir.

## Veri ve dürüstlük

1. **Demo sezonu 2025–26 örnek veridir; iklim tarafı gerçektir.** Senaryo dünyaları (NDVI, istasyon, meteoroloji)
   deterministik ve sentetiktir (`scripts/generate-data.ts`, rozet: ÖRNEK VERİ). "Normal" ise uydurulmadı:
   Siverek ERA5 1991–2020 günlük serisinden SPI-30 gamma parametreleri ve 30 günlük yağış normalleri üretildi
   (`scripts/fetch-weather.ts`, rozet: GERÇEK VERİ). Gerçek Sentinel-2 NDVI için betik hazır (`fetch:sentinel`), sahne ona bağlı değil.
2. **6. sahnenin cümlesi değişti.** İş emri "Bu gerçek uydu verisi…" diyor; veri sentetik olduğu için
   "Bu, örnek bir kuraklık sezonu. Nisan sonunda NDVI normalin %35 altına iniyor." kullanıldı (`src/content/scenes.ts`).
   Sunucu notunda "gerçek uydu verisi deme" uyarısı var.
3. **Geriye dönük test bulgusu olduğu gibi yazıldı.** 35 sezonda iki tanıklı tetik yaklaşımı 7 sezonda (≤%20) oluşur.
   2024–25 toplamda 5. en kurak sezon olsa da açığın büyüğü kışta oluştu; kritik dönemde (Nis–May) 139 mm yağış düştü ve
   kural o sezon tetiklenmezdi. `/kaynaklar#hesaplar`'da açıkça yazıyor; pilotun ölçeceği basis risk olarak konumlandı.
4. **Prim hesaplayıcı varsayılanı rehber örneği (%10 tetik olasılığı).** ERA5 geriye dönük testi (%20, üst yaklaşım)
   tek tıkla seçilebilir; poliçe tohumu (P-1182, yıllık prim ₺12.500) %20 ile hesaplandı ve bu `/kaynaklar`'da gösterilir.
5. **Rakam disiplini.** Her rakam `facts.ts`'ten; `npm run lint:facts` yasaklı/eskimiş ifadeleri ve kaynaksız rakamı yakalar.
   Kuralı anlatan satırlar `lint-facts: izin` ile işaretlenir.
6. **SMS bağlantısı** yerel adres değil kamuya açık kısa alan adıdır (`SMS_LINK_HOST`, varsayılan `agrishield.app`) —
   iş emrindeki metin birebir: "…Kanıt: agrishield.app/k/7F3A".

## Karar motoru

7. **Sulu parselde istasyon tanığı VERİ YOK.** Köy istasyonunun yağış/nem ölçümü sulanan parseli temsil etmez; aksi
   hâlde sulu buğday (P-1244) kuraklıkta yanlışlıkla 2/3 alıyordu.
8. **Otomatik karar anı** (iş emri yalnız oylamayı tanımlıyor): aynı gün ≥2 EVET → ÖDE; parsel ölçeğinde tek tanık
   10 gün ısrar ederse → GRİ BÖLGE; kritik dönem (başaklanma–tane dolumu) biterken en az bir EVET görüldüyse GRİ BÖLGE,
   hiç görülmediyse ÖDEME YOK. Olgunlaşma–hasatta tetik kapalı.
9. **Hakem modeli eğitilmiş değil.** Açıklanabilir lojistik skor, katsayılar uzman ayarı; SHAP mantığıyla katkılar.
   Ekranda ve kanıt sayfasında bu açıkça yazar. Model ödeme kararı vermez, erken uyarı ve açıklama üretir.
10. **evidenceHash** = `0x` + SHA-256(JSON.stringify(kanıt − zincir − ödeme)); sabit anahtar sırası. SHA-256 saf
    TypeScript ile yazıldı: `crypto.subtle` yalnız güvenli bağlamda (https/localhost) var, sahnede telefonlar kanıt
    sayfasını yerel ağdan `http://` ile açıyor.
11. **İtiraz penceresi sahnede 5 sn** (`ITIRAZ_PENCERESI_SN`, gerçekte 60). Sunumda ödeme 8. sahneye kadar bekletilir
    (`holdPayment`), böylece 7. sahne kararı, 8. sahne ödemeyi gösterir.
12. **Zaman makinesi sahne hızı 4 gün/sn** (iş emri 30 gün/sn). 30 gün/sn'de Mart→Mayıs 2 saniyede biter ve tanıkların
    sırayla dönüşü anlatılamaz; 4 gün/sn ile karar ~15 sn'de gelir. Hız düğmeleri 1/4/7/15/30.

## Sahne ve arayüz

13. **3D sahnesinde kamera Shift+1–6.** Düz rakamlar sunumda sahne değiştirir (iş emri 13.1); ikisi çakışmasın diye
    sahne 4'te kamera Shift ile. Sahne 4 kendiliğinden preset 1 → 2 geçer.
14. **Sunum alanı alttaki 148 px'i ipucu şeridi ve 15:00 sayaç için ayırır**; tüm sahneler 1920×1080'de taşmasız
    (`npm run screens` her sahneyi fotoğraflayıp yatay taşma ve sayfa hatası denetler).
15. **drei `<Html>` yerine kendi 3D etiket katmanı** (`src/scene3d/labels.tsx`): React 19'da iç içe kök söküm hatası
    ("synchronously unmount a root" + removeChild) sahne geçişlerinde 3D'yi çökertiyordu.
16. **Vurgu: drei `Outlines` yerine emissive.** Performans ve çizim çağrısı bütçesi için.
17. **Performans yedeği yalnız açılışta.** fps < 30 kontrolü ilk ~20 sn, sayfa görünür ve odaktayken yapılır;
    arka plandaki sekmede tarayıcının kare hızını kısması 3D'yi kapatmaz. `?perf=off` ile kapatılır, 2B'de "yeniden dene" var.
18. **Çizim çağrısı bütçesi (≤120).** Köy evleri, veri akışı düğümleri/paketleri/blokları InstancedMesh; aynı malzemeli
    istasyon parçaları tek geometri; gizli parçalar (patlatma çizgileri, kapak içi kartlar) çizilmez; gölge atan nesne
    35 → 9. Ölçüm: 104–218 → 34–82 çağrı, ~143 fps.
19. **Yedek video `.webm`.** Playwright kaydı webm üretir (Chrome/VLC oynatır); iş emrindeki `yedek-demo.mp4` yerine
    `public/yedek/yedek-demo.webm`. Gerekirse `ffmpeg -i yedek-demo.webm yedek-demo.mp4`.
20. **"Framer Motion" = `motion` paketi** (Framer Motion'ın yeni adı, aynı API).

## Performans ölçüm yöntemi

21. **`npm run perf` Lighthouse'u uygulanan kısıtlamayla (`--throttling-method=devtools`) koşturur.** Varsayılan
    simülasyon (Lantern) localhost'ta yanıltıcı: yerel sunucuda JS ilk boyamadan önce indiği için gözlenen ilk boyama
    JS'e bağlanır ve simülasyon tüm JS indirmesini FCP'ye ekler. Aynı derleme: devtools 95–99, simulate 80–87
    (`npm run perf -- --simulate` ile görülebilir). Gerçek telefon deneyimine yakın olan devtools sonucudur; iki sonuç da raporlandı.
22. **Font stratejisi.** Web fontları `public/fonts`'tan ilk boyamadan sonra yüklenir; o ana kadar ölçüsü eşitlenmiş
    yedek fontlar (`size-adjust`/`ascent-override`, Türkçe metinde ölçüldü) görünür → CLS 0. Inter 700 ve Bricolage 700
    çıkarıldı (kalın metin 600/800 ile çizilir).
23. **Ana sayfada** hero'da opaklık animasyonu yok (LCP), 3D paketi bölüm yaklaşınca yüklenir, ekran dışı bölümler
    `content-visibility: auto` (TBT 990 → 200 ms).

## Güvenlik

24. **`X-Forwarded-For` yalnız `TRUST_PROXY=1` iken.** Test sırasında sahte başlıkla PIN hız sınırının atlatılabildiği
    görüldü; artık yerelde tüm istemciler tek kovayı paylaşır (asistan için sınır 90/dk'ya genişletildi).
25. **Operatör oturumu** HMAC imzalı, süreli `httpOnly` + `SameSite=Strict` çerez; PIN sabit zamanlı karşılaştırılır.
26. **Cihaz sıra sayacı.** Firmware `seq`'i NVS'de 100'lük bloklarla saklar (yeniden başlatmada geri gitmez); sunucuda
    cihaz sıfırlanınca beklenen sıra da sıfırlanır (emülatör → gerçek ESP32 geçişi "tekrar saldırısı" sanılmasın).

## Araçlar

27. **ESLint yok; `npm run lint` = `tsc --noEmit` + `lint:facts`.** npm'in bağımlılık çözücüsü (arborist) React 19.3 ile
    R3F/drei eş-bağımlılık aralıklarında "edgesOut" hatası verdi; `.npmrc`'de `legacy-peer-deps=true`. TypeScript strict açık.
28. **Next.js 15 (App Router)**, iş emrine uygun. Doğrulama derlemesi çalışan dev sunucusunu bozmasın diye
    `NEXT_DIST_DIR=.next-verify npm run build` desteklenir.
29. **Playwright kurulu Chrome'u kullanır** (`channel: "chrome"`); ayrı tarayıcı indirmesi gerekmez. `PW_CHANNEL=chromium`
    ile Playwright'ın kendi Chromium'u (`npx playwright install chromium`).
30. **Asistan API modu** Anthropic SDK ile `claude-opus-5` (sunucu tarafı yedek model: `claude-opus-4-8`, düşük efor,
    bilgi tabanı önbellekli). Cevapta kaynak kimliği yoksa yayınlanmaz, yerel bilgi tabanı cevabı gösterilir.
