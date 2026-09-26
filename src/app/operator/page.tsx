import type { Metadata } from "next";
import { cookies } from "next/headers";
import { config } from "@/server/config";
import { isValidOperatorToken, OPERATOR_COOKIE } from "@/server/http";
import { OperatorPanel } from "@/components/operator/OperatorPanel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Operatör", robots: { index: false, follow: false } };

export default async function OperatorPage() {
  if (config.publicDeploy) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="eyebrow">Operatör</div>
        <h1 className="mt-2 text-4xl font-extrabold">Bu sürümde kapalı</h1>
        <p className="mt-3 text-dim">Herkese açık sürümde operatör paneli devre dışıdır. Sahne kurulumunda yerel olarak açılır.</p>
      </main>
    );
  }
  const jar = await cookies();
  const authed = isValidOperatorToken(jar.get(OPERATOR_COOKIE)?.value);
  return <OperatorPanel authed={authed} />;
}
