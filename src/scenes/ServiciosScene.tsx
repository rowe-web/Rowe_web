import { Button } from "@/components/ui/Button";
import { RichText } from "@/components/ui/RichText";
import { MediaFrame } from "@/components/scene/MediaFrame";
import { SceneHeader } from "@/components/scene/SceneHeader";
import type { SceneProps } from "./types";

/**
 * Escena 02 · Servicios — diseño nuevo siguiendo el sistema.
 * Dos «pistas» paralelas, WE (web) y RO (rodaje), con la misma estructura:
 * letra grande, figura, lista numerada de servicios (tabla services) y enlace.
 * Hover (o scroll en móvil): la pista activa se ilumina y la otra se apaga.
 */
export function ServiciosScene({ scene, site }: SceneProps) {
  const columns = [
    { key: "WE", label: "Web", discipline: "web" as const, href: "/web", word: "WE", caption: "Fig. 03 — Web a medida", textured: false },
    { key: "RO", label: "Rodaje", discipline: "audiovisual" as const, href: "/audiovisual", word: "RO", caption: "Fig. 04 — Rodaje", textured: true },
  ];

  return (
    <section id="servicios" data-scene="servicios" className="relative gutter-x py-[clamp(88px,13vh,140px)]">
      <SceneHeader kicker={scene.kicker} meta={["2 disciplinas", "1 equipo"]} />

      <div className="mt-12 flex flex-wrap items-end justify-between gap-8 md:mt-[9vh]">
        <h2 data-reveal="mask" className="headline text-[clamp(52px,10vw,152px)]">
          <RichText text={scene.title} />
        </h2>
        <p data-reveal className="max-w-[30ch] pb-3 text-[17px] leading-relaxed text-muted md:text-[19px]">
          {scene.body}
        </p>
      </div>

      <div data-servicios className="group/cols mt-14 grid border-t border-line md:mt-[10vh] md:grid-cols-2">
        {columns.map((col, ci) => {
          const items = site.services.filter((s) => s.discipline === col.discipline);
          return (
            <article
              key={col.key}
              data-col
              className={`flex flex-col gap-8 py-10 transition-opacity duration-500 md:py-12 md:group-hover/cols:opacity-45 md:hover:!opacity-100 ${
                ci === 0 ? "md:border-r md:border-line md:pr-[3vw]" : "border-t border-line md:border-t-0 md:pl-[3vw]"
              }`}
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex flex-col gap-3">
                  <span className="label-mono text-muted">
                    {col.key} — {col.label}
                  </span>
                  <span
                    className={`headline-serif text-[clamp(96px,30vw,140px)] leading-[0.8] md:text-[clamp(120px,13.9vw,200px)] ${
                      col.textured ? "text-textured" : "italic"
                    }`}
                    aria-hidden="true"
                  >
                    {col.word}
                  </span>
                </div>
                <figure className="w-[38%] max-w-[260px] pt-1">
                  <MediaFrame aspect="4 / 5" placeholder="[ Foto 4:5 ]" sizes="20vw" marks={12} />
                  <figcaption className="mt-2 label-mono text-[9px] text-muted">{col.caption}</figcaption>
                </figure>
              </div>

              <ol className="flex flex-col border-t border-line">
                {items.map((s, i) => (
                  <li
                    key={s.slug}
                    data-scroll-active
                    className="group/item flex items-baseline gap-5 border-b border-line py-4 transition-[padding] duration-300 ease-[var(--ease-out)] hover:pl-3.5 data-[active]:pl-3.5"
                  >
                    <span className="w-6 shrink-0 label-mono text-[10px] text-muted">{String(i + 1).padStart(2, "0")}</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-6">
                      <span className="text-[18px]">{s.title}</span>
                      <span className="text-[14px] leading-snug text-muted md:max-w-[52%] md:text-right">{s.description}</span>
                    </span>
                  </li>
                ))}
              </ol>

              <Button variant="link" href={col.href} arrow="→" className="self-start">
                {scene.cta_label || "Ver servicio"}
              </Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
