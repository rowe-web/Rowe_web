import { RichText } from "@/components/ui/RichText";
import { SceneHeader } from "@/components/scene/SceneHeader";
import type { SceneProps } from "./types";

/**
 * Escena aún no construida (Presupuesto y Hablemos llegan en la Fase 3).
 * Mantiene el ancla (#presupuesto, #hablemos) para que los botones ya funcionen.
 */
export function SceneStub({ scene }: SceneProps) {
  return (
    <section id={scene.key} data-scene={scene.key} className="relative gutter-x py-[clamp(88px,13vh,140px)]">
      <SceneHeader kicker={scene.kicker} meta={["En montaje · Fase 3"]} />
      <h2 data-reveal="mask" className="headline mt-12 text-[clamp(48px,12.5vw,64px)] md:mt-[9vh] md:text-[clamp(64px,8.3vw,128px)]">
        <RichText text={scene.title} />
      </h2>
      {scene.body && (
        <p data-reveal className="mt-8 max-w-[44ch] text-[17px] leading-relaxed text-muted md:text-[19px]">
          {scene.body}
        </p>
      )}
    </section>
  );
}
