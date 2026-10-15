"use client";

/**
 * Estado compartido de la cortinilla entre páginas.
 * La cabecera/chrome la cierra antes de navegar; la página nueva (PageMotion) la abre.
 */
type Opener = () => void;

let pending = false;
let opener: Opener | null = null;

export function setCurtainPending(value: boolean) {
  pending = value;
}

export function isCurtainPending() {
  return pending;
}

/** El componente Curtain registra aquí cómo abrirse. */
export function registerCurtainOpener(fn: Opener | null) {
  opener = fn;
}

/** Lo llama la página nueva al montarse: si la cortinilla está cerrada, la abre. */
export function openCurtainIfPending() {
  if (pending && opener) opener();
}
