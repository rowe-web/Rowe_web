interface RecDotProps {
  size?: number;
  /** Late con un anillo (hover del botón REC, modo REC del cursor). */
  pulse?: boolean;
  /** Parpadeo rápido (estado «Grabando…»). */
  fast?: boolean;
  /** Apagado (standby). */
  off?: boolean;
  className?: string;
}

/** Punto rojo de grabación. Es el único color fuerte de la marca. */
export function RecDot({ size = 8, pulse = false, fast = false, off = false, className = "" }: RecDotProps) {
  return (
    <span aria-hidden="true" className={`relative inline-block shrink-0 ${className}`} style={{ width: size, height: size }}>
      <span
        className={`absolute inset-0 rounded-full ${off ? "bg-ghost" : "bg-rec"} ${off ? "" : fast ? "animate-rec-fast" : "animate-rec"}`}
      />
      {pulse && !off && (
        <span
          className="absolute left-1/2 top-1/2 rounded-full border border-rec animate-pulse-ring"
          style={{ width: size, height: size }}
        />
      )}
    </span>
  );
}
