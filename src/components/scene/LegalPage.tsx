import { RichText } from "@/components/ui/RichText";
import { SceneHeader } from "@/components/scene/SceneHeader";
import type { SiteSnapshot } from "@/lib/content/types";

/** Página legal (provisional: el texto definitivo se redacta en la Fase 5 y se edita en el panel). */
export function LegalPage({ site, slug }: { site: SiteSnapshot; slug: string }) {
  const page = site.pages[slug];
  return (
    <main id="contenido" className="gutter-x pb-[14vh] pt-[clamp(120px,18vh,180px)]">
      <SceneHeader kicker="ROWE — Legal" meta={["Texto provisional · Fase 5"]} />
      <h1 data-reveal="mask" className="headline mt-12 text-[clamp(44px,11vw,64px)] md:mt-[9vh] md:text-[clamp(64px,7vw,112px)]">
        <RichText text={page?.title ?? slug} />
      </h1>
      <p data-reveal className="mt-8 max-w-[60ch] text-[17px] leading-relaxed text-muted">
        {page?.intro}
      </p>
    </main>
  );
}
