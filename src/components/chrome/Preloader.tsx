"use client";

import { Logo } from "@/components/brand/Logo";
import { CornerMarks } from "@/components/ui/CornerMarks";
import { RecDot } from "@/components/ui/RecDot";
import { formatTimecode } from "@/lib/timecode";
import styles from "./Preloader.module.css";

interface PreloaderProps {
  label: string;
  meta: string;
  /** Líneas de «build» (la parte web); la activa depende del progreso. */
  steps?: string[];
  /** Progreso 0–1 (en la web lo calcula src/motion a partir de fuentes, imágenes y vídeo). */
  progress?: number;
  /** Guía de estilo: dibujado en su sitio. */
  preview?: boolean;
}

/** Duración simbólica de la cuenta del preloader: 00:00:02:12 (62 fotogramas). */
export const COUNT_FRAMES = 62;

/** Línea de «build» que toca para un progreso dado; la última se marca como lista al 100 %. */
export function preloaderStep(steps: string[], p: number): string {
  if (!steps.length) return "";
  const i = Math.min(steps.length - 1, Math.floor(p * steps.length));
  return `› ${steps[i]}${p >= 1 ? " ✓" : ""}`;
}

/**
 * Preloader — las dos disciplinas desde el primer fotograma.
 * Visor de cámara en negro (marcas de encuadre, timecode, REC: el rodaje) y el logo
 * dentro de una etiqueta de código `< ROWE />` con cursor, más un registro de «build →
 * render → deploy» que avanza con la carga real (la web). Línea de progreso de 1 px con
 * las dos pistas RO / WE. Al terminar se abre en letterbox. Solo la primera visita de
 * cada sesión; bloquea el scroll mientras está visible.
 */
export function Preloader({ label, meta, steps = [], progress = 0, preview = false }: PreloaderProps) {
  return (
    <div
      data-preloader
      role="status"
      aria-live="polite"
      aria-label="Cargando"
      className={`${preview ? "relative h-[900px]" : "fixed inset-0 h-screen-safe"} z-[500] overflow-hidden`}
    >
      {/* Mitades del letterbox que se abren al salir */}
      <div data-preloader-top className="absolute inset-x-0 top-0 h-1/2 origin-top bg-black" />
      <div data-preloader-bottom className="absolute inset-x-0 bottom-0 h-1/2 origin-bottom bg-black" />

      <div data-preloader-content className="absolute inset-0 flex flex-col items-center justify-center gap-8">
        <CornerMarks size={28} inset={28} color="rgb(237 234 228 / 0.5)" />

        {/* < ROWE /> — el logo como etiqueta de código */}
        <span className="flex items-center gap-[0.75em] font-mono text-[clamp(17px,2vw,22px)] leading-none text-muted" aria-hidden="true">
          <span className={styles.open}>&lt;</span>
          <Logo height={20} href={null} interactive={false} rec={false} />
          <span className={styles.close}>/&gt;</span>
          <span className={`${styles.caret} -ml-[0.45em] h-[1.05em] w-[0.5em] bg-bone`} />
        </span>

        <span data-preloader-tc className="font-mono text-[clamp(40px,11vw,96px)] leading-none tabular-nums tracking-[0.02em]">
          {formatTimecode(progress * COUNT_FRAMES)}
        </span>

        <span className="flex w-[min(320px,60vw)] flex-col gap-2.5">
          <span className="relative block h-px w-full bg-line">
            <span data-preloader-bar className="absolute inset-y-0 left-0 w-full origin-left bg-bone" style={{ transform: `scaleX(${progress})` }} />
          </span>
          <span className="flex justify-between label-mono text-[9px] text-muted">
            <span className="flex items-center gap-1.5">
              <RecDot size={6} />
              RO · Rec
            </span>
            <span>
              WE · Build <span data-preloader-pct className="tabular-nums text-bone">{Math.round(progress * 100)}</span>%
            </span>
          </span>
        </span>

        {steps.length > 0 && (
          <span data-preloader-step className={`${styles.step} min-h-[1.5em] font-mono text-[11px] text-muted`}>
            {preloaderStep(steps, progress)}
          </span>
        )}

        <span className="absolute bottom-7 left-7 label-mono text-[10px] text-muted md:bottom-10 md:left-12">{label}</span>
        <span className="absolute bottom-7 right-7 label-mono text-[10px] text-muted md:bottom-10 md:right-12">{meta}</span>
      </div>
    </div>
  );
}
