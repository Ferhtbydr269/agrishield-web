/** Sunucu açılışında bir kez: ön kontrol + simülasyon motoru + cihaz döngüsü. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureRuntime } = await import("./server/runtime");
    await ensureRuntime();
  }
}
