import { SceneHeader } from "@/components/scene/SceneHeader";
import { RichText } from "@/components/ui/RichText";
import type { IncluyeBlock } from "@/lib/content/blocks";

/** «Qué incluye»: rejilla numerada (como la ficha técnica), 3 columnas en escritorio. */
export function IncludesBlock({ block }: { block: IncluyeBlock }) {
  const items = block.items.filter((i) => i.title || i.body);
  if (!items.length) return null;
  return (
    <section className="relative gutter-x py-[clamp(72px,11vh,130px)]">
      <SceneHeader kicker={block.kicker} meta={[`${items.length} puntos`]} />
      {block.title && (
        <h2 data-reveal="mask" className="headline mt-12 text-[clamp(44px,11vw,60px)] md:mt-[8vh] md:text-[clamp(60px,6.9vw,112px)]">
          <RichText text={block.title} />
        </h2>
      )}
      <ul className="mt-12 grid gap-x-[3vw] sm:grid-cols-2 md:mt-[8vh] lg:grid-cols-3">
        {items.map((it, i) => (
          <li key={i} data-reveal className="flex flex-col gap-3 border-t border-line pb-10 pt-5">
            <span className="font-mono text-[13px] tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="text-[22px] leading-tight">{it.title}</h3>
            <p className="max-w-[36ch] text-[15px] leading-relaxed text-muted">{it.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
