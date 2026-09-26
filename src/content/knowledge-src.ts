/**
 * Asistanın bilgi tabanı kaynağı. Jüri soruları ve sözlük takım rehberinden (Bölüm 6 ve Sözlük)
 * alındı; köşeli parantezli yer tutucular gerçek durumla (ERA5 backtest, prototip gerçeği) dolduruldu.
 * Rakamlar ve karar kuralları buraya KOPYALANMAZ: scripts/build-knowledge.ts onları facts.ts ve
 * karar motorundan üretir → data/knowledge.json
 */
export interface QA {
  id: string;
  q: string;
  a: string;
  owner: string;
  tags: string[];
  sources?: { title: string; url: string }[];
}

export interface GlossaryItem {
  term: string;
  oneLiner: string;
  analogy?: string;
  tags?: string[];
}

const TARSIM = { title: "TARSİM 2024 Faaliyet Raporu", url: "https://www.tarsim.gov.tr/staticweb/krm-web/dergi/faaliyet-raporlari/2024.pdf" };
const KOYBAZLI = { title: "TARSİM — Köy Bazlı Verim Sigortası", url: "https://www.tarsim.gov.tr/subPage/koy-bazli-verim-sigortasi" };
const SABAH = { title: "Sabah Tekirdağ, 24.08.2026", url: "https://www.sabah.com.tr/tekirdag/2026/08/24/tekirdagda-yeni-nesli-tarim-sigortasinda-sigortalilik-orani-yuzde-80in-uzerine-cikti" };
const KRIPTO = { title: "Ödemelerde Kripto Varlıkların Kullanılmamasına Dair Yönetmelik (RG 16.04.2021)", url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=38569&MevzuatTur=7&MevzuatTertip=5" };
const DTL = { title: "Alomaliye (03.08.2026) — Dijital TL'de 23 proje 3. aşamada", url: "https://www.alomaliye.com/2026/08/03/dijital-turk-lirasinda-23-proje-ucuncu-asamada/" };
const COPERNICUS = { title: "Copernicus Data Space Ecosystem", url: "https://dataspace.copernicus.eu/" };
const ERA5 = { title: "ERA5 / Open-Meteo arşiv API'si", url: "https://open-meteo.com/en/docs/historical-weather-api" };
const REHBER = { title: "AgriShield Takım Rehberi (AlgoVest, 2026)", url: "/kaynaklar" };
const KANIT = { title: "Örnek kanıt sayfası (7F3A)", url: "/k/7F3A" };

export const QAS: QA[] = [
  // A · Fikir, sigorta ve iş
  {
    id: "S1",
    q: "Bu, TARSİM'in zaten yaptığı şey değil mi? TARSİM'in yaptığından farkı ne?",
    a: "TARSİM'in köy bazlı kuraklık ürünü de endeks bazlı ve başvurusuz, bunu biliyoruz. Ama iki eksiği var: köy ortalamasına göre ödüyor, yani tarlası kuruyan ama köyü iyi olan çiftçi alamıyor; ve hasattan sonra ödüyor. 2026'da Tekirdağ'da parsel bazlı pilot başladı; bunun ülkeye yayılması için milyonlarca parselde ölçüm gerekiyor. Biz TARSİM'in rakibi değil, bu ölçüm ve otomasyon altyapısıyız.",
    owner: "Bedirhan",
    tags: ["tarsim", "fark", "rakip", "koy bazli", "parsel bazli", "tekirdag", "konumlandirma"],
    sources: [KOYBAZLI, SABAH],
  },
  {
    id: "S2",
    q: "Sigorta şirketi neden sizi kullansın?",
    a: "Üç sebep var: eksper maliyeti ve süresi düşer (2024'te 471 bin hasar ihbarı var), hasar ön tespitiyle şüpheli ihbarlar ayıklanır ve şirket parsel bazlı ürün satabilir hale gelir. Üstelik ilk faz hizmetimiz mevcut sürece eklenir, regülasyon değişikliği gerektirmez.",
    owner: "Bedirhan",
    tags: ["sigorta sirketi", "musteri", "neden", "eksper", "ihbar", "deger"],
    sources: [TARSIM],
  },
  {
    id: "S3",
    q: "Gelir modeliniz tam olarak ne? Kim, kime, ne kadar ödüyor?",
    a: "Çiftçiden para almıyoruz. TARSİM ve havuz şirketleri bize parsel başı sezonluk izleme ücreti ödüyor; örneğin ₺50, bu ortalama bitkisel primin yaklaşık %1'i. Ek gelirler: bankalara risk skoru API'si, kooperatiflere istasyon kiralama, kamuya kuraklık haritası.",
    owner: "Bedirhan",
    tags: ["gelir", "is modeli", "ucret", "para", "kazanc", "izleme ucreti", "fiyat"],
  },
  {
    id: "S4",
    q: "Pazar büyüklüğünüzü nasıl hesapladınız?",
    a: "Aşağıdan yukarıya hesapladık. Türkiye'de 2024'te 2,7 milyon bitkisel ürün poliçesi var ve primi ₺15 milyar. Hepsine parsel izleme verilse yıllık ~₺135 milyonluk bir hizmet pazarı eder. İlk üç yılda GAP ağırlıklı olarak poliçelerin %2–5'ine ulaşmayı hedefliyoruz: yıllık ₺2,7–6,8 milyon. Veri ve API gelirleri bunun üstüne.",
    owner: "Bedirhan",
    tags: ["pazar", "tam", "sam", "som", "buyukluk", "hesap"],
    sources: [TARSIM],
  },
  {
    id: "S5",
    q: "İlk müşteriniz kim olacak? Pilot nerede?",
    a: "Plan şu: Şanlıurfa'da bir tarım kooperatifiyle bir sezon gölge mod pilot, ~100 parsel, gerçek ödeme yok. Sistem her parsel için 'öderdim/ödemezdim' kararını kaydediyor, sezon sonunda gerçek verimle karşılaştırıyoruz. Paralelde havuz üyesi bir sigorta şirketine ilk faz hizmetini (hasar ön tespiti) sunmayı hedefliyoruz; henüz bir kurumla imzalı bir anlaşmamız yok.",
    owner: "Bedirhan",
    tags: ["pilot", "musteri", "golge mod", "sanliurfa", "kooperatif", "ilk"],
  },
  {
    id: "S6",
    q: "Prim ne kadar olacak, nasıl hesaplıyorsunuz?",
    a: "Prim = beklenen hasar + gider ve güvenlik payı. Örnek: ₺100.000 bedelli bir poliçede tetiklenme olasılığı yılda %10, tetiklenince ödeme ₺50.000 ise beklenen hasar ₺5.000 olur; %25 payla prim ₺6.250 eder, %70 devlet desteğiyle çiftçi ₺1.875 öder. Siverek için ERA5 ile yaptığımız geriye dönük testte yağışa dayalı iki tanık 35 sezonun 7'sinde tetiklenirdi (≤%20, üst yaklaşım). Yapay zekânın işi bu olasılığı parsel parsel doğru tahmin etmek.",
    owner: "Aleyna",
    tags: ["prim", "fiyat", "hesaplama", "ne kadar", "beklenen hasar", "destek", "backtest"],
    sources: [ERA5],
  },
  {
    id: "S7",
    q: "Basis risk nedir, sizde ne kadar?",
    a: "Ölçtüğümüz endeks ile çiftçinin gerçek zararı arasındaki fark. Parsel bazlı ölçüm, üç bağımsız tanık ve belirsiz vakaları eksperin önüne koyan hibrit yapıyla azaltıyoruz. Sahada ölçülmüş bir değerimiz henüz yok, gölge mod pilotta gerçek hasat verimiyle ölçeceğiz. Geçmiş veride şunu gördük: 2024–25 kuraklığı kışın yaşandı; yağışa dayalı kural onu yakalamıyor — bitkiyi doğrudan gören uydu tanığının neden gerekli olduğunu gösteriyor.",
    owner: "Aleyna",
    tags: ["basis risk", "baz riski", "fark", "hata", "olcum", "gercek zarar"],
    sources: [ERA5],
  },
  {
    id: "S8",
    q: "Eksperler işsiz mi kalacak?",
    a: "Hayır. Net vakaları otomatik çözüyoruz, belirsiz vakaları eksperin önüne koyuyoruz. Eksper zamanını gerçekten gereken yere harcıyor. Dolu gibi yerinde görülmesi gereken hasarlarda da eksperi doğru parsele yönlendiriyoruz: eksperi verimli yapıyoruz.",
    owner: "Ferhat",
    tags: ["eksper", "issiz", "istihdam", "hasar tespit"],
  },
  {
    id: "S9",
    q: "Hasarların yarısından fazlası dolu. Siz doluyu nasıl çözeceksiniz?",
    a: "Dolu ani ve yerel bir hasar; eksper sistemi dolu için iyi çalışıyor. Biz eksperin en zorlandığı yavaş ve geniş risklere, kuraklığa ve sıcak hava dalgasına odaklandık. Dolu için ödeme yapmıyoruz; MGM radar verisi ve uydunun önce/sonra görüntüsüyle 'hangi parseller dolu yedi' listesini çıkarıp eksper rotasını hızlandırıyoruz.",
    owner: "Ferhat",
    tags: ["dolu", "hasar radari", "kapsam", "yuzde 54"],
    sources: [TARSIM],
  },
  {
    id: "S10",
    q: "Çiftçi akıllı telefon kullanamıyorsa?",
    a: "Çiftçinin hiçbir şey kurması gerekmiyor. Poliçe TARSİM/ÇKS kaydı üzerinden yapılıyor, bildirimler SMS ve sesli mesajla geliyor, para zaten kullandığı banka hesabına yatıyor. İlk temas noktası kooperatif temsilcisi.",
    owner: "Ferhat",
    tags: ["telefon", "ciftci", "uygulama", "sms", "erisim", "kullanim"],
  },
  // B · Sensör ve uydu
  {
    id: "S11",
    q: "Çiftçi sensörü sularsa ya da yerini değiştirirse? Sensörü sularsam ne olur?",
    a: "Üç katmanlı koruma var. Bir: istasyon çiftçinin değil, kooperatifin/sigortacının; tarafsız bir noktada, kilitli, kutu açılma, eğim sensörü ve GPS'i var. İki: yağmur yokken nem birden artarsa veri 'şüpheli' işaretlenir ve istasyon tanığı devre dışı kalır. Üç: yer tanığı tek başına ödeme yaptıramaz, uydu ya da meteoroloji de doğrulamalı. Demoda bunu canlı gösteriyoruz.",
    owner: "Ferhat",
    tags: ["manipulasyon", "sensor", "sulamak", "hile", "kurcalama", "guvenlik", "sularsam"],
    sources: [KANIT],
  },
  {
    id: "S12",
    q: "Bulutlu havada uydu ne işe yarar?",
    a: "İki cevabımız var. Birincisi, bulutu delen Sentinel-1 radarını yedek göz olarak kullanıyoruz. İkincisi, kuraklık dönemleri genelde bulutsuz, açık havalı dönemlerdir. Ayrıca bulutlu dönemde karar yer istasyonu ve meteoroloji tanıklarıyla verilebilir.",
    owner: "Aleyna",
    tags: ["bulut", "uydu", "sentinel-1", "radar", "gorus"],
    sources: [COPERNICUS],
  },
  {
    id: "S13",
    q: "10 metre çözünürlük küçük parseller için yeterli mi?",
    a: "5 dekarlık bir parsel yaklaşık 50 piksel eder, bu yeterli. 1 dekarın altındaki çok küçük parsellerde kenar etkisi olur; orada köy istasyonu ve bölgesel veri ağırlık kazanır. Gerekirse ticari yüksek çözünürlüklü uydu verisi eklenebilir.",
    owner: "Aleyna",
    tags: ["cozunurluk", "10 metre", "kucuk parsel", "piksel", "sentinel-2"],
    sources: [COPERNICUS],
  },
  {
    id: "S14",
    q: "Sensör bozulursa ne olur?",
    a: "İstasyon her ölçümle birlikte pil ve sağlık bilgisi gönderiyor. Veri gelmezse ya da çevre verisiyle tutarsızsa alarm düşüyor. Arıza döneminde karar uydu ve meteoroloji ile veriliyor; iki tanık yine yeterli.",
    owner: "Ferhat",
    tags: ["ariza", "bozulma", "sensor", "yedek", "pil"],
  },
  {
    id: "S15",
    q: "Neden LoRa? Neden GSM değil?",
    a: "Ölçümlerimiz çok küçük, bir SMS'ten bile küçük. LoRa bunları kırsalda kilometrelerce, çok az enerjiyle taşıyor. GSM daha çok pil harcar, cihaz başına abonelik ister ve kırsalda çekmeyebilir. Kapsama iyi olan yerde NB-IoT da kullanabiliriz; iletişim katmanı değiştirilebilir. Demoda Wi-Fi, sahada LoRa kullanılır.",
    owner: "Ferhat",
    tags: ["lora", "gsm", "iletisim", "gateway", "nb-iot", "wifi"],
  },
  {
    id: "S16",
    q: "İstasyonun maliyeti ve pil ömrü nedir?",
    a: "Saha istasyonu için hedefimiz ~$500–1.000 (endüstriyel sensörlerle). Köy başına bir tane olduğu için parsel başına ~$8'e düşüyor (yaklaşık, gerçek teklif alınacak). Cihaz zamanının çoğunu derin uykuda geçiriyor ve güneş paneliyle sezonlarca bakımsız çalışacak şekilde tasarlanıyor; prototipte ölçülmüş bir pil ömrü değerimiz henüz yok.",
    owner: "Ferhat",
    tags: ["maliyet", "pil", "istasyon", "fiyat", "enerji", "gunes paneli"],
  },
  // C · Yapay zekâ
  {
    id: "S17",
    q: "Modeli hangi veriyle eğittiniz?",
    a: "Hedef açık veriler: TÜİK ilçe bazlı verim (etiket), MODIS ve Sentinel-2 NDVI, ERA5-Land ve CHIRPS yağış/toprak nemi; TARSİM hasar kayıtları kamuya açık değil, pilot ortaklığıyla erişmeyi hedefliyoruz. Dürüst durum: prototipteki hakem skoru henüz eğitilmiş bir model değil, uzman ayarlı ve açıklanabilir bir skordur. Meteoroloji tanığının 'normal'i ise gerçek ERA5 1991–2020 verisinden hesaplanıyor.",
    owner: "Aleyna",
    tags: ["model", "egitim", "veri", "xgboost", "yapay zeka", "etiket"],
    sources: [ERA5],
  },
  {
    id: "S18",
    q: "%88 accuracy dediniz. Test ettiniz mi?",
    a: "Yarı finalde bunlar hedef değerlerdi. Kuraklık nadir bir olay olduğu için accuracy yanıltıcı: her parsele 'kuraklık yok' diyen bir model bile yüksek accuracy alır. Bu yüzden recall ve precision'ı birlikte raporlayacağız. Henüz sahada test edilmiş bir model sonucumuz yok; yaptığımız ölçüm, ERA5 ile yağış kuralının 35 sezonluk geriye dönük testi (7 sezonda tetik).",
    owner: "Aleyna",
    tags: ["accuracy", "dogruluk", "test", "recall", "precision", "metrik"],
  },
  {
    id: "S19",
    q: "Neden XGBoost ve LSTM? Basit bir eşik yetmez mi?",
    a: "Sabit eşik her yerde aynı çalışmıyor: killi topraktaki %15 nem ile kumlu topraktaki %15 aynı şey değil; Mart'taki düşük NDVI normal, Nisan sonundaki değil. Model bu bağlamı öğrenip parsele özel eşik ve prim üretiyor. LSTM'i sadece erken uyarı için kullanıyoruz. Ödeme kuralı ise basit ve şeffaf kalıyor: üç tanıktan ikisi.",
    owner: "Aleyna",
    tags: ["xgboost", "lstm", "esik", "neden yapay zeka", "model"],
  },
  {
    id: "S20",
    q: "Model yanlış karar verirse sorumlusu kim?",
    a: "Model tek başına ödeme kararı vermiyor. Karar, poliçede önceden yazılı ve herkesin görebildiği kurala göre üç ölçümün oylamasıyla veriliyor. Poliçeyi düzenleyen sigorta şirketi; biz teknoloji sağlayıcıyız ve her kararın kanıtını saklıyoruz. Çiftçinin itiraz hakkı da korunuyor.",
    owner: "Aleyna",
    tags: ["sorumluluk", "yanlis karar", "hata", "itiraz", "hukuk"],
    sources: [KANIT],
  },
  {
    id: "S21",
    q: "İklim değişiyor. Geçmişle eğitilen model geleceği bilebilir mi?",
    a: "Haklı bir endişe; buna 'kavram kayması' deniyor. Walk-forward doğrulama kullanıyoruz, modeli her sezon yeniden eğitiyoruz, 'normal'i sabit değil kayan bir pencereyle hesaplıyoruz. En önemlisi: ödeme kararı modele değil ölçüme bağlı. İklim değişse bile ölçüm gerçeği gösterir.",
    owner: "Aleyna",
    tags: ["iklim degisikligi", "kavram kaymasi", "gelecek", "model"],
  },
  // D · Blokzincir
  {
    id: "S22",
    q: "Neden blokzincir? Normal bir veritabanı yetmez mi?",
    a: "Tek bir kurumun veritabanında o kurum kaydı değiştirebilir, diğerleri ona güvenmek zorunda kalır. Bizim sorunumuz çok taraflı güven: çiftçi, sigortacı, devlet ve reasürör aynı kurallara ve aynı kanıtlara bakmalı ve kimse sonradan değiştirememeli. Blokzinciri parayı taşımak için değil, kuralı ve kanıtı korumak için kullanıyoruz.",
    owner: "Yakup",
    tags: ["blokzincir", "neden", "veritabani", "guven", "zincir", "polygon"],
    sources: [KANIT],
  },
  {
    id: "S23",
    q: "Kripto ile mi ödeme yapacaksınız? Türkiye'de bu yasal mı?",
    a: "Hayır, kripto ile ödeme yapmıyoruz. TCMB'nin 2021 yönetmeliği ödemelerde kripto kullanımını yasaklıyor, çiftçinin cüzdanı da yok. Sözleşme ödemeyi onaylıyor, para lisanslı bir banka ya da ödeme kuruluşu üzerinden FAST ile TL olarak IBAN'a gidiyor. Gelecekte Dijital TL'nin programlanabilir ödeme altyapısına bağlanabiliriz.",
    owner: "Yakup",
    tags: ["kripto", "odeme", "yasal", "fast", "iban", "tl", "cuzdan"],
    sources: [KRIPTO],
  },
  {
    id: "S24",
    q: "Oracle manipüle edilirse?",
    a: "Üç katman var. Her tanığın verisi birden fazla bağımsız düğümden gelir ve medyanı alınır; bir düğüm yalan söylese sonuç değişmez. Üç tanıktan ikisinin anlaşması gerekir. Parsel ve gün başına ödeme tavanı ile devre kesici var; anormal bir ödeme dalgasında sistem kendini durdurur. Demoda oracle rolünü imzalı servisimiz yapıyor; üretimde Chainlink gibi çok düğümlü bir ağ öngörüyoruz.",
    owner: "Yakup",
    tags: ["oracle", "manipulasyon", "chainlink", "medyan", "devre kesici"],
  },
  {
    id: "S25",
    q: "Akıllı sözleşmede hata çıkarsa?",
    a: "Canlıya çıkmadan önce bağımsız güvenlik denetimi yapılır. Hata görülürse devre kesici sistemi durdurur. Düzeltme proxy ile yapılır, ama timelock süresi boyunca herkesin gözü önünde ve çoklu onayla; tek kişi keyfi değişiklik yapamaz.",
    owner: "Yakup",
    tags: ["akilli sozlesme", "hata", "bug", "denetim", "proxy", "timelock"],
  },
  {
    id: "S26",
    q: "Gas ücretini kim ödüyor? Polygon'a bir şey olursa?",
    a: "Gas ücretini platform ödüyor, işlem başı kuruşlar mertebesinde. Günün kayıtlarını tek bir Merkle kökü olarak yazarsak günde tek işlem yeter. Sözleşme EVM standardında; izinli bir konsorsiyum ağına ya da başka bir EVM ağına taşınabilir.",
    owner: "Yakup",
    tags: ["gas", "ucret", "polygon", "tps", "merkle", "hiz"],
  },
  {
    id: "S27",
    q: "Kişisel veriler blokzincirde mi? KVKK?",
    a: "Hayır. Ad, TC kimlik, IBAN ve telefon asla zincire yazılmıyor. Zincirde sadece takma adlı parsel kimliği (P-1182 gibi) ve ölçüm/karar parmak izleri var. Kişiyle eşleştirme sigortacının güvenli sisteminde tutuluyor.",
    owner: "Yakup",
    tags: ["kvkk", "kisisel veri", "gizlilik", "zincir", "iban"],
    sources: [KANIT],
  },
  // E · Regülasyon, gelecek, takım
  {
    id: "S28",
    q: "Bu iş için hangi izinler gerekiyor?",
    a: "Sigorta ürününü biz değil, havuz ve sigorta şirketleri sunuyor (5363 sayılı Kanun, SEDDK denetimi); biz teknoloji sağlayıcıyız. Ödeme, 6493 sayılı Kanun kapsamındaki lisanslı banka ya da ödeme kuruluşu üzerinden yapılıyor. Kişisel veride KVKK'ya uyuyoruz. Tam otomatik parametrik ödeme için düzenleyiciyle pilot görüşmesi gerekecek; bu yüzden onu üçüncü faza koyduk.",
    owner: "Bedirhan",
    tags: ["izin", "regulasyon", "lisans", "seddk", "5363", "6493", "mevzuat"],
  },
  {
    id: "S29",
    q: "Dijital TL ile ne ilişkiniz var?",
    a: "TCMB'nin ekosistem çağrısında en kalabalık kategori 'programlanabilir ödemeler'. AgriShield'ın ihtiyacı da tam bu: koşul gerçekleşince kendiliğinden ödeyen para. Bugün FAST kullanıyoruz; Dijital TL yaygınlaştığında ödeme servisimiz doğrudan ona bağlanabilir.",
    owner: "Yakup",
    tags: ["dijital tl", "tcmb", "programlanabilir odeme", "gelecek"],
    sources: [DTL],
  },
  {
    id: "S30",
    q: "Bu projeyi 1 yıl sonra nerede görüyorsunuz?",
    a: "Şanlıurfa'da bir sezonluk gölge mod pilotu tamamlamış, basis riskini sahada ölçmüş, bir havuz şirketiyle hasar ön tespiti hizmetine başlamış ve 3–5 kooperatife istasyon kurmuş olmayı hedefliyoruz.",
    owner: "Bedirhan",
    tags: ["gelecek", "1 yil", "hedef", "yol haritasi", "vizyon"],
  },
  {
    id: "S31",
    q: "Takımda sigorta ya da aktüerya bilen var mı?",
    a: "Takımımızda aktüer yok; bunu biliyoruz. Prim hesabının mantığını öğrendik (beklenen hasar + pay), danışmanımızdan destek alıyoruz ve pilotta sigorta şirketinin aktüerya ekibiyle çalışmayı planlıyoruz.",
    owner: "Bedirhan",
    tags: ["takim", "akturya", "sigorta bilgisi", "ekip"],
  },
  {
    id: "S32",
    q: "Bu proje daha önce başka bir yarışmaya katıldı mı?",
    a: "Bu sorunun doğrulanmış cevabı asistanda yok; takım kaptanı cevaplar (şartname gereği varsa bilgiler proje dosyasında bildirilmiştir).",
    owner: "Takım kaptanı",
    tags: ["yarisma", "katilim", "daha once", "sartname"],
  },
  // Site ve demoya özgü, rehberle tutarlı kayıtlar
  {
    id: "D1",
    q: "Demodaki veri gerçek mi?",
    a: "Karşınızdaki zaman makinesi senaryoları örnek veridir (sentetik, 'örnek veri' rozetiyle işaretli) — sahnede hiçbir şeyin bozulmaması için deterministik üretildi. Gerçek olanlar: meteoroloji tanığının 30 yıllık normali ve SPI hesabı (ERA5 1991–2020), Siverek için 35 sezonluk geriye dönük test, karar motoru ve kanıt hash'i. Ödeme, SMS ve (test ağı dışında) zincir adımları simülasyondur.",
    owner: "Aleyna",
    tags: ["gercek", "veri", "sentetik", "simulasyon", "ornek veri", "demo"],
    sources: [ERA5],
  },
  {
    id: "D2",
    q: "Hasadı kuraklık sanmaz mı? NDVI hasatta da düşer.",
    a: "Sanmaz. Karar motoru ürünün gelişim takvimini (fenoloji) bilir: kıraç buğdayda 20 Mayıs–30 Haziran olgunlaşma–hasat penceresinde uydu tanığı daima HAYIR döner. Ayrıca eşik döneme göre ölçeklenir: efektif eşik = −0,25 / ağırlık; kritik başaklanma döneminde ağırlık 1,0.",
    owner: "Aleyna",
    tags: ["hasat", "fenoloji", "ndvi dususu", "pencere", "donem"],
  },
  {
    id: "D3",
    q: "Aynı %15 nem her toprakta aynı mı?",
    a: "Hayır. Aynı %15 nem kumlu toprakta iyi, killi toprakta kuraklıktır. Solma noktası killi toprakta %18, tınlı toprakta %14, kumlu toprakta %9 (hacimsel); istasyon tanığı eşiği parselin toprak tipine göre seçer.",
    owner: "Ferhat",
    tags: ["toprak", "nem", "solma noktasi", "killi", "kumlu", "tinli", "esik"],
  },
  {
    id: "D4",
    q: "Bir kararın doğru olduğunu nasıl kontrol ederim?",
    a: "Her kararın herkese açık bir kanıt sayfası var (örnek: /k/7F3A). Sayfadaki mühürlenen metni kopyalayıp SHA-256'sını alırsanız sonuç evidenceHash ile aynı çıkar; tek bir rakamı değiştirirseniz hash değişir. Aynı hash zincirdeki kayıtta da durur.",
    owner: "Yakup",
    tags: ["dogrulama", "hash", "kanit", "sha256", "kontrol", "seffaflik"],
    sources: [KANIT],
  },
  {
    id: "D5",
    q: "Sulu parsele de kuraklık ödemesi yapar mısınız?",
    a: "Köy istasyonu kıraç arazide durduğu için sulanan parselin kök bölgesi nemini temsil etmez; sulu poliçelerde istasyon tanığı kullanılmaz ve karar uydu + meteoroloji ile verilir. Böylece yağış açığı olan ama sulandığı için sağlıklı bir parsel ödeme almaz.",
    owner: "Ferhat",
    tags: ["sulu", "sulama", "istasyon", "parsel", "odeme"],
  },
  {
    id: "D6",
    q: "Yapay zekâ tanık mı?",
    a: "Hayır. Yapay zekâ tanık değil, hakem: eşiği ürüne ve döneme göre ayarlar, primi hesaplar, çiftçiyi önceden uyarır, şüpheli veriyi işaretler. Tahmine para ödenmez; ödeme üç bağımsız ölçümün oylamasına bağlıdır.",
    owner: "Aleyna",
    tags: ["yapay zeka", "tanik", "hakem", "rol", "tahmin"],
  },
];

export const GLOSSARY: GlossaryItem[] = [
  { term: "Parametrik sigorta", oneLiner: "Zararı değil sebebini (endeksi) ölçüp eşik aşılınca otomatik ödeyen sigorta.", analogy: "Uçak rötar sigortası: uçuş 3 saatten fazla gecikirse para yatar, kimse 'zarar gördün mü?' diye sormaz." },
  { term: "Basis risk", oneLiner: "Ölçülen endeks ile çiftçinin gerçek zararı arasındaki fark.", analogy: "İstasyona yağmur yağmış ama 3 km ötedeki tarlaya hiç yağmamış olabilir.", tags: ["baz riski"] },
  { term: "NDVI", oneLiner: "Bitkinin uydudan ölçülen yeşillik notu: (NIR − Kırmızı) / (NIR + Kırmızı); sağlıklı bitkide ~0,6–0,9.", analogy: "Bitkinin yeşillik karnesi.", tags: ["ndvi", "yesillik", "uydu"] },
  { term: "NDMI", oneLiner: "Bitki su içeriği indeksi (NIR ve SWIR ile); bitki sararmadan önce su kaybını yakalar.", analogy: "Bitkinin susuzluk ölçeri.", tags: ["ndwi"] },
  { term: "SPI", oneLiner: "Standart Yağış İndeksi: bu dönemin yağışı uzun yıllar ortalamasından kaç standart sapma uzakta? −1,5 altı çok kurak, −2 altı aşırı kurak.", tags: ["spi", "kuraklik indisi"] },
  { term: "Sentinel-2", oneLiner: "Copernicus'un optik uydusu: 10 m çözünürlük, ~5 günde bir geçiş, veri ücretsiz.", analogy: "Her 5 günde bir tarlanın fotoğrafını çeken bedava fotoğrafçı.", tags: ["uydu"] },
  { term: "Sentinel-1", oneLiner: "Kendi sinyalini gönderip yankısını ölçen radar uydusu; bulut ve gece etkilemez, NDVI veremez.", analogy: "Yarasa gibi — ışığa değil yankıya bakar.", tags: ["radar", "sar"] },
  { term: "LST", oneLiner: "Yer yüzeyi sıcaklığı; termal bantlı uydulardan (Landsat 8/9, MODIS, Sentinel-3) gelir, Sentinel-2'den gelmez." },
  { term: "LoRa / LoRaWAN", oneLiner: "Küçük paketleri kilometrelerce uzağa çok az enerjiyle taşıyan telsiz / onun ağ kuralları.", analogy: "Köy meydanındaki hoparlör: uzağa ulaşır ama kısa anons içindir.", tags: ["lora"] },
  { term: "Gateway", oneLiner: "LoRa mesajlarını toplayıp internete aktaran kutu.", analogy: "Köyün postanesi." },
  { term: "Oracle", oneLiner: "Dış dünya verisini blokzincire taşıyan köprü.", analogy: "Maçtaki VAR: sahayı kendi görmeyen hakeme görüntüyü getirir.", tags: ["chainlink"] },
  { term: "Akıllı sözleşme", oneLiner: "Blokzincirde çalışan, koşul gerçekleşince kendiliğinden işleyen program.", analogy: "Kasiyersiz içecek otomatı.", tags: ["smart contract", "solidity"] },
  { term: "Blokzincir", oneLiner: "Kopyası çok yerde tutulan, mühürlü sayfalardan oluşan, değiştirilemez kayıt defteri.", analogy: "1.000 kopyası olan noter defteri.", tags: ["zincir"] },
  { term: "Multi-sig", oneLiner: "Bir işlem için birden çok imza isteyen cüzdan yapısı. Bizim kuralımızın doğru adı 'üç tanıktan ikisi' (2/3 eşik onayı)." },
  { term: "Devre kesici", oneLiner: "Anormal durumda (ör. bir günde beklenenin çok üstünde ödeme talebi) sistemi otomatik durduran güvenlik önlemi.", analogy: "Evdeki sigorta kutusu." },
  { term: "Gölge mod", oneLiner: "Sistemin bir sezon gerçek ödeme yapmadan 'öderdim/ödemezdim' kararını kaydettiği test dönemi; sonunda gerçek verimle karşılaştırılır." },
  { term: "FAST", oneLiner: "TCMB'nin 7/24 çalışan anlık ödeme sistemi; para saniyeler içinde karşı hesaba geçer." },
  { term: "Dijital Türk Lirası", oneLiner: "TCMB'nin dijital parası; programlanabilir ödemeye imkân verir.", tags: ["dijital tl"] },
  { term: "Fenoloji", oneLiner: "Bitkinin gelişim takvimi (çıkış, kardeşlenme, başaklanma, olgunluk)." },
  { term: "SHAP", oneLiner: "Model kararını faktörlerine ayıran açıklama yöntemi.", analogy: "Elektrik faturasının dökümü." },
  { term: "Eksper", oneLiner: "Hasarı yerinde tespit eden uzman.", tags: ["hasar tespit"] },
  { term: "TARSİM", oneLiner: "Tarım Sigortaları Havuzu (5363 sayılı Kanun); devlet destekli tarım sigortası bu havuz üzerinden yürür." },
  { term: "ERA5 / ERA5-Land", oneLiner: "Copernicus'un saatlik iklim yeniden analiz verisi (~9 km, 1950'den beri); meteoroloji normalimiz buradan." },
  { term: "Hash", oneLiner: "Verinin benzersiz kısa özeti (parmak izi). Veri değişirse hash de değişir.", tags: ["mühür", "parmak izi", "sha256"] },
];
