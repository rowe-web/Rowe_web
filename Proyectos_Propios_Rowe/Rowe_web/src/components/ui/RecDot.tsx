import styles from "./RecDot.module.css";

interface RecDotProps {
  /** Tamaño en px (o una longitud CSS, p. ej. clamp(), con morph). */
  size?: number | string;
  /** Late con un anillo (hover del botón REC, modo REC del cursor). */
  pulse?: boolean;
  /** Parpadeo rápido (estado «Grabando…»). */
  fast?: boolean;
  /** Apagado (standby). */
  off?: boolean;
  /**
   * Alterna el punto REC con el símbolo web </> (ROWE = Rodaje + Web). Ocupa un ancho
   * de 1,8 × el tamaño; "start" deja el punto alineado a la izquierda en lugar de centrado.
   */
  morph?: boolean | "start";
  className?: string;
}

/** Punto rojo de grabación. Es el único color fuerte de la marca. */
export function RecDot({ size = 8, pulse = false, fast = false, off = false, morph = false, className = "" }: RecDotProps) {
  const dot = <span className={`absolute inset-0 rounded-full ${off ? "bg-ghost" : "bg-rec"} ${off ? "" : fast ? "animate-rec-fast" : "animate-rec"}`} />;

  if (morph && !off) {
    return (
      <span
        aria-hidden="true"
        data-rec-morph
        className={`${styles.morph} ${morph === "start" ? styles.start : ""} ${className}`}
        style={{ "--s": typeof size === "number" ? `${size}px` : size, width: "calc(var(--s) * 1.8)", height: "var(--s)" } as React.CSSProperties}
      >
        <span className={styles.dot}>{dot}</span>
        <svg viewBox="0 0 36 20" preserveAspectRatio="xMidYMid meet" className={styles.glyph}>
          <path className={styles.lt} d="M10 3.5 L3.5 10 L10 16.5" />
          <path className={styles.sl} d="M20.5 2.5 L15.5 17.5" />
          <path className={styles.gt} d="M26 3.5 L32.5 10 L26 16.5" />
        </svg>
      </span>
    );
  }

  return (
    <span aria-hidden="true" className={`relative inline-block shrink-0 ${className}`} style={{ width: size, height: size }}>
      {dot}
      {pulse && !off && (
        <span
          className="absolute left-1/2 top-1/2 rounded-full border border-rec animate-pulse-ring"
          style={{ width: size, height: size }}
        />
      )}
    </span>
  );
}
