import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = {
  title: {
    default: "AgriShield — Kuraklık Nisan'da olur. Para da Nisan'da gelmeli.",
    template: "%s · AgriShield",
  },
  description:
    "AgriShield, tarlayı uzaydan ve yerden izler; kuraklık gerçekten yaşandığında kimse başvurmadan, kanıtıyla birlikte çiftçinin hesabına parayı yatırır. TEKNOFEST 2026 · AlgoVest.",
  applicationName: "AgriShield",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0e1a14" },
    { media: "(prefers-color-scheme: light)", color: "#fbf8f1" },
  ],
};

/**
 * Boyamadan önce temayı uygula (yanıp sönme olmasın). Statik, kullanıcı girdisi içermez.
 * Web fontları ilk boyamadan SONRA yüklenir (public/fonts/fonts.css): metin önce ölçüsü eşitlenmiş yedek fontla
 * görünür, font gelince kaymadan değişir. Mobilde ilk boyamayı ~1 sn öne çeker; sahnede fontlar yerelden anında gelir.
 */
const themeBoot = `(function(){try{var d=document.documentElement;var s=localStorage.getItem('as-theme');var stage=${
  process.env.NEXT_PUBLIC_STAGE_MODE === "0" ? "false" : "true"
};var t=s||(stage?'dark':(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'));d.setAttribute('data-theme',t);var q=new URLSearchParams(location.search);if(q.get('lang')==='en'){d.setAttribute('lang','en')}}catch(e){}var f=function(){if(document.getElementById('as-fonts'))return;var l=document.createElement('link');l.id='as-fonts';l.rel='stylesheet';l.href='/fonts/fonts.css';document.head.appendChild(l)};requestAnimationFrame(function(){requestAnimationFrame(f)});setTimeout(f,1500)})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="min-h-dvh bg-bg text-text antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
