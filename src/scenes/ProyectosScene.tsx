import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { RichText } from "@/components/ui/RichText";
import { MediaFrame } from "@/components/scene/MediaFrame";
import { SceneHeader } from "@/components/scene/SceneHeader";
import { getSetting } from "@/lib/content/settings";
import { SceneMotion } from "@/motion/SceneMotion";
import { getMedia, type SceneProps } from "./types";

interface ProyectosData {
  all_label?: string;
  all_href?: string;
  drag_label?: string;
}

/**
 * Escena 07 · Proyectos — diseño nuevo siguiendo el sistema.
 * Carrusel horizontal de proyectos publicados (portada 2.39:1, como en el panel).
 * Escritorio: arrastrar con el ratón (cursor «Arrastra ←→»). Móvil: deslizar nativo con
 * scroll-snap; el gesto vertical sigue desplazando la página.
 */
export function ProyectosScene({ scene, site }: SceneProps<ProyectosData>) {
  const d = scene.data;
  const projects = site.projects;

  return (
    <section id="proyectos" data-scene="proyectos" className="relative py-[clamp(88px,13vh,140px)]">
      <SceneMotion name="carousel" />
      <div className="gutter-x">
        <SceneHeader kicker={scene.kicker} meta={[`${projects.length} proyectos`]} />
        <div className="mt-12 flex flex-wrap items-end justify-between gap-6 md:mt-[9vh]">
          <h2 data-reveal="mask" className="headline text-[clamp(48px,12.5vw,64px)] md:text-[clamp(64px,8.3vw,128px)]">
            <RichText text={scene.title} />
          </h2>
          <div className="flex items-center gap-8 pb-3">
            <span className="hidden label-mono text-muted md:inline">{d.drag_label}</span>
            {d.all_href && (
              <Button variant="link" href={d.all_href} arrow="→">
                {d.all_label}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div
        data-carousel
        data-cursor={d.drag_label}
        className="mt-12 flex cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain gutter-x pb-6 [scrollbar-width:none] active:cursor-grabbing md:mt-[8vh] md:gap-[2.4vw] [&::-webkit-scrollbar]:hidden"
        style={{ scrollPaddingInline: "6vw" }}
      >
        {projects.map((p, i) => (
          <Link
            key={p.slug}
            href={`/proyectos/${p.slug}`}
            data-carousel-item
            draggable={false}
            className="group/card flex w-[82vw] shrink-0 snap-start flex-col gap-4 md:w-[52vw]"
            data-cursor="Ver proyecto"
            data-scroll-active
          >
            <div className="overflow-hidden">
              <MediaFrame
                media={getMedia(site, p.cover_id)}
                aspect="2.39 / 1"
                placeholder={`[ Portada 2.39:1 · ${p.title} ]`}
                sizes="(min-width:768px) 52vw, 82vw"
                className="transition-transform duration-700 ease-[var(--ease-cut)] group-hover/card:scale-[1.035] group-data-[active]/card:scale-[1.035]"
              />
            </div>
            <div className="flex items-start justify-between gap-6 border-t border-line pt-4">
              <div className="flex items-baseline gap-4">
                <span className="label-mono text-[10px] text-muted">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[20px] leading-tight md:text-[26px]">{p.title}</span>
              </div>
              <span className="shrink-0 text-right label-mono text-[9px] leading-[1.7] text-muted md:text-[10px]">
                <span className="block">{p.category}</span>
                <span className="block">
                  {p.sector} · {p.year}
                </span>
              </span>
            </div>
          </Link>
        ))}
        {/* Hueco final para que la última tarjeta pueda alinearse */}
        <span aria-hidden="true" className="w-px shrink-0" />
      </div>

      {scene.cta_label && (
        <div className="mt-14 flex flex-col items-start gap-6 border-t border-line gutter-x pt-10 md:mt-[10vh] md:flex-row md:items-center md:justify-between">
          <p className="headline-serif text-[clamp(32px,8vw,40px)] md:text-[clamp(40px,3.9vw,56px)]">
            <RichText text={scene.cta_label} />
          </p>
          <Button href={scene.cta_href || "#hablemos"} arrow="→">
            {getSetting(site, "navigation", { cta_label: "Hablemos" }).cta_label}
          </Button>
        </div>
      )}
    </section>
  );
}
