import { RichText } from "@/components/ui/RichText";
import { SceneHeader } from "@/components/scene/SceneHeader";
import type { SceneProps } from "./types";

interface ProcesoStep {
  key: string;
  title: string;
  body: string;
  duration: string;
  /** Peso relativo del clip en la línea de tiempo. */
  size?: number;
}

const DEFAULT_SIZES = [1, 2, 3.2, 1.2];

/**
 * Escena 06 · Proceso — diseño nuevo siguiendo el sistema (mesa de montaje 1b).
 * Una pista «Proceso» con 4 clips proporcionales a su duración y un cabezal que
 * avanza con el scroll (scrub): cada paso se ilumina cuando el cabezal lo cruza.
 * En móvil la línea de tiempo pasa a vertical.
 */
export function ProcesoScene({ scene, previewHead }: SceneProps<{ steps?: ProcesoStep[] }> & { previewHead?: number }) {
  const steps = (scene.data.steps ?? []).map((s, i) => ({ ...s, size: s.size ?? DEFAULT_SIZES[i] ?? 1 }));
  const total = steps.reduce((a, s) => a + s.size, 0) || 1;
  const head = previewHead ?? 1; // posición del cabezal 0–1 (vista previa)
  // Inicio de cada clip (0–1) = suma de los tamaños anteriores / total
  const spans = steps.map((_, i) => ({ start: steps.slice(0, i).reduce((a, s) => a + s.size, 0) / total }));

  return (
    <section id="proceso" data-scene="proceso" className="relative gutter-x py-[clamp(88px,13vh,140px)]">
      <SceneHeader kicker={scene.kicker} meta={[`${steps.length} tomas`]} />
      <h2 data-reveal="mask" className="headline mt-12 text-[clamp(48px,12.5vw,64px)] md:mt-[9vh] md:text-[clamp(64px,8.3vw,128px)]">
        <RichText text={scene.title} />
      </h2>

      {/* Escritorio: línea de tiempo horizontal */}
      <div data-proceso-timeline className="relative mt-[10vh] hidden md:block">
        <div className="flex h-7 border-b border-line label-mono text-[9px] text-ghost">
          {steps.map((s) => (
            <span key={s.key} className="border-l border-line pl-1.5 leading-7" style={{ flexGrow: s.size, flexBasis: 0 }}>
              {s.duration}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 border-b border-line py-2.5">
          {steps.map((s, i) => {
            const lit = head >= spans[i].start;
            return (
              <div
                key={s.key}
                data-proceso-clip
                className={`flex h-12 min-w-0 items-center gap-3 overflow-hidden rounded-[2px] border px-3 transition-colors duration-500 ${
                  lit ? "border-line-cta bg-surface-2" : "border-line bg-transparent"
                }`}
                style={{ flexGrow: s.size, flexBasis: 0 }}
              >
                <span className="label-mono text-[9px] text-muted">{s.key}</span>
                <span className={`truncate label-mono text-[9px] ${lit ? "text-bone" : "text-ghost"}`}>{s.title}</span>
              </div>
            );
          })}
        </div>
        <div className="grid gap-[3vw] pt-8" style={{ gridTemplateColumns: steps.map((s) => `${s.size}fr`).join(" ") }}>
          {steps.map((s, i) => {
            const lit = head >= spans[i].start;
            return (
              <div key={s.key} data-proceso-step className={`flex flex-col gap-3 transition-colors duration-500 ${lit ? "" : "text-ghost"}`}>
                <span className="font-mono text-[32px] leading-none tabular-nums">{s.key}</span>
                <span className="text-[22px] leading-tight">{s.title}</span>
                <span className={`max-w-[34ch] text-[15px] leading-relaxed ${lit ? "text-muted" : "text-ghost"}`}>{s.body}</span>
              </div>
            );
          })}
        </div>
        <div aria-hidden="true" data-proceso-head className="pointer-events-none absolute top-0 h-[calc(28px+68px)]" style={{ left: `${head * 100}%` }}>
          <span className="absolute -left-[5px] top-0 h-[11px] w-[11px] bg-bone" />
          <span className="absolute left-0 top-0 h-full w-px bg-bone" />
        </div>
      </div>

      {/* Móvil: línea de tiempo vertical */}
      <ol className="relative mt-12 flex flex-col gap-10 border-l border-line pl-6 md:hidden">
        {steps.map((s) => (
          <li key={s.key} data-reveal className="relative flex flex-col gap-2">
            <span aria-hidden="true" className="absolute -left-[29px] top-1.5 h-2.5 w-2.5 bg-bone" />
            <span className="flex items-baseline justify-between gap-4">
              <span className="font-mono text-[24px] leading-none">{s.key}</span>
              <span className="label-mono text-[9px] text-muted">{s.duration}</span>
            </span>
            <span className="text-[20px]">{s.title}</span>
            <span className="text-[15px] leading-relaxed text-muted">{s.body}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
