import { Button } from "@/components/ui/Button";
import { RichText } from "@/components/ui/RichText";
import { SceneHeader } from "@/components/scene/SceneHeader";
import type { SceneProps } from "./types";

interface EcoStep {
  key: string;
  track: "RO" | "WE";
  title: string;
  body: string;
}

/**
 * Escena 05 · Ecosistema — diseño nuevo siguiendo el sistema. Scroll pinneado en 4 pasos.
 * Derecha: diagrama de dos pistas (RO arriba, WE abajo) por el que viaja la señal REC
 * desde el rodaje hasta el cliente; debajo, los 4 pasos (el activo en hueso, el resto apagado).
 * En móvil no hay pin: los pasos se apilan y se iluminan al entrar en pantalla.
 */
export function EcosistemaScene({ scene, previewStep }: SceneProps<{ steps?: EcoStep[] }> & { previewStep?: number }) {
  const steps = scene.data.steps ?? [];
  const active = previewStep ?? -1; // -1: sin JS todos visibles
  const x = (i: number) => `${((i + 0.5) / Math.max(steps.length, 1)) * 100}%`;

  return (
    <section id="ecosistema" data-scene="ecosistema" data-pin-steps={steps.length} className="relative">
      <div data-eco-stage className="flex flex-col gutter-x py-[clamp(88px,13vh,140px)] lg:h-screen-safe lg:py-0 lg:pb-[6vh] lg:pt-[104px]">
        <SceneHeader kicker={scene.kicker} meta={[`${steps.length} pasos`]} />

        <div className="mt-12 grid flex-1 gap-14 lg:mt-[7vh] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-[5vw]">
          <div className="flex flex-col justify-between gap-10">
            <div className="flex flex-col gap-8">
              <h2 data-reveal="mask" className="headline text-[clamp(46px,12vw,64px)] md:text-[clamp(64px,6.7vw,104px)]">
                <RichText text={scene.title} />
              </h2>
              <p data-reveal className="max-w-[40ch] text-[17px] leading-relaxed text-muted md:text-[18px]">
                {scene.body}
              </p>
            </div>
            {scene.cta_label && (
              <Button variant="rec" href={scene.cta_href || "#presupuesto"} className="self-start">
                {scene.cta_label}
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-8">
            {/* Progreso */}
            <div className="flex flex-col gap-3" aria-hidden="true">
              <div className="flex justify-between label-mono text-muted">
                <span>
                  Paso <span data-eco-current className="text-bone">{String(Math.max(active, 0) + 1).padStart(2, "0")}</span> / {String(steps.length).padStart(2, "0")}
                </span>
                <span>RO → WE</span>
              </div>
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0,1fr))` }}>
                {steps.map((s, i) => (
                  <span key={s.key} data-eco-seg className={`h-[2px] transition-colors duration-500 ${i <= active || active < 0 ? "bg-bone" : "bg-[rgb(237_234_228/0.12)]"}`} />
                ))}
              </div>
            </div>

            {/* Diagrama de pistas */}
            <div className="relative hidden h-[120px] border-y border-line sm:block" aria-hidden="true" data-eco-diagram>
              {(["RO", "WE"] as const).map((t, ti) => (
                <div key={t} className="absolute inset-x-0 flex items-center gap-4" style={{ top: ti === 0 ? "30%" : "70%" }}>
                  <span className="w-7 label-mono text-[10px] text-muted">{t}</span>
                  <span className="h-px flex-1 bg-line-strong" />
                </div>
              ))}
              <div className="absolute inset-y-0 left-11 right-0">
                {steps.map((s, i) => (
                  <span
                    key={s.key}
                    data-eco-node
                    className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-colors duration-500 ${
                      i <= active || active < 0 ? "border-bone bg-bone" : "border-line-cta bg-ink"
                    }`}
                    style={{ left: x(i), top: s.track === "RO" ? "30%" : "70%" }}
                  />
                ))}
                <svg className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <path d={steps.map((s, i) => `${i ? "L" : "M"}${((i + 0.5) / steps.length) * 100} ${s.track === "RO" ? 30 : 70}`).join(" ")} fill="none" stroke="rgb(237 234 228 / 0.3)" strokeWidth="1" vectorEffect="non-scaling-stroke" data-eco-path />
                </svg>
                <span data-eco-signal className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rec shadow-[0_0_18px_rgb(255_59_31/0.55)]" style={{ left: x(Math.max(active, 0)), top: steps[Math.max(active, 0)]?.track === "WE" ? "70%" : "30%" }} />
              </div>
            </div>

            {/* Pasos */}
            <ol className="flex flex-col border-t border-line">
              {steps.map((s, i) => (
                <li
                  key={s.key}
                  data-eco-step
                  className={`grid grid-cols-[44px_1fr] gap-x-5 gap-y-1 border-b border-line py-4 transition-colors duration-500 md:grid-cols-[64px_1fr_minmax(0,1.1fr)] md:items-baseline md:py-5 ${
                    active >= 0 && i !== active ? "text-ghost" : ""
                  }`}
                >
                  <span className="font-mono text-[22px] leading-none tabular-nums md:text-[32px]">{s.key}</span>
                  <span className="flex items-baseline gap-3">
                    <span className="headline-serif text-[clamp(28px,7vw,34px)] md:text-[clamp(30px,2.6vw,40px)]">{s.title}</span>
                    <span className={`label-mono text-[9px] ${active >= 0 && i !== active ? "text-ghost" : "text-muted"}`}>{s.track}</span>
                  </span>
                  <span className={`col-start-2 text-[15px] leading-snug md:col-start-3 ${active >= 0 && i !== active ? "text-ghost" : "text-muted"}`}>{s.body}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
