"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Moon, Sun, MonitorPlay } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ChainModeBadge, ConnectionBadge, LiveBadge } from "@/components/ui/Badges";
import { cn } from "@/components/ui/cn";
import { usePresentation } from "@/store/presentation";

const HOME_NAV = [
  { href: "#problem", label: "Problem" },
  { href: "#cozum", label: "Çözüm" },
  { href: "#urun", label: "Ürün" },
  { href: "#saha", label: "3D Saha" },
  { href: "#demo", label: "Demo" },
  { href: "#ticari", label: "Ticari" },
  { href: "#risk", label: "Risk" },
  { href: "#yol", label: "Yol" },
  { href: "#takim", label: "Takım" },
];

const PAGES = [
  { href: "/", label: "Ana akış" },
  { href: "/k/7F3A", label: "Kanıt örneği" },
  { href: "/asistan", label: "Asistan" },
  { href: "/durum", label: "Durum" },
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    setTheme((document.documentElement.getAttribute("data-theme") as "dark" | "light") ?? "dark");
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("as-theme", next);
    } catch {
      /* depolama kapalı olabilir */
    }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className="grid size-9 place-items-center rounded-full border border-line text-dim transition-colors hover:text-text"
      aria-label={theme === "dark" ? "Açık temaya geç (gündüz/stant)" : "Koyu temaya geç (sahne)"}
      title={theme === "dark" ? "Açık tema" : "Koyu tema"}
    >
      {theme === "dark" ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </button>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const home = pathname === "/";
  const [open, setOpen] = useState(false);
  const togglePresent = usePresentation((s) => s.togglePresent);
  useEffect(() => setOpen(false), [pathname]);

  const nav = home ? HOME_NAV : PAGES;
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-8">
        <Link href="/" prefetch={false} className="shrink-0" aria-label="AgriShield ana sayfa">
          <Logo />
        </Link>
        <nav aria-label="Bölümler" className="ml-4 hidden items-center gap-0.5 xl:flex">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="rounded-md px-2.5 py-1.5 text-sm text-dim transition-colors hover:bg-surface-2 hover:text-text">
              {n.label}
            </a>
          ))}
          {home && (
            <>
              <span className="mx-2 h-5 w-px bg-line" aria-hidden />
              <Link href="/asistan" className="rounded-md px-2.5 py-1.5 text-sm text-dim hover:bg-surface-2 hover:text-text">
                Asistan
              </Link>
              <Link href="/durum" className="rounded-md px-2.5 py-1.5 text-sm text-dim hover:bg-surface-2 hover:text-text">
                Durum
              </Link>
            </>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            <LiveBadge compact />
            <ChainModeBadge />
            <ConnectionBadge />
          </div>
          {home && (
            <button
              type="button"
              onClick={() => togglePresent(true)}
              className="hidden items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-dim transition-colors hover:text-text md:inline-flex"
              title="Sunum modu (P)"
            >
              <MonitorPlay className="size-4" aria-hidden /> Sunum <kbd className="rounded bg-surface-2 px-1 font-mono text-[0.65rem]">P</kbd>
            </button>
          )}
          <ThemeToggle />
          <button
            type="button"
            className="grid size-9 place-items-center rounded-full border border-line text-dim xl:hidden"
            aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
          </button>
        </div>
      </div>
      <div className={cn("border-t border-line bg-bg xl:hidden", open ? "block" : "hidden")}>
        <nav aria-label="Mobil menü" className="mx-auto grid max-w-[1440px] grid-cols-2 gap-1 px-4 py-3 sm:grid-cols-3">
          {[...nav, ...(home ? PAGES.slice(1) : [])].map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm text-dim hover:bg-surface-2 hover:text-text">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex flex-wrap gap-2 px-4 pb-3 lg:hidden">
          <LiveBadge compact />
          <ChainModeBadge />
          <ConnectionBadge />
        </div>
      </div>
    </header>
  );
}
