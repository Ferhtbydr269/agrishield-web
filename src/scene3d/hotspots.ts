/**
 * Hotspot kartları — AGRISHIELD_PROMPT.md 12.9 metinleri BİREBİR.
 * (H1, H8, H10 ve ekler için 12.4 tablosundaki tanımlardan türetildi.)
 */
import type { V3 } from "./layout";

export interface PartCardText {
  id: string;
  title: string;
  nedir: string;
  benzetme: string;
  bizde: string;
  juri: string;
}

export const PART_TEXT: Record<string, PartCardText> = {
  H1: {
    id: "H1",
    title: "DİREK",
    nedir: "Alüminyum direk; sensörleri yerden yüksekte, rüzgâr ve yağışı engelsiz ölçecek şekilde taşır.",
    benzetme: "İstasyonun omurgası.",
    bizde: "Tarafsız bir noktaya (tarla yolu başı) dikilir; kooperatifin/sigortacının mülküdür, çiftçinin kontrolünde değildir.",
    juri: "\"İstasyon çiftçinin değil kooperatifin; tek başına ödeme yaptıramaz.\"",
  },
  H2: {
    id: "H2",
    title: "GÜNEŞ PANELİ",
    nedir: "5–10 W'lık panel, gündüz bataryayı doldurur.",
    benzetme: "Bahçe lambası gibi; prizsiz tarlada kendi enerjisini üretir.",
    bizde: "İstasyon yıllarca kimse dokunmadan çalışmalı. Batarya voltajı da veriyle gönderilir.",
    juri: "\"Cihaz zamanının çoğunu derin uykuda geçirir; güneş paneliyle sezonlarca bakımsız çalışır.\"",
  },
  H3: {
    id: "H3",
    title: "LORA ANTENİ",
    nedir: "Küçük veri paketlerini kilometrelerce uzağa çok az enerjiyle taşıyan telsiz.",
    benzetme: "Köy meydanındaki hoparlör — uzağa ulaşır ama kısa anons içindir.",
    bizde: "Bir ölçüm paketimiz 20–50 bayt; kırsalda GSM olmasa da köy gateway'ine ulaşır.",
    juri: "\"Neden GSM değil? Pil, abonelik ve kapsama. Kapsama iyiyse NB-IoT de takılabilir.\"",
  },
  H4: {
    id: "H4",
    title: "YAĞIŞ ÖLÇER",
    nedir: "Huninin altında devrilen iki kova; her 0,2 mm'de bir devrilir ve sinyal verir.",
    benzetme: "Su doldukça devrilen bir tahterevalli ve onu sayan sayaç.",
    bizde: "\"30 günde 10 mm'den az yağış\" koşulunun ölçümü. Tanık 2'nin en güçlü kanıtı.",
    juri: "\"Tıkanırsa? Uydu yağış verisi ve en yakın MGM istasyonuyla çapraz kontrol; sapma varsa arıza alarmı.\"",
  },
  H5: {
    id: "H5",
    title: "ANEMOMETRE",
    nedir: "Rüzgârda dönen üç fincan; dönme hızı rüzgâr hızını verir.",
    benzetme: "Rüzgârın kilometre saati.",
    bizde: "Sıcak-kuru rüzgâr zararı ve buharlaşma hesabı; fırtına teminatında kanıt.",
    juri: "\"Kuraklık ürünü için zorunlu değil; temel istasyonda opsiyonel.\"",
  },
  H6: {
    id: "H6",
    title: "RADYASYON KALKANI",
    nedir: "Üst üste dizilmiş beyaz tabaklar; sensörü güneşten korur.",
    benzetme: "Sensöre şapka takmak.",
    bizde: "Kalkansız sensör havanın değil kendi gövdesinin ısısını ölçer, sıcaklığı yüksek gösterir.",
    juri: "\"Sahada DHT22 yerine SHT31/SHT40 sınıfı sensör, kalkan içinde kullanılır.\"",
  },
  H7: {
    id: "H7",
    title: "ELEKTRONİK KUTU",
    nedir: "IP65 kutu; içinde mikrodenetleyici (ESP32/STM32), LoRa modülü ve batarya.",
    benzetme: "İstasyonun beyni ve kalbi aynı kutuda.",
    bizde: "Sensörleri okur, paketler, gönderir, uyur. Yağışsız ani nem artışını \"şüpheli\" işaretler.",
    juri: "\"Kutu kilitli ve kurcalama sensörlü; açılırsa merkez anında haber alır.\"",
  },
  H8: {
    id: "H8",
    title: "DURUM LED'İ",
    nedir: "Kutunun önündeki küçük ışık: her ölçümde bir kez yeşil yanıp söner.",
    benzetme: "İstasyonun nabzı.",
    bizde: "İletişim yoksa kırmızı nefes alır; kurcalama ya da şüpheli veri algılanırsa turuncu hızlı yanıp söner.",
    juri: "\"Sahada LED'e kimse bakmaz; aynı durum bilgisi her pakette merkeze gider.\"",
  },
  H9: {
    id: "H9",
    title: "TOPRAK NEM PROBLARI",
    nedir: "10, 30 ve 60 cm derinlikte kapasitif problar.",
    benzetme: "Parmağını toprağa sokup ıslak mı kuru mu diye bakmak — ama 15 dakikada bir ve sayıyla.",
    bizde: "Bitkinin kök bölgesindeki suyu ölçer. Uydu bunu göremez; radar sadece yüzeyi görür.",
    juri: "\"Eşik toprağa göre değişir: killi toprakta %18, kumlu toprakta %9 solma noktasıdır.\"",
  },
  H10: {
    id: "H10",
    title: "BATARYA + KABLOLAR",
    nedir: "Lityum batarya; panelden şarj olur, gece istasyonu çalıştırır.",
    benzetme: "İstasyonun yedek deposu.",
    bizde: "Batarya voltajı her pakette gönderilir; pil biterken merkez önceden haber alır.",
    juri: "\"Pil ömrü prototipte ölçülecek; sahada güneş paneliyle sezonlarca bakımsız çalışma hedefleniyor.\"",
  },
  S2: {
    id: "S2",
    title: "UYDU (SENTINEL-2)",
    nedir: "Copernicus'un optik uydusu; 10 m çözünürlük, ~5 günde bir geçiş, veri ücretsiz.",
    benzetme: "Her 5 günde bir tarlanın fotoğrafını çeken bedava fotoğrafçı.",
    bizde: "Her parselin NDVI ve NDMI değeri; ölçeklenebilirliğin sırrı bu.",
    juri: "\"5 dekarlık parsel ~50 piksel eder; çok küçük parsellerde köy istasyonu ağırlık kazanır.\"",
  },
  S1: {
    id: "S1",
    title: "UYDU (SENTINEL-1 RADAR)",
    nedir: "Kendi sinyalini gönderip yankısını ölçen radar uydusu; bulut ve gece onu etkilemez.",
    benzetme: "Yarasa gibi — ışığa değil yankıya bakar.",
    bizde: "Bulutlu dönemde yedek göz; yüzey nemi ve bitki yapısı.",
    juri: "\"Radar renk görmez, NDVI veremez. Sadece yüzeyin ilk birkaç santimini görür.\"",
  },
  GW: {
    id: "GW",
    title: "GATEWAY",
    nedir: "LoRa mesajlarını toplayıp internete aktaran kutu.",
    benzetme: "Köyün postanesi.",
    bizde: "Kooperatif çatısında tek gateway, çevredeki köylerin istasyonlarını dinler.",
    juri: "\"Maliyeti tüm bölge paylaşır; parsel başına düşen donanım maliyeti ~8 dolara iner.\"",
  },
};

/** Hotspot konumları (istasyon için yerel koordinat, istasyon kökenine göre) */
export interface Hotspot {
  id: string;
  name: string;
  local?: V3;
  world?: V3;
}

export const STATION_HOTSPOTS: Hotspot[] = [
  { id: "H1", name: "Direk", local: [0.08, 0.9, 0] },
  { id: "H2", name: "Güneş paneli", local: [0, 2.58, -0.34] },
  { id: "H3", name: "LoRa anteni", local: [0.12, 3.55, 0] },
  { id: "H4", name: "Yağış ölçer", local: [-0.62, 2.2, 0.1] },
  { id: "H5", name: "Anemometre", local: [0, 3.2, 0.32] },
  { id: "H6", name: "Radyasyon kalkanı", local: [0.62, 1.95, 0] },
  { id: "H7", name: "Elektronik kutu", local: [0, 1.28, 0.16] },
  { id: "H8", name: "Durum LED'i", local: [0.07, 1.2, 0.19] },
  { id: "H9", name: "Toprak nem probları", local: [0.35, -0.25, 0.75] },
  { id: "H10", name: "Batarya + kablolar", local: [-0.2, 0.55, 0.1] },
];
