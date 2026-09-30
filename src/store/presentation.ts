"use client";
/**
 * Sunum modu durumu. Sahne değişimleri sunucuya gönderilir (/api/scene) ve SSE ile tüm ekranlara
 * (/, /sunucu, ikinci cihaz) yayılır — tek gerçek kaynağı sunucu.
 */
import { create } from "zustand";
import type { SceneState } from "@/lib/live-types";
import { postJson } from "@/lib/api";

interface PresentationStore {
  present: boolean;
  index: number;
  blackout: boolean;
  startedAt: number | null;
  kiosk: boolean;
  clientId: string;
  reloadNonce: number | null;
  applyRemote: (s: SceneState) => void;
  setScene: (i: number) => void;
  next: () => void;
  prev: () => void;
  togglePresent: (on?: boolean) => void;
  toggleBlackout: () => void;
  resetTimer: () => void;
  setKiosk: (on: boolean) => void;
}

const clientId = typeof window !== "undefined" ? `ekran-${Math.random().toString(36).slice(2, 7)}` : "ssr";

function send(patch: Record<string, unknown>) {
  void postJson("/api/scene", { ...patch, origin: clientId }).catch(() => undefined);
}

export const usePresentation = create<PresentationStore>((set, get) => ({
  present: false,
  index: 0,
  blackout: false,
  startedAt: null,
  kiosk: false,
  clientId,
  reloadNonce: null,
  applyRemote: (s) => {
    const st = get();
    // Sunucu yeniden başladıysa (hiç güncellenmemiş varsayılan durum) sunum sürerken 1. sahneye düşmeyiz:
    // bu ekranın sahnesi sunucuya geri yüklenir, diğer ekranlar SSE ile yeniden eşitlenir.
    if (s.origin === "server" && !s.present && st.present) {
      send({ index: st.index, present: true, blackout: st.blackout });
      return;
    }
    // /sunucu "sahneyi yeniden yükle": ana ekran kendini yeniler (sunucu ekranı değil)
    if (st.reloadNonce != null && s.reloadNonce > st.reloadNonce && typeof window !== "undefined" && window.location.pathname === "/") {
      window.location.reload();
      return;
    }
    set({ index: s.index, present: s.present, blackout: s.blackout, startedAt: s.startedAt, reloadNonce: s.reloadNonce });
  },
  setScene: (i) => {
    const index = Math.max(0, Math.min(9, i));
    set({ index });
    send({ index });
  },
  next: () => get().setScene(get().index + 1),
  prev: () => get().setScene(get().index - 1),
  togglePresent: (on) => {
    const present = on ?? !get().present;
    set({ present, ...(present && !get().startedAt ? { startedAt: Date.now() } : {}) });
    send({ present });
  },
  toggleBlackout: () => {
    const blackout = !get().blackout;
    set({ blackout });
    send({ blackout });
  },
  resetTimer: () => {
    set({ startedAt: Date.now() });
    send({ resetTimer: true });
  },
  setKiosk: (on) => set({ kiosk: on }),
}));
