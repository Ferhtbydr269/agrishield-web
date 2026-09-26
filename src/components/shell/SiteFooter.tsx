import Link from "next/link";
import { COPY } from "@/content/copy";
import { LogoMark } from "@/components/brand/Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface/40">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 sm:px-8 md:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark size={24} />
            <span className="font-display font-extrabold">AgriShield</span>
            <span className="font-mono text-xs text-dim">· AlgoVest · Takım ID 958027</span>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-dim" data-testid="footnote">
            {COPY.footnote}
          </p>
          <p className="mt-2 max-w-2xl text-xs text-dim">{COPY.mehmetNote}</p>
        </div>
        <nav aria-label="Alt bağlantılar" className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <Link href="/k/7F3A" className="text-dim hover:text-text">Kanıt sayfası</Link>
          <Link href="/asistan" className="text-dim hover:text-text">Asistan</Link>
          <Link href="/durum" className="text-dim hover:text-text">Sistem durumu</Link>
          <Link href="/kaynaklar" className="text-dim hover:text-text">Kaynaklar ve hesaplar</Link>
          <Link href="/parsel/P-1182" className="text-dim hover:text-text">Parsel P-1182</Link>
          <Link href="/sunucu" className="text-dim hover:text-text">Sunucu ekranı</Link>
          <Link href="/operator" className="text-dim hover:text-text">Operatör</Link>
          <a href="/api/health" className="text-dim hover:text-text">API /health</a>
          <Link href="/?lang=en" className="text-dim hover:text-text">English</Link>
        </nav>
      </div>
    </footer>
  );
}
