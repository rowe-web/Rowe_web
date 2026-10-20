import Link from "next/link";
import { MediaFrame } from "@/components/scene/MediaFrame";
import type { MediaItem, Project } from "@/lib/content/types";

/**
 * Tarjeta de proyecto (mismo lenguaje que el carrusel de la escena 07): portada 2.39:1,
 * número, título y ficha mono. Hover / scroll en móvil: la portada se acerca.
 */
export function ProjectCard({
  project: p,
  index,
  cover,
  cursor = "Ver proyecto",
  sizes = "(min-width:768px) 44vw, 88vw",
  className = "",
}: {
  project: Pick<Project, "slug" | "title" | "category" | "sector" | "year" | "summary">;
  index: number;
  cover: MediaItem | null;
  cursor?: string;
  sizes?: string;
  className?: string;
}) {
  return (
    <Link href={`/proyectos/${p.slug}`} data-cursor={cursor} data-scroll-active className={`group/card flex flex-col gap-4 ${className}`}>
      <div className="overflow-hidden">
        <MediaFrame
          media={cover}
          aspect="2.39 / 1"
          placeholder={`[ Portada 2.39:1 · ${p.title} ]`}
          sizes={sizes}
          className="transition-transform duration-700 ease-[var(--ease-cut)] group-hover/card:scale-[1.035] group-data-[active]/card:scale-[1.035]"
        />
      </div>
      <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex min-w-0 items-baseline gap-4">
          <span className="label-mono text-[10px] text-muted">{String(index + 1).padStart(2, "0")}</span>
          <span className="flex min-w-0 flex-col gap-2">
            <span className="text-[20px] leading-tight md:text-[24px]">{p.title}</span>
            {p.summary && <span className="max-w-[46ch] text-[14px] leading-snug text-muted">{p.summary}</span>}
          </span>
        </div>
        <span className="shrink-0 pl-[30px] label-mono text-[9px] leading-[1.7] text-muted sm:pl-0 sm:text-right md:text-[10px]">
          <span className="sm:block">{p.category}</span>
          <span className="sm:hidden"> · </span>
          <span className="sm:block">{[p.sector, p.year].filter(Boolean).join(" · ")}</span>
        </span>
      </div>
    </Link>
  );
}
