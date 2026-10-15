"use client";

import { Logo } from "@/components/brand/Logo";
import { CornerMarks } from "@/components/ui/CornerMarks";
import { formatTimecode } from "@/lib/timecode";

interface PreloaderProps {
  label: string;
  meta: string;
  /** Progreso 0–1 (en la web lo calcula src/motion a partir de fuentes, imágenes y vídeo). */
  progress?: number;
  /** Guía de estilo: dibujado en su sitio. */
  preview?: boolean;
}

/** Duración simbólica de la cuenta del preloader: 00:00:02:12 (62 fotogramas). */
const COUNT_FRAMES = 62;

/**
 * Preloader — diseño nuevo siguiendo el sistema.
 * Visor de cámara en negro: marcas de encuadre, logo + REC, timecode grande que avanza
 * con la carga real y línea de progreso de 1 px. Al terminar se abre en letterbox
 * (las dos mitades negras se retiran, como la apertura del diseño). Solo la primera
 * visita de cada sesión; bloquea el scroll mientras está visible.
 */
export function Preloader({ label, meta, progress = 0, preview = false }: PreloaderProps) {
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
        <Logo height={20} href={null} interactive={false} />
        <span data-preloader-tc className="font-mono text-[clamp(40px,11vw,96px)] leading-none tabular-nums tracking-[0.02em]">
          {formatTimecode(progress * COUNT_FRAMES)}
        </span>
        <span className="relative block h-px w-[min(320px,60vw)] bg-line">
          <span data-preloader-bar className="absolute inset-y-0 left-0 w-full origin-left bg-bone" style={{ transform: `scaleX(${progress})` }} />
        </span>
        <span className="absolute bottom-7 left-7 label-mono text-[10px] text-muted md:bottom-10 md:left-12">{label}</span>
        <span className="absolute bottom-7 right-7 label-mono text-[10px] text-muted md:bottom-10 md:right-12">{meta}</span>
      </div>
    </div>
  );
}
