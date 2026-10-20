"use client";

/**
 * Señal «la película puede empezar»: el preloader ha terminado (o no hacía falta).
 * Las entradas de la primera pantalla esperan a esta señal para no animarse tapadas.
 */
let ready = false;
const waiting = new Set<() => void>();

export function markReady() {
  if (ready) return;
  ready = true;
  waiting.forEach((cb) => cb());
  waiting.clear();
}

export function isReady() {
  return ready;
}

/** Ejecuta cb cuando la web esté lista (inmediatamente si ya lo está). Devuelve cancelación. */
export function whenReady(cb: () => void): () => void {
  if (ready) {
    cb();
    return () => {};
  }
  waiting.add(cb);
  return () => waiting.delete(cb);
}
