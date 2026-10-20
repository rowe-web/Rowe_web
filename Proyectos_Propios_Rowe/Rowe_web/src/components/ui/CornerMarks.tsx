interface CornerMarksProps {
  /** Longitud de cada marca en px. */
  size?: number;
  /** Distancia al borde en px (negativa para salir del bloque). */
  inset?: number;
  color?: string;
  className?: string;
}

/** Marcas de encuadre en las cuatro esquinas (visor de cámara). */
export function CornerMarks({ size = 24, inset = 0, color = "rgb(237 234 228 / 0.8)", className = "" }: CornerMarksProps) {
  const base = { position: "absolute" as const, width: size, height: size, borderColor: color, borderStyle: "solid", borderWidth: 0 };
  return (
    <span aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
      <span style={{ ...base, left: inset, top: inset, borderLeftWidth: 1, borderTopWidth: 1 }} />
      <span style={{ ...base, right: inset, top: inset, borderRightWidth: 1, borderTopWidth: 1 }} />
      <span style={{ ...base, left: inset, bottom: inset, borderLeftWidth: 1, borderBottomWidth: 1 }} />
      <span style={{ ...base, right: inset, bottom: inset, borderRightWidth: 1, borderBottomWidth: 1 }} />
    </span>
  );
}
