import { Timecode } from "./Timecode";

interface SceneHeaderProps {
  kicker: string;
  /** Metadatos intermedios (se ocultan en móvil salvo el primero). */
  meta?: string[];
  timecode?: boolean;
  className?: string;
}

/**
 * Cabecera de escena del diseño: «Escena 09 — Tu presupuesto · Web · Audiovisual · 00:00:00:00»
 * con línea inferior. Mismo patrón en todas las escenas para mantener la «película».
 */
export function SceneHeader({ kicker, meta = [], timecode = true, className = "" }: SceneHeaderProps) {
  return (
    <div
      data-reveal
      className={`flex flex-wrap justify-between gap-x-4 gap-y-2 border-b border-line pb-3.5 label-mono text-muted ${className}`}
    >
      <span>{kicker}</span>
      {meta.map((m, i) => (
        <span key={m} className={i > 0 ? "hidden md:inline" : "hidden sm:inline"}>
          {m}
        </span>
      ))}
      {timecode && <Timecode />}
    </div>
  );
}
