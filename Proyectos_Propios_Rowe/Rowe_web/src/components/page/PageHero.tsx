import { MediaFrame } from "@/components/scene/MediaFrame";
import { SceneHeader } from "@/components/scene/SceneHeader";
import { Timecode } from "@/components/scene/Timecode";
import { Button } from "@/components/ui/Button";
import { RichText } from "@/components/ui/RichText";
import type { CabeceraBlock } from "@/lib/content/blocks";
import type { Page, SiteSnapshot } from "@/lib/content/types";
import { getMedia } from "@/scenes/types";

/**
 * Cabecera de página interna: la «claqueta» de cada página.
 * Cabecera de escena + titular editorial (1c) + entradilla y botones; debajo, si hay
 * pie de foto o medio, un plano 2.39:1 con marcas de encuadre que se abre en cortinilla.
 */
export function PageHero({ page, block, site }: { page: Page; block: CabeceraBlock; site: SiteSnapshot }) {
  const image = getMedia(site, block.image_media_id);
  const video = getMedia(site, block.video_media_id);
  const media = video ?? image;
  const showFrame = Boolean(media || block.caption);

  return (
    <section data-page-hero className="relative gutter-x pb-[clamp(56px,9vh,110px)] pt-[clamp(120px,18vh,180px)]">
      <SceneHeader kicker={block.kicker || page.title.replace(/\*/g, "")} meta={block.meta} />

      <div className="mt-12 grid items-end gap-10 md:mt-[9vh] lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-[4vw]">
        <h1 data-reveal="mask" className="headline text-[clamp(56px,14vw,80px)] md:text-[clamp(80px,10.4vw,176px)]">
          <RichText text={page.title} />
        </h1>
        <div data-reveal className="flex flex-col gap-8 lg:pb-4">
          {page.intro && <p className="max-w-[40ch] text-[17px] leading-relaxed text-muted md:text-[19px]">{page.intro}</p>}
          {(block.cta.label || block.secondary.label) && (
            <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
              {block.cta.label && (
                <Button href={block.cta.href || "/contacto"} arrow="→">
                  {block.cta.label}
                </Button>
              )}
              {block.secondary.label && (
                <Button variant="link" href={block.secondary.href || "/contacto"} arrow="→">
                  {block.secondary.label}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {showFrame && (
        <figure className="mt-[clamp(48px,9vh,110px)]">
          <div data-reveal="wipe">
            <MediaFrame
              media={media}
              poster={video ? image : null}
              aspect="2.39 / 1"
              marks={24}
              priority
              placeholder={`[ ${block.caption || "Plano 2.39:1"} ]`}
              cursor={media?.kind === "video" ? "▶ Ver" : undefined}
            />
          </div>
          <figcaption className="mt-3 flex justify-between gap-4 label-mono text-[10px] text-muted">
            <span>{block.caption}</span>
            <span className="hidden sm:inline">2.39:1 · 25 fps</span>
            <Timecode />
          </figcaption>
        </figure>
      )}
    </section>
  );
}
