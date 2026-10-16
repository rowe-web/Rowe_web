/**
 * Constantes de estilo del panel. Módulo NEUTRO (sin "use client"): se puede importar
 * desde componentes de servidor y de cliente. (Una constante importada desde un módulo
 * "use client" llega al servidor como referencia, no como texto.)
 */
export const mono = "font-mono text-[10px] uppercase tracking-[0.12em]";

/** Longitud visible de un texto editable (sin las marcas *cursiva*). */
export function visibleLength(text: string) {
  return text.replace(/\*/g, "").length;
}
