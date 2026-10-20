/** Formato de precios del diseño: 1.400 € · «900 – 1.400 €» (separador de miles con punto). */

export function thousands(n: number): string {
  const sign = n < 0 ? "−" : "";
  return sign + String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function euros(n: number): string {
  return `${thousands(n)} €`;
}

export function range(min: number, max: number): string {
  return `${thousands(min)} – ${thousands(max)} €`;
}

/** Diferencia de precio de una opción para mostrar junto a ella: «+300 – 500 €», «−300 – 450 €», «Incluido». */
export function delta(min: number, max: number, mode: "once" | "monthly" | "percent_once", unit = ""): string {
  if (mode === "percent_once") return `+${min} %`;
  if (min === 0 && max === 0) return "Incluido";
  const neg = min < 0 || max < 0;
  return `${neg ? "−" : "+"}${range(Math.abs(min), Math.abs(max))}${mode === "monthly" ? unit || "/mes" : ""}`;
}
