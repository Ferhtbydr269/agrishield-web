import type { Metadata } from "next";
import { PresenterConsole } from "@/components/presentation/PresenterConsole";

export const metadata: Metadata = { title: "Sunucu ekranı", robots: { index: false } };

export default function SunucuPage() {
  return <PresenterConsole />;
}
