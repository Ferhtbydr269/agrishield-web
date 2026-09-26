import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <div className="eyebrow">Kanıt sayfası</div>
      <h1 className="mt-4 text-4xl font-extrabold">Bu kodla bir karar bulunamadı.</h1>
      <p className="mt-4 text-dim">Karar kodu 4 karakterdir (ör. 7F3A). QR'ı yeniden okutun ya da örnek kanıt sayfasına bakın.</p>
      <Link href="/k/7F3A" className="mt-8 inline-block rounded-full bg-wheat px-5 py-2.5 font-semibold text-[#1a1305]">
        Örnek kanıt: /k/7F3A
      </Link>
    </div>
  );
}
