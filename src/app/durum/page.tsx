import type { Metadata } from "next";
import { health } from "@/server/health";
import { HealthBoard } from "@/components/status/HealthBoard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Sistem durumu",
  description: "AgriShield prototipinin bileşen bileşen sağlık durumu: veritabanı, yer istasyonu, blokzincir, asistan, SMS, zaman makinesi, canlı yayın.",
};

export default async function DurumPage() {
  const initial = await health();
  return <HealthBoard initial={initial} />;
}
