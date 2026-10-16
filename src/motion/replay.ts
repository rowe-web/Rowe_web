"use client";

import { useSyncExternalStore } from "react";

/**
 * «Volver a empezar» la página actual sin recargar: el logo, en la página en la que ya
 * estás, cierra la cortinilla, sube arriba y vuelve a montar la página (PageMotion usa
 * esta clave), así que todas las animaciones arrancan otra vez desde su estado inicial.
 */
let key = 0;
const listeners = new Set<() => void>();

export function replayPage() {
  key += 1;
  listeners.forEach((l) => l());
}

export function onReplay(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useReplayKey(): number {
  return useSyncExternalStore(
    onReplay,
    () => key,
    () => 0,
  );
}
