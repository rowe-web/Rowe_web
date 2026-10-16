import { RichText } from "@/components/ui/RichText";
import { SceneHeader } from "@/components/scene/SceneHeader";
import type { SiteSnapshot } from "@/lib/content/types";

/** Página legal (provisional: el texto definitivo se redacta en la Fase 5 y se edita en el panel). */
export function LegalPage({ site, slug }: { site: SiteSnapshot; slug: string }) {
  const page = site.pages[slug];
  // Apartados editables desde Ajustes → Páginas y legal
  const blocks = (Array.isArray(page?.blocks) ? page.blocks : []).filter(
    (b): b is { title: string; body: string } => !!b && typeof b === "object" && typeof (b as { body?: unknown }).body === "string",
  );
  return (
    <main id="contenido" className="gutter-x pb-[14vh] pt-[clamp(120px,18vh,180px)]">
      <SceneHeader kicker="ROWE — Legal" meta={["Texto provisional · Fase 5"]} />
      <h1 data-reveal="mask" className="headline mt-12 text-[clamp(44px,11vw,64px)] md:mt-[9vh] md:text-[clamp(64px,7vw,112px)]">
        <RichText text={page?.title ?? slug} />
      </h1>
      <p data-reveal className="mt-8 max-w-[60ch] whitespace-pre-line text-[17px] leading-relaxed text-muted">
        {page?.intro}
      </p>
      {blocks.length > 0 && (
        <div className="mt-[8vh] flex max-w-[68ch] flex-col gap-10">
          {blocks.map((b, i) => (
            <section key={i} data-reveal className="flex flex-col gap-3">
              {b.title && <h2 className="text-[20px] leading-snug">{b.title}</h2>}
              <p className="whitespace-pre-line text-[16px] leading-relaxed text-muted">{b.body}</p>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
