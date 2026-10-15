"use client";

import { useSyncExternalStore } from "react";
import type { Selection } from "@/features/configurator/engine";

/** Lo que viaja del configurador al formulario «Hablemos». */
export interface Prefill {
  id: number;
  need: string;
  /** Rango calculado (solo para mostrar: el servidor lo recalcula). */
  range: string;
  items: string;
  selection: Selection;
}

interface State {
  prefill: Prefill | null;
  overlayOpen: boolean;
}

let state: State = { prefill: null, overlayOpen: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  emit();
}

export const hablemos = {
  setPrefill(prefill: Prefill | null) {
    set({ prefill });
  },
  open(prefill?: Prefill) {
    set(prefill ? { prefill, overlayOpen: true } : { overlayOpen: true });
  },
  close() {
    set({ overlayOpen: false });
  },
  get: () => state,
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const serverState: State = { prefill: null, overlayOpen: false };

export function useHablemos(): State {
  return useSyncExternalStore(subscribe, hablemos.get, () => serverState);
}
