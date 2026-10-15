import { RichText } from "@/components/ui/RichText";
import { SceneHeader } from "@/components/scene/SceneHeader";
import type { SiteSnapshot } from "@/lib/content/types";
import { sceneRegistry } from "@/scenes/registry";

/**
 * Página interna PROVISIONAL (Fase 2): cabecera con el título de la página y las
 * escenas relacionadas. Sirve para probar navegación, cortinilla y scroll.
 * Su diseño definitivo se hace en la Fase 5.
 */
export function ProvisionalPage({ site, slug, scenes }: { site: SiteSnapshot; slug: string; scenes: string[] }) {
  const page = site.pages[slug];
  return (
    <main id="contenido">
      <section className="gutter-x pb-[6vh] pt-[clamp(120px,18vh,180px)]">
        <SceneHeader kicker={`ROWE — ${slug}`} meta={["Página provisional · diseño en Fase 5"]} />
        {page && (
          <>
            <h1 data-reveal="mask" className="headline mt-12 text-[clamp(52px,12vw,72px)] md:mt-[9vh] md:text-[clamp(72px,10vw,152px)]">
              <RichText text={page.title} />
            </h1>
            <p data-reveal className="mt-8 max-w-[44ch] text-[17px] leading-relaxed text-muted md:text-[19px]">
              {page.intro}
            </p>
          </>
        )}
      </section>
      {scenes.map((key) => {
        const scene = site.scenes.find((s) => s.key === key);
        const Scene = sceneRegistry[key];
        return scene && Scene ? <Scene key={key} scene={scene} site={site} /> : null;
      })}
    </main>
  );
}
