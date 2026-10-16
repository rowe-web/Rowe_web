"use client";

import { useId } from "react";
import { SceneHeader } from "@/components/scene/SceneHeader";
import { RichText } from "@/components/ui/RichText";
import type { PreguntasBlock } from "@/lib/content/blocks";
import { useMotionOptional } from "@/motion/MotionProvider";

/**
 * Preguntas frecuentes con <details> nativos (teclado y lectores de pantalla sin trucos).
 * Solo una abierta a la vez (atributo name). Al abrir o cerrar, el scroll se recalcula.
 */
export function FaqBlock({ block }: { block: PreguntasBlock }) {
  const group = useId();
  const motion = useMotionOptional();
  const items = block.items.filter((i) => i.q && i.a);
  if (!items.length) return null;

  return (
    <section className="relative gutter-x py-[clamp(72px,11vh,130px)]">
      <SceneHeader kicker={block.kicker} meta={[`${items.length} preguntas`]} />
      <div className="mt-12 grid gap-12 md:mt-[8vh] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-[5vw]">
        {block.title && (
          <h2 data-reveal="mask" className="headline self-start text-[clamp(44px,11vw,60px)] md:text-[clamp(60px,5.6vw,96px)] lg:sticky lg:top-[120px]">
            <RichText text={block.title} />
          </h2>
        )}
        <div data-reveal className="border-t border-line">
          {items.map((it, i) => (
            <details key={i} name={group} className="group/faq border-b border-line" onToggle={() => motion?.refresh()}>
              <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-6 py-5 text-[18px] leading-snug md:text-[21px] [&::-webkit-details-marker]:hidden">
                <span className="flex items-baseline gap-4">
                  <span className="label-mono text-[10px] text-muted">{String(i + 1).padStart(2, "0")}</span>
                  {it.q}
                </span>
                <span aria-hidden="true" className="relative h-3.5 w-3.5 shrink-0">
                  <span className="absolute left-0 top-1/2 h-px w-full bg-bone" />
                  <span className="absolute left-1/2 top-0 h-full w-px bg-bone transition-transform duration-300 ease-[var(--ease-out)] group-open/faq:scale-y-0" />
                </span>
              </summary>
              <p className="max-w-[60ch] pb-7 pl-[calc(4ch+16px)] text-[16px] leading-relaxed text-muted md:text-[17px]">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
