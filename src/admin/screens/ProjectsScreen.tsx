"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { reorderProjects, setProjectFeatured } from "@/admin/actions/projects";
import { MediaThumb, useLibrary } from "@/admin/media/library";
import { useFeedback } from "@/admin/ui/feedback";
import { Card, EmptyState, PageTitle, Segmented, StatusDot } from "@/admin/ui/kit";
import { mono } from "@/admin/ui/styles";

export interface ProjectListRow {
  id: string;
  slug: string;
  title: string;
  sector: string;
  year: number | null;
  category: "Web" | "Audiovisual" | "Web + Audiovisual";
  status: "borrador" | "publicado";
  featured: boolean;
  is_placeholder: boolean;
  cover_id: string | null;
  position: number;
}

const FILTERS = ["Todos", "Web", "Audiovisual", "Web + Audiovisual"] as const;
type Filter = (typeof FILTERS)[number];

/** Proyectos · lista (ROWE Admin · Proyectos). */
export function ProjectsScreen({ projects: initial }: { projects: ProjectListRow[] }) {
  const [projects, setProjects] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setProjects(initial);
  }
  const [filter, setFilter] = useState<Filter>("Todos");
  const [dragging, setDragging] = useState<string | null>(null);
  const { byId } = useLibrary();
  const { toast } = useFeedback();
  const [, start] = useTransition();
  const rows = projects.filter((p) => filter === "Todos" || p.category === filter);

  const feature = (p: ProjectListRow) =>
    start(async () => {
      setProjects((l) => l.map((x) => (x.id === p.id ? { ...x, featured: !p.featured } : x)));
      const res = await setProjectFeatured(p.id, !p.featured);
      if (res.ok) toast(p.featured ? "Ya no es destacado" : "Marcado como destacado");
      else {
        setProjects((l) => l.map((x) => (x.id === p.id ? { ...x, featured: p.featured } : x)));
        toast(res.error, "error");
      }
    });

  const drop = (targetId: string) => {
    if (!dragging || dragging === targetId) return setDragging(null);
    const prev = projects;
    const next = projects.filter((p) => p.id !== dragging);
    next.splice(
      next.findIndex((p) => p.id === targetId),
      0,
      projects.find((p) => p.id === dragging)!,
    );
    setDragging(null);
    setProjects(next);
    start(async () => {
      const res = await reorderProjects(next.map((p) => p.id));
      if (res.ok) toast("Orden guardado en el borrador");
      else {
        setProjects(prev);
        toast(res.error, "error");
      }
    });
  };

  return (
    <div className="toast-in flex max-w-[1240px] flex-col gap-5">
      <PageTitle
        title="Proyectos"
        subtitle="Tu portfolio. Lo publicado aparece en la escena 07 y en /proyectos."
        actions={
          <Link href="/admin/proyectos/nuevo" className="flex h-[42px] items-center gap-2 rounded-full bg-bone px-5 text-[14px] font-medium text-ink transition-colors hover:bg-white">
            + Nuevo proyecto
          </Link>
        }
      />
      <Segmented label="Filtrar por categoría" value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ value: f, label: f, count: f === "Todos" ? projects.length : projects.filter((p) => p.category === f).length }))} />
      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState
            kicker="Portfolio"
            title={
              <>
                Aún no hay <em>proyectos</em>
              </>
            }
            body={filter === "Todos" ? "Añade tu primer caso: portada, reto, solución y resultado." : `No hay proyectos de «${filter}».`}
          />
        ) : (
          <ul aria-label="Proyectos">
            {rows.map((p) => (
              <li
                key={p.id}
                draggable={filter === "Todos"}
                onDragStart={() => setDragging(p.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => drop(p.id)}
                onDragEnd={() => setDragging(null)}
                className={`flex flex-wrap items-center gap-4 border-b border-line-faint px-4 py-3 transition-colors hover:bg-surface-3 ${dragging === p.id ? "opacity-40" : ""}`}
              >
                <MediaThumb media={byId(p.cover_id)} className="h-12 w-[72px] flex-none" />
                <Link href={`/admin/proyectos/${p.id}`} className="flex min-w-0 flex-[1_1_200px] flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2 text-[15px]">
                    {p.title || "Sin título"}
                    {p.is_placeholder && <span className="rounded-full border border-line-dashed px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">Ejemplo</span>}
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.06em] text-muted">
                    {[p.category, p.sector, p.year].filter(Boolean).join(" · ")}
                  </span>
                </Link>
                <span className="w-[100px]">
                  <StatusDot tone={p.status === "publicado" ? "on" : "half"} label={p.status === "publicado" ? "Publicado" : "Borrador"} />
                </span>
                <button
                  type="button"
                  onClick={() => feature(p)}
                  aria-pressed={p.featured}
                  className={`flex h-[30px] items-center rounded-full border px-3 text-[12px] transition-colors ${p.featured ? "border-bone bg-bone text-ink" : "border-line-cta text-muted hover:text-bone"}`}
                >
                  Destacado
                </button>
                <Link href={`/admin/proyectos/${p.id}`} className="flex min-h-9 items-center text-[13px] text-muted hover:text-bone">
                  Editar →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {filter === "Todos" && projects.length > 1 && <p className={`${mono} text-dim`}>Arrastra para cambiar el orden del portfolio</p>}
    </div>
  );
}
