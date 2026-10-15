/** Ruido fractal SVG del diseño (feTurbulence 0.85, 2 octavas). */
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

interface GrainProps {
  /** fixed: sobre toda la pantalla (web). absolute: dentro de un bloque. */
  mode?: "fixed" | "absolute";
  opacity?: number;
  className?: string;
}

/**
 * Grano de película animado. Solo anima transform (barato para la GPU) y
 * nunca captura clics. Con movimiento reducido queda estático.
 */
export function Grain({ mode = "fixed", opacity = 0.06, className = "" }: GrainProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none overflow-hidden ${mode === "fixed" ? "fixed inset-0 z-[350]" : "absolute inset-0 z-40"} ${className}`}
    >
      <div className="absolute -inset-[60px] animate-grain" style={{ backgroundImage: NOISE, opacity }} />
    </div>
  );
}
