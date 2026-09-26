"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { usePresentation } from "@/store/presentation";
import { LiveProvider } from "./LiveProvider";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** Kabuk: üst bar + içerik + dipnot. Sunum modunda ve /sunucu'da kabuk gizlenir. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const present = usePresentation((s) => s.present);
  const bare = (present && pathname === "/") || pathname === "/sunucu";

  useEffect(() => {
    const root = document.documentElement;
    if (present && pathname === "/") root.setAttribute("data-present", "1");
    else root.removeAttribute("data-present");
  }, [present, pathname]);

  return (
    <>
      <a href="#main" className="sr-only-focusable fixed left-3 top-3 z-[100] rounded-md bg-wheat px-3 py-2 font-semibold text-bg">
        İçeriğe geç
      </a>
      {!bare && <SiteHeader />}
      <main id="main">{children}</main>
      {!bare && <SiteFooter />}
      <LiveProvider />
    </>
  );
}
