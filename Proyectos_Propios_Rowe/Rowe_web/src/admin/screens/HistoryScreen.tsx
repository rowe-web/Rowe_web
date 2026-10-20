"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { restoreChange } from "@/admin/actions/history";
import { republishVersion } from "@/admin/actions/publish";
import { dayLabel, time, when } from "@/admin/format";
import { useFeedback } from "@/admin/ui/feedback";
import { humanize } from "@/admin/ui/JsonFields";
import { AButton, Card, EmptyState, PageTitle, Segmented } from "@/admin/ui/kit";
import { mono } from "@/admin/ui/styles";

export interface AuditRow {
  id: number;
  table_name: string;
  action: "insert" | "update" | "delete" | "publish" | "restore";
  category: string;
  summary: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  actor_name: string;
  created_at: string;
}

export interface ReleaseRow {
  version: number;
  note: string;
  published_at: string;
  who: string;
}

const FILTERS = ["Todo", "Textos", "Proyectos", "Precios", "Medios", "Ajustes", "Publicación"] as const;
type Filter = (typeof FILTERS)[number];
const RESTORABLE = new Set(["scenes", "services", "pages", "site_settings", "projects", "config_sections", "config_options"]);
const META = new Set(["id", "created_at", "updated_at", "updated_by", "position"]);
const FIELD: Record<string, string> = { price_min: "Mínimo", price_max: "Máximo", visible: "Visible", status: "Estado", featured: "Destacado", cover_id: "Portada", video_id: "Vídeo", media_id: "Vídeo / imagen", poster_id: "Imagen de reserva", data: "Contenido avanzado", value: "Valores", blocks: "Bloques", client_url: "Web del cliente", challenge: "Reto", solution: "Solución", result: "Resultado", summary: "Resumen", weeks_min: "Semanas mín.", weeks_max: "Semanas máx." };

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "(vacío)";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "string") return v.length > 160 ? `${v.slice(0, 160)}…` : v;
  if (typeof v === "number") return String(v);
  const s = JSON.stringify(v);
  return s.length > 120 ? `${s.slice(0, 120)}…` : s;
}

/** Campos que cambiaron en una edición (para el «antes / después»). */
function diff(r: AuditRow) {
  if (!r.before || !r.after) return [];
  return Object.keys(r.after)
    .filter((k) => !META.has(k) && JSON.stringify(r.before![k]) !== JSON.stringify(r.after![k]))
    .map((k) => ({ key: k, label: FIELD[k] ?? humanize(k), from: show(r.before![k]), to: show(r.after![k]) }));
}

/** Historial (ROWE Admin · Historial). */
export function HistoryScreen({ rows, releases, isAdmin, liveVersion, more }: { rows: AuditRow[]; releases: ReleaseRow[]; isAdmin: boolean; liveVersion: number | null; more: string | null }) {
  const [filter, setFilter] = useState<Filter>("Todo");
  const [tab, setTab] = useState<"cambios" | "versiones">("cambios");
  const { toast, confirm } = useFeedback();
  const [busy, start] = useTransition();
  const list = rows.filter((r) => filter === "Todo" || r.category === filter);
  const days: { day: string; items: AuditRow[] }[] = [];
  for (const r of list) {
    const day = dayLabel(r.created_at);
    if (days.at(-1)?.day !== day) days.push({ day, items: [] });
    days.at(-1)!.items.push(r);
  }

  const canRestore = (r: AuditRow) => RESTORABLE.has(r.table_name) && (isAdmin || !r.table_name.startsWith("config_"));

  const restore = async (r: AuditRow) => {
    const d = diff(r);
    const body =
      r.action === "insert" || (r.action === "restore" && !r.before)
        ? "Se eliminará lo que se creó en este cambio. Quedará pendiente de publicar."
        : r.action === "delete" || (r.action === "restore" && !r.after)
          ? "Se recuperará lo que se eliminó. Quedará pendiente de publicar."
          : d.length === 1
            ? `«${d[0].label}» volverá a «${d[0].from}». El cambio quedará pendiente de publicar.`
            : "Se recuperará el estado anterior a este cambio. Quedará pendiente de publicar.";
    if (!(await confirm({ title: "¿Restaurar esta versión?", body, cta: "Restaurar" }))) return;
    start(async () => {
      const res = await restoreChange(r.id);
      toast(res.ok ? "Versión restaurada · pendiente de publicar" : res.error, res.ok ? "ok" : "error");
    });
  };

  const republish = async (v: ReleaseRow) => {
    const ok = await confirm({
      title: `¿Volver a publicar la versión ${v.version}?`,
      body: "La web mostrará al momento el contenido de esa versión. Tu borrador actual no cambia: si después publicas, se publicará el borrador.",
      cta: "Volver a publicar",
    });
    if (!ok) return;
    start(async () => {
      const res = await republishVersion(v.version);
      toast(res.ok ? `La web vuelve a mostrar la versión ${v.version}` : res.error, res.ok ? "ok" : "error");
    });
  };

  return (
    <div className="toast-in flex max-w-[960px] flex-col gap-5">
      <PageTitle title="Historial" subtitle="Cada cambio queda registrado. Puedes restaurar cualquier versión anterior." />
      <Segmented
        label="Vista"
        value={tab}
        onChange={setTab}
        options={[
          { value: "cambios", label: "Cambios" },
          { value: "versiones", label: "Versiones publicadas", count: releases.length },
        ]}
      />

      {tab === "cambios" ? (
        <>
          <Segmented label="Filtrar" value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ value: f, label: f }))} />
          {days.length === 0 && (
            <Card padded={false}>
              <EmptyState kicker="Historial" title={<>Sin <em>cambios</em></>} body={filter === "Todo" ? "Aún no se ha cambiado nada." : `No hay cambios de «${filter}» en este periodo.`} />
            </Card>
          )}
          {days.map((g) => (
            <div key={g.day} className="flex flex-col gap-2.5">
              <span className={`${mono} text-muted`}>{g.day}</span>
              <Card padded={false}>
                {g.items.map((h) => {
                  const d = diff(h);
                  return (
                    <div key={h.id} className="flex flex-wrap items-start gap-4 border-b border-line-faint px-[18px] py-4">
                      <span className="w-11 flex-none pt-0.5 font-mono text-[11px] text-muted">{time(h.created_at)}</span>
                      <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2">
                        <span className="text-[14px] leading-normal">
                          <span className="text-muted">{h.actor_name} ·</span> {h.summary}
                          <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.1em] text-dim">{h.category}</span>
                        </span>
                        {d.length > 0 && (
                          <div className="flex flex-col gap-2 rounded-md bg-ink px-3 py-2.5 text-[13px] leading-normal">
                            {d.slice(0, 4).map((x) => (
                              <div key={x.key} className="flex flex-col gap-1">
                                {d.length > 1 && <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-dim">{x.label}</span>}
                                <span className="break-words text-dim line-through">{x.from}</span>
                                <span className="break-words">{x.to}</span>
                              </div>
                            ))}
                            {d.length > 4 && <span className="text-[12px] text-muted">y {d.length - 4} campos más</span>}
                          </div>
                        )}
                      </div>
                      {canRestore(h) && (
                        <AButton size="sm" onClick={() => restore(h)} disabled={busy} className="!h-8 !px-3 !text-[12px]">
                          Restaurar
                        </AButton>
                      )}
                    </div>
                  );
                })}
              </Card>
            </div>
          ))}
          {more && (
            <Link href={more} className="self-start border-b border-line-cta text-[14px]">
              Ver cambios más antiguos
            </Link>
          )}
        </>
      ) : (
        <Card padded={false}>
          {releases.length === 0 && <EmptyState kicker="Publicación" title={<>Aún no hay <em>versiones</em></>} body="Cuando publiques, cada versión aparecerá aquí." />}
          {releases.map((v) => (
            <div key={v.version} className="flex flex-wrap items-center gap-4 border-b border-line-faint px-[18px] py-4">
              <span className="w-12 flex-none font-mono text-[13px]">v{v.version}</span>
              <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
                <span className="text-[14px]">{v.note || "Publicación"}</span>
                <span className="font-mono text-[10px] tracking-[0.06em] text-muted">
                  {when(v.published_at)} · {v.who}
                </span>
              </div>
              {v.version === liveVersion ? (
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-bone">
                  <span className="h-[7px] w-[7px] rounded-full bg-rec" /> En la web
                </span>
              ) : (
                isAdmin && (
                  <AButton size="sm" onClick={() => republish(v)} disabled={busy} className="!h-8 !px-3 !text-[12px]">
                    Volver a publicar
                  </AButton>
                )
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
