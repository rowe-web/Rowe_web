import { Button } from "@/components/ui/Button";
import { CornerMarks } from "@/components/ui/CornerMarks";
import { RichText } from "@/components/ui/RichText";
import { MediaFrame } from "@/components/scene/MediaFrame";
import { SceneHeader } from "@/components/scene/SceneHeader";
import { SceneMotion } from "@/motion/SceneMotion";
import { getMedia, type SceneProps } from "./types";

interface WebData {
  url_label?: string;
  screen_caption?: string;
  specs?: { label: string; value: string }[];
}

/**
 * Escena 03 · Desarrollo web — diseño nuevo siguiendo el sistema.
 * Izquierda: titular editorial, texto y «ficha técnica» (mono).
 * Derecha: visor (1b) con una web que se desplaza sola al hacer scroll (scrub).
 * Sin grabación subida, el visor dibuja el esqueleto de una página (no inventa imágenes).
 */
export function WebScene({ scene, site }: SceneProps<WebData>) {
  const d = scene.data;
  const screen = getMedia(site, scene.media_id);
  const poster = getMedia(site, scene.poster_id);

  return (
    <section id="web" data-scene="web" className="relative gutter-x py-[clamp(88px,13vh,140px)]">
      <SceneMotion name="web" />
      <SceneHeader kicker={scene.kicker} meta={["Diseño · Desarrollo · SEO"]} />

      <div className="mt-12 grid gap-14 md:mt-[9vh] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-[5vw]">
        <div className="flex flex-col gap-10">
          <h2 data-reveal="mask" className="headline text-[clamp(48px,12.5vw,64px)] md:text-[clamp(64px,7.2vw,112px)]">
            <RichText text={scene.title} />
          </h2>
          <p data-reveal className="max-w-[42ch] text-[17px] leading-relaxed text-muted md:text-[18px]">
            {scene.body}
          </p>
          <dl data-reveal className="flex flex-col border-t border-line">
            {(d.specs ?? []).map((s) => (
              <div key={s.label} className="flex items-baseline justify-between gap-6 border-b border-line py-3.5">
                <dt className="label-mono text-[10px] text-muted">{s.label}</dt>
                <dd className="text-right text-[15px]">{s.value}</dd>
              </div>
            ))}
          </dl>
          {scene.cta_label && (
            <Button variant="link" href={scene.cta_href || "/web"} arrow="→" className="self-start">
              {scene.cta_label}
            </Button>
          )}
        </div>

        {/* Visor */}
        <figure data-reveal="mask" className="flex flex-col gap-3 lg:pt-6">
          <div className="relative border border-line bg-monitor" data-cursor="Web">
            <div className="flex h-9 items-center justify-between border-b border-line px-4 label-mono text-[9px] text-muted md:h-10 md:text-[10px]">
              <span className="text-bone">WE — Programa</span>
              <span className="rounded-full border border-line px-3 py-0.5 normal-case tracking-normal">{d.url_label}</span>
              <span className="hidden sm:inline">1440 × 900</span>
            </div>
            <div className="relative aspect-[16/10] overflow-hidden">
              {screen ? (
                <MediaFrame media={screen} poster={poster} className="absolute inset-0" sizes="(min-width:1024px) 55vw, 100vw" />
              ) : (
                <div data-web-scroll className="absolute inset-x-0 top-0 flex flex-col gap-[3.5%] px-[7%] pt-[6%]" aria-hidden="true">
                  <WebSkeleton />
                  <WebSkeleton alt />
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-monitor to-transparent" />
            </div>
            <CornerMarks size={16} inset={-1} color="#EDEAE4" />
          </div>
          <figcaption className="flex justify-between gap-4 label-mono text-[10px] text-muted">
            <span>{d.screen_caption}</span>
            <span className="hidden sm:inline">Escritorio · Móvil</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

/** Esqueleto de página (placeholder honesto de «web en movimiento»). */
function WebSkeleton({ alt = false }: { alt?: boolean }) {
  const bar = "rounded-[2px] bg-[rgb(237_234_228/0.10)]";
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
