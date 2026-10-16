"use client";

import { useState } from "react";
import { inCategory } from "@/lib/content/blocks";
import type { MediaItem, Project } from "@/lib/content/types";
import { useMotionOptional } from "@/motion/MotionProvider";
import { ProjectCard } from "./ProjectCard";

type Item = Pick<Project, "slug" | "title" | "category" | "sector" | "year" | "summary"> & { cover: MediaItem | null };

const FILTERS = ["Web", "Audiovisual"] as const;

/**
 * Listado de /proyectos con filtro por categoría («Web + Audiovisual» entra en los dos).
 * Las tarjetas no se desmontan al filtrar (se ocultan): los revelados ya hechos se
 * conservan y el scroll se recalcula una sola vez.
 */
export function ProjectsIndex({ items, allLabel, emptyText, cursor }: { items: Item[]; allLabel: string; emptyText: string; cursor: string }) {
  const [filter, setFilter] = useState("");
  const motion = useMotionOptional();
  const visible = items.filter((p) => inCategory(p.category, filter));

  const choose = (f: string) => {
    setFilter(f);
    // Tras pintar el filtro nuevo: la altura de la página cambia
    requestAnimationFrame(() => motion?.refresh());
  };

  const options = [{ value: "", label: allLabel || "Todos" }, ...FILTERS.map((f) => ({ value: f, label: f }))];
  // Posición de cada tarjeta visible (numeración y escalonado de la rejilla)
  const order = new Map(visible.map((p, i) => [p.slug, i]));

  return (
    <section className="relative gutter-x pb-[clamp(72px,11vh,130px)]">
      <div role="group" aria-label="Filtrar proyectos por categoría" className="flex flex-wrap gap-2 border-t border-line pt-6">
        {options.map((o) => {
          const count = items.filter((p) => inCategory(p.category, o.value)).length;
          const active = filter === o.value;
          return (
            <button
              key={o.value || "all"}
              type="button"
              aria-pressed={active}
              onClick={() => choose(o.value)}
              className={`flex h-10 items-center gap-2 rounded-full border px-4 label-mono text-[10px] transition-colors duration-300 ${
                active ? "border-bone bg-bone text-ink" : "border-line-cta text-muted hover:border-bone hover:text-bone"
              }`}
            >
              {o.label}
              <span className={active ? "text-ink/60" : "text-dim"}>{count}</span>
            </button>
          );
        })}
      </div>

      <p className="sr-only" aria-live="polite">
        {visible.length} proyectos
      </p>

      {visible.length === 0 && <p className="mt-16 text-[17px] text-muted">{emptyText}</p>}

      <div className="mt-12 grid gap-x-[4vw] gap-y-14 md:mt-[8vh] md:grid-cols-2">
        {items.map((p) => {
          const i = order.get(p.slug);
          return (
            <div key={p.slug} data-reveal hidden={i === undefined} className={i !== undefined && i % 2 === 1 ? "md:mt-[14vh]" : ""}>
              <ProjectCard project={p} index={i ?? 0} cover={p.cover} cursor={cursor} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
