import { pageBlocks, type CabeceraBlock, type PageBlock } from "@/lib/content/blocks";
import type { Page, SiteSnapshot } from "@/lib/content/types";
import { getMedia } from "@/scenes/types";
import { sceneRegistry } from "@/scenes/registry";
import { ClosingBlock } from "./ClosingBlock";
import { ContactBlock } from "./ContactBlock";
import { FaqBlock } from "./FaqBlock";
import { IncludesBlock } from "./IncludesBlock";
import { PageHero } from "./PageHero";
import { ProjectsBlock } from "./ProjectsBlock";
import { ProjectsIndex } from "./ProjectsIndex";
import { ServicesBlock } from "./ServicesBlock";

const DEFAULT_HERO: CabeceraBlock = { type: "cabecera", kicker: "", meta: [], image_media_id: null, video_media_id: null, caption: "", cta: { label: "", href: "" }, secondary: { label: "", href: "" } };

/**
 * Página interna montada con sus secciones (Ajustes → Páginas y legal), en el orden del panel.
 * Si la página no tiene cabecera, se pone una con su título y entradilla.
 */
export function PageBlocks({ page, site }: { page: Page; site: SiteSnapshot }) {
  const blocks = pageBlocks(page.blocks);
  const withHero: PageBlock[] = blocks.some((b) => b.type === "cabecera") ? blocks : [DEFAULT_HERO, ...blocks];
  return (
    <main id="contenido">
      {withHero.map((b, i) => (
        <Block key={i} block={b} page={page} site={site} />
      ))}
    </main>
  );
}

function Block({ block, page, site }: { block: PageBlock; page: Page; site: SiteSnapshot }) {
  switch (block.type) {
    case "cabecera":
      return <PageHero page={page} block={block} site={site} />;
    case "servicios":
      return <ServicesBlock block={block} site={site} />;
    case "incluye":
      return <IncludesBlock block={block} />;
    case "proyectos":
      return <ProjectsBlock block={block} site={site} />;
    case "preguntas":
      return <FaqBlock block={block} />;
    case "cierre":
      return <ClosingBlock block={block} />;
    case "contacto":
      return <ContactBlock block={block} site={site} />;
    case "listado":
      return (
        <ProjectsIndex
          allLabel={block.all_label}
          emptyText={block.empty_text}
          cursor={block.cta_label}
          items={site.projects.map((p) => ({ slug: p.slug, title: p.title, category: p.category, sector: p.sector, year: p.year, summary: p.summary, cover: getMedia(site, p.cover_id) }))}
        />
      );
    case "escena": {
      const scene = site.scenes.find((s) => s.key === block.key);
      const Scene = sceneRegistry[block.key];
      if (!scene || !Scene) return null;
      // En su propia página, el botón «Ver servicio» que lleva a esta misma página sobra
      const self = scene.cta_href.replace(/\/$/, "") === `/${page.slug}`;
      return <Scene scene={{ ...scene, kicker: block.kicker || scene.kicker, cta_label: self ? "" : scene.cta_label }} site={site} />;
    }
  }
}
