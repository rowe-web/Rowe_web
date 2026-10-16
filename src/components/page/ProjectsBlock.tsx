import { SceneHeader } from "@/components/scene/SceneHeader";
import { Button } from "@/components/ui/Button";
import { RichText } from "@/components/ui/RichText";
import { inCategory, type ProyectosBlock } from "@/lib/content/blocks";
import type { SiteSnapshot } from "@/lib/content/types";
import { getMedia } from "@/scenes/types";
import { ProjectCard } from "./ProjectCard";

/** Proyectos relacionados de una categoría, en rejilla de 2 columnas escalonada. Sin proyectos, no se muestra. */
export function ProjectsBlock({ block, site }: { block: ProyectosBlock; site: SiteSnapshot }) {
  const projects = site.projects.filter((p) => inCategory(p.category, block.category)).slice(0, Math.max(1, block.limit || 4));
  if (!projects.length) return null;

  return (
    <section className="relative gutter-x py-[clamp(72px,11vh,130px)]">
      <SceneHeader kicker={block.kicker} meta={[`${projects.length} proyectos`]} />
      <div className="mt-12 flex flex-wrap items-end justify-between gap-6 md:mt-[8vh]">
        {block.title && (
          <h2 data-reveal="mask" className="headline text-[clamp(44px,11vw,60px)] md:text-[clamp(60px,6.9vw,112px)]">
            <RichText text={block.title} />
          </h2>
        )}
        {block.all_label && (
          <Button variant="link" href="/proyectos" arrow="→" className="pb-3">
            {block.all_label}
          </Button>
        )}
      </div>
      <div className="mt-12 grid gap-x-[4vw] gap-y-14 md:mt-[8vh] md:grid-cols-2">
        {projects.map((p, i) => (
          <div key={p.slug} data-reveal className={i % 2 === 1 ? "md:mt-[14vh]" : ""}>
            <ProjectCard project={p} index={i} cover={getMedia(site, p.cover_id)} />
          </div>
        ))}
      </div>
    </section>
  );
}
