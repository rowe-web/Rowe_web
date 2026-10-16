import { SceneHeader } from "@/components/scene/SceneHeader";
import { RecDot } from "@/components/ui/RecDot";
import { RichText } from "@/components/ui/RichText";
import type { ServiciosBlock } from "@/lib/content/blocks";
import type { SiteSnapshot } from "@/lib/content/types";

/**
 * «Escaleta» de servicios: la lista de una disciplina (tabla services) como el orden
 * de rodaje de un guion. Hover (o scroll en móvil): la fila se desplaza y enciende el REC.
 */
export function ServicesBlock({ block, site }: { block: ServiciosBlock; site: SiteSnapshot }) {
  const items = site.services.filter((s) => s.discipline === block.discipline);
  if (!items.length) return null;
  const track = block.discipline === "web" ? "WE" : "RO";

  return (
    <section className="relative gutter-x py-[clamp(72px,11vh,130px)]">
      <SceneHeader kicker={block.kicker} meta={[`${items.length} servicios`]} />
      {block.title && (
        <h2 data-reveal="mask" className="headline mt-12 max-w-[14ch] text-[clamp(44px,11vw,60px)] md:mt-[8vh] md:text-[clamp(60px,6.9vw,112px)]">
          <RichText text={block.title} />
        </h2>
      )}
      <ol className="mt-12 border-t border-line md:mt-[8vh]">
        {items.map((s, i) => (
          <li
            key={s.slug}
            data-reveal
            data-scroll-active
            className="group/svc grid grid-cols-[40px_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 border-b border-line py-6 md:grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)_120px] md:gap-x-8 md:py-8"
          >
            <span className="label-mono text-[10px] text-muted">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="text-[26px] font-light leading-[1.05] tracking-[-0.03em] transition-transform duration-500 ease-[var(--ease-out)] group-hover/svc:translate-x-3 group-data-[active]/svc:translate-x-3 md:text-[clamp(30px,3.1vw,48px)]">
              {s.title}
            </h3>
            <p className="col-start-2 max-w-[44ch] text-[15px] leading-relaxed text-muted md:col-start-auto md:text-[17px]">{s.description}</p>
            <span aria-hidden="true" className="hidden items-center justify-end gap-2 label-mono text-[10px] text-muted md:flex">
              <RecDot size={6} className="opacity-0 transition-opacity duration-300 group-hover/svc:opacity-100" />
              {track} · {String(i + 1).padStart(2, "0")}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
