"use client";

import { useRef, useState } from "react";
import { CornerMarks } from "@/components/ui/CornerMarks";
import { MediaFrame } from "@/components/scene/MediaFrame";
import type { MediaItem } from "@/lib/content/types";
import { useMotionOptional } from "@/motion/MotionProvider";

type Device = "desktop" | "mobile";

interface Props {
  screen: MediaItem | null;
  poster: MediaItem | null;
  /** Grabación vertical de la web en móvil (opcional). */
  mobile: MediaItem | null;
  urlLabel: string;
  caption: string;
  labels: { desktop: string; mobile: string };
}

const DIMS: Record<Device, string> = { desktop: "1440 × 900", mobile: "390 × 844" };

/**
 * Visor de la escena 03 con selector Escritorio / Móvil.
 * Las dos vistas están siempre montadas y su página se desplaza con el MISMO progreso de
 * scroll (src/motion/scenes/web.ts), así que al cambiar de vista la web está en el mismo
 * punto. El cambio es un fundido con el ease de corte del sistema.
 * Sin grabación subida, cada vista dibuja el esqueleto de su página (no inventa imágenes).
 */
export function WebPreview({ screen, poster, mobile, urlLabel, caption, labels }: Props) {
  const [device, setDevice] = useState<Device>("desktop");
  const motion = useMotionOptional();
  const timer = useRef(0);

  const choose = (next: Device) => {
    if (next === device) return;
    setDevice(next);
    // En móvil el visor cambia de proporción: recalcular los disparadores al terminar
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => motion?.refresh(), 650);
  };

  const view = (d: Device) =>
    `absolute inset-0 transition-[opacity,scale] duration-[600ms] ease-[var(--ease-cut)] ${
      device === d ? "opacity-100 scale-100" : "pointer-events-none scale-[0.97] opacity-0"
    }`;

  return (
    <figure data-reveal="mask" className="flex flex-col gap-3 lg:pt-6">
      <div className="relative border border-line bg-monitor">
        <div className="flex h-10 items-center justify-between gap-3 border-b border-line px-3 label-mono text-[9px] text-muted sm:px-4 md:text-[10px]">
          <span className="hidden text-bone sm:inline">WE — Programa</span>
          <span className="truncate rounded-full border border-line px-3 py-0.5 normal-case tracking-normal">{urlLabel}</span>
          <div role="radiogroup" aria-label="Vista de la web" className="flex shrink-0 border border-line-input">
            {(["desktop", "mobile"] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={device === d}
                onClick={() => choose(d)}
                className={`flex h-7 items-center gap-1.5 px-2.5 font-mono text-[9px] uppercase tracking-[0.1em] transition-[background-color,color] duration-[400ms] ease-[var(--ease-cut)] focus-visible:outline-offset-[-2px] md:text-[10px] ${
                  device === d ? "bg-bone text-ink" : "text-muted hover:text-bone"
                }`}
              >
                <DeviceIcon device={d} />
                {d === "desktop" ? labels.desktop : labels.mobile}
              </button>
            ))}
          </div>
        </div>

        <div
          data-web-stage
          data-device={device}
          data-cursor="Web"
          className={`relative overflow-hidden transition-[aspect-ratio] duration-[600ms] ease-[var(--ease-cut)] ${device === "mobile" ? "aspect-[4/5] sm:aspect-[16/10]" : "aspect-[16/10]"}`}
        >
          {/* Escritorio */}
          <div className={view("desktop")} inert={device !== "desktop"} data-web-view="desktop">
            {screen ? (
              <MediaFrame media={screen} poster={poster} className="absolute inset-0" sizes="(min-width:1024px) 55vw, 100vw" />
            ) : (
              <div className="absolute inset-0 overflow-hidden">
                <div data-web-scroll className="absolute inset-x-0 top-0 flex flex-col gap-[3.5%] px-[7%] pt-[6%]" aria-hidden="true">
                  <WebSkeleton />
                  <WebSkeleton alt />
                </div>
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-monitor to-transparent" />
          </div>

          {/* Móvil: smartphone con la misma página */}
          <div className={view("mobile")} inert={device !== "mobile"} data-web-view="mobile">
            <div className="absolute left-1/2 top-1/2 h-[88%] -translate-x-1/2 -translate-y-1/2" style={{ aspectRatio: "9 / 19.5" }}>
              <div className="relative h-full w-full rounded-[clamp(18px,2.6vw,30px)] border border-line-cta bg-ink p-[5%] shadow-[0_30px_80px_rgb(0_0_0/0.55)]">
                <div className="relative h-full w-full overflow-hidden rounded-[clamp(12px,1.8vw,22px)] bg-monitor">
                  {mobile ? (
                    <MediaFrame media={mobile} className="absolute inset-0" sizes="(min-width:1024px) 14vw, 40vw" />
                  ) : (
                    <div data-web-scroll className="absolute inset-x-0 top-0 flex flex-col gap-[14px] px-[9%] pt-[22%]" aria-hidden="true">
                      <MobileSkeleton />
                      <MobileSkeleton alt />
                    </div>
                  )}
                  {/* Barra de estado + isla */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[8%] items-start justify-center bg-gradient-to-b from-monitor to-transparent pt-[4%]">
                    <span className="h-[clamp(5px,0.8vw,10px)] w-[30%] rounded-full bg-ink" />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/5 bg-gradient-to-t from-monitor to-transparent" />
                  <span className="pointer-events-none absolute bottom-[2%] left-1/2 h-[3px] w-[34%] -translate-x-1/2 rounded-full bg-[rgb(237_234_228/0.4)]" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <CornerMarks size={16} inset={-1} color="#EDEAE4" />
      </div>
      <figcaption className="flex justify-between gap-4 label-mono text-[10px] text-muted">
        <span>{caption}</span>
        <span aria-live="polite">{DIMS[device]}</span>
      </figcaption>
    </figure>
  );
}

function DeviceIcon({ device }: { device: Device }) {
  return device === "desktop" ? (
    <svg aria-hidden="true" width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="1">
      <rect x="0.5" y="0.5" width="11" height="7" />
      <path d="M3.5 9.5h5" />
    </svg>
  ) : (
    <svg aria-hidden="true" width="7" height="11" viewBox="0 0 7 11" fill="none" stroke="currentColor" strokeWidth="1">
      <rect x="0.5" y="0.5" width="6" height="10" rx="1.2" />
      <path d="M2.5 8.5h2" />
    </svg>
  );
}

const bar = "rounded-[2px] bg-[rgb(237_234_228/0.10)]";

/** Esqueleto de página en escritorio (placeholder honesto de «web en movimiento»). */
function WebSkeleton({ alt = false }: { alt?: boolean }) {
  return (
    <div className="flex flex-col gap-[14px] pb-[8%]">
      <div className="flex items-center justify-between">
        <span className={`${bar} h-2 w-[14%]`} />
        <span className="flex gap-3">
          <span className={`${bar} h-1.5 w-8`} />
          <span className={`${bar} h-1.5 w-8`} />
          <span className="h-4 w-14 rounded-full border border-line-cta" />
        </span>
      </div>
      <span className={`${bar} mt-[5%] h-[clamp(14px,2.6vw,34px)] ${alt ? "w-[58%]" : "w-[72%]"} bg-[rgb(237_234_228/0.22)]`} />
      <span className={`${bar} h-[clamp(14px,2.6vw,34px)] ${alt ? "w-[40%]" : "w-[48%]"} bg-[rgb(237_234_228/0.22)]`} />
      <span className={`${bar} mt-1 h-1.5 w-[36%]`} />
      <span className={`${bar} h-1.5 w-[30%]`} />
      <span className="mt-1 h-5 w-24 rounded-full bg-[rgb(237_234_228/0.5)]" />
      <div className="mt-[4%] grid grid-cols-3 gap-3">
        <span className="aspect-[4/5] media-placeholder" />
        <span className="aspect-[4/5] media-placeholder" />
        <span className="aspect-[4/5] media-placeholder" />
      </div>
    </div>
  );
}

/** La misma página, maquetada en una columna (móvil). */
function MobileSkeleton({ alt = false }: { alt?: boolean }) {
  return (
    <div className="flex flex-col gap-[10px] pb-[18%]">
      <div className="flex items-center justify-between">
        <span className={`${bar} h-1.5 w-[28%]`} />
        <span className="flex flex-col gap-[3px]">
          <span className={`${bar} h-px w-3.5 bg-[rgb(237_234_228/0.4)]`} />
          <span className={`${bar} h-px w-3.5 bg-[rgb(237_234_228/0.4)]`} />
        </span>
      </div>
      <span className={`${bar} mt-[12%] h-[clamp(9px,1.3vw,16px)] ${alt ? "w-[80%]" : "w-[92%]"} bg-[rgb(237_234_228/0.22)]`} />
      <span className={`${bar} h-[clamp(9px,1.3vw,16px)] ${alt ? "w-[56%]" : "w-[70%]"} bg-[rgb(237_234_228/0.22)]`} />
      <span className={`${bar} mt-1 h-1 w-[84%]`} />
      <span className={`${bar} h-1 w-[66%]`} />
      <span className="mt-1 h-3.5 w-[52%] rounded-full bg-[rgb(237_234_228/0.5)]" />
      <span className="mt-[6%] aspect-[4/5] w-full media-placeholder" />
      <span className="aspect-[16/10] w-full media-placeholder" />
    </div>
  );
}
