import { Timecode } from "@/components/scene/Timecode";
import { Button } from "@/components/ui/Button";
import { RecDot } from "@/components/ui/RecDot";
import { RichText } from "@/components/ui/RichText";
import type { CierreBlock } from "@/lib/content/blocks";

/**
 * Cierre de página: un plano final en letterbox (bandas negras, timecode y REC) con el
 * titular y los botones. Se abre en cortinilla, como la entrada de «Hablemos».
 */
export function ClosingBlock({ block }: { block: CierreBlock }) {
  if (!block.title) return null;
  return (
    <section data-reveal="wipe" className="relative flex min-h-[72vh] flex-col items-center justify-center overflow-hidden border-y border-line bg-deep gutter-x py-[16vh] text-center">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[9%] bg-black" />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[9%] bg-black" />
      <span aria-hidden="true" className="absolute left-[6vw] top-[calc(9%+18px)] flex items-center gap-2 label-mono text-[10px] text-bone">
        <RecDot size={7} /> Rec
      </span>
      <Timecode className="absolute right-[6vw] top-[calc(9%+18px)] label-mono text-[10px] text-muted" />

      <div className="relative flex max-w-[1100px] flex-col items-center gap-8">
        {block.kicker && <span className="label-mono text-muted">{block.kicker}</span>}
        <h2 className="headline-serif text-[clamp(52px,12vw,72px)] leading-[0.92] md:text-[clamp(72px,8.4vw,144px)]">
          <RichText text={block.title} />
        </h2>
        {block.body && <p className="max-w-[44ch] text-[17px] leading-relaxed text-muted md:text-[19px]">{block.body}</p>}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-7 gap-y-4">
          {block.cta.label && (
            <Button href={block.cta.href || "/contacto"} arrow="→">
              {block.cta.label}
            </Button>
          )}
          {block.secondary.label && (
            <Button variant="link" href={block.secondary.href || "/#presupuesto"} arrow="→">
              {block.secondary.label}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
