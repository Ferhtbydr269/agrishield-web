"use client";
import { useEffect, useState } from "react";
import { langFromSearch, t, type I18nKey, type Lang } from "@/content/i18n";

export function useLang(): { lang: Lang; t: (k: I18nKey) => string } {
  const [lang, setLang] = useState<Lang>("tr");
  useEffect(() => {
    const l = langFromSearch(window.location.search);
    setLang(l);
    document.documentElement.lang = l;
  }, []);
  return { lang, t: (k) => t(k, lang) };
}
