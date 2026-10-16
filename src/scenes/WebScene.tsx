import { Button } from "@/components/ui/Button";
import { RichText } from "@/components/ui/RichText";
import { SceneHeader } from "@/components/scene/SceneHeader";
import { SceneMotion } from "@/motion/SceneMotion";
import { getMedia, type SceneProps } from "./types";
import { WebPreview } from "./WebPreview";

interface WebData {
  url_label?: string;
  screen_caption?: string;
  specs?: { label: string; value: string }[];
  view_desktop?: string;
  view_mobile?: string;
  mobile_media_id?: string | null;
}

/**
 * Escena 03 · Desarrollo web — diseño nuevo siguiendo el sistema.
 * Izquierda: titular editorial, texto y «ficha técnica» (mono).
 * Derecha: visor (1b) con una web que se desplaza sola al hacer scroll (scrub), con selector
 * Escritorio / Móvil (smartphone con el scroll sincronizado). Ver WebPreview.
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

        {/* Visor con selector Escritorio / Móvil */}
        <WebPreview
          screen={screen}
          poster={poster}
          mobile={getMedia(site, d.mobile_media_id)}
          urlLabel={d.url_label ?? ""}
          caption={d.screen_caption ?? ""}
          labels={{ desktop: d.view_desktop || "Escritorio", mobile: d.view_mobile || "Móvil" }}
        />
      </div>
    </section>
  );
}
