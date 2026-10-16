"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { delta, duration, num, percent } from "@/admin/format";
import { Card, PageTitle, Segmented } from "@/admin/ui/kit";
import { mono } from "@/admin/ui/styles";

export interface StatsData {
  unit: "day" | "month";
  visits: number;
  visits_prev: number;
  uniques: number;
  uniques_prev: number;
  avg_seconds: number;
  avg_seconds_prev: number;
  lead_sessions: number;
  lead_sessions_prev: number;
  bars: { slot: string; visits: number }[];
  funnel: { visits: number; video: number; config: number; lead: number };
  sources: { label: string; count: number }[];
  pages: { path: string; count: number }[];
}

const PAGE_NAMES: Record<string, string> = {
  "/": "Home",
  "/web": "Desarrollo web",
  "/audiovisual": "Producción audiovisual",
  "/proyectos": "Proyectos",
  "/contacto": "Contacto",
};

/** Estadísticas (ROWE Admin · Estadísticas). Analítica propia, solo con consentimiento. */
export function StatsScreen({ period, data, error }: { period: "7d" | "30d" | "12m"; data: StatsData | null; error: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const label = period === "7d" ? "semana" : period === "30d" ? "mes" : "año";
  const d = data;

  const conv = d && d.uniques ? (d.lead_sessions / d.uniques) * 100 : 0;
  const convPrev = d && d.uniques_prev ? (d.lead_sessions_prev / d.uniques_prev) * 100 : 0;
  const kpis = d
    ? [
        { label: "Visitas", value: num(d.visits), delta: delta(d.visits, d.visits_prev, label) },
        { label: "Visitantes únicos", value: num(d.uniques), delta: delta(d.uniques, d.uniques_prev, label) },
        { label: "Tiempo medio", value: duration(d.avg_seconds), delta: d.avg_seconds_prev ? `${d.avg_seconds >= d.avg_seconds_prev ? "+" : "−"}${duration(Math.abs(d.avg_seconds - d.avg_seconds_prev))}` : "Sin datos previos" },
        { label: "Conversión", value: percent(conv), delta: convPrev ? `${conv >= convPrev ? "+" : "−"}${Math.abs(conv - convPrev).toFixed(1).replace(".", ",")} pts` : "Visitas que acaban en mensaje" },
      ]
    : [];
  const maxBar = Math.max(1, ...(d?.bars ?? []).map((b) => b.visits));
  const slotLabel = (iso: string) => {
    const dt = new Date(iso);
    return d?.unit === "month"
      ? dt.toLocaleDateString("es-ES", { month: "short", timeZone: "UTC" }).replace(".", "").slice(0, 3)
      : period === "7d"
        ? dt.toLocaleDateString("es-ES", { weekday: "short", timeZone: "UTC" }).slice(0, 1).toUpperCase()
        : String(dt.getUTCDate());
  };
  const funnel = d
    ? ([
        ["Visitas", d.funnel.visits],
        ["Vieron un vídeo", d.funnel.video],
        ["Abrieron el configurador", d.funnel.config],
        ["Enviaron solicitud", d.funnel.lead],
      ] as const)
    : [];
  const srcTotal = (d?.sources ?? []).reduce((a, s) => a + s.count, 0) || 1;
  const srcMax = Math.max(1, ...(d?.sources ?? []).map((s) => s.count));

  return (
    <div className={`toast-in flex max-w-[1240px] flex-col gap-5 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <PageTitle
        title="Estadísticas"
        subtitle="Cómo llega la gente a la web y cuántos acaban contactando."
        actions={
          <Segmented
            label="Periodo"
            value={period}
            onChange={(v) => start(() => router.push(`/admin/estadisticas?periodo=${v}`))}
            options={[
              { value: "7d", label: "7 días" },
              { value: "30d", label: "30 días" },
              { value: "12m", label: "12 meses" },
            ]}
          />
        }
      />
      {error && <p role="alert" className="rounded-lg border border-rec px-4 py-3 text-[14px] text-rec">{error}</p>}
      <p className="text-[13px] text-muted">Solo cuentan las visitas que aceptan la analítica en el banner de cookies (sin cookies de terceros). Los mensajes se cuentan siempre.</p>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="flex flex-col gap-2.5">
            <span className={`${mono} text-muted`}>{k.label}</span>
            <span className="text-[34px] font-light leading-none tracking-[-0.02em]">{k.value}</span>
            <span className="font-mono text-[10px] text-muted">{k.delta}</span>
          </Card>
        ))}
      </div>

      <Card className="flex flex-col gap-[18px]">
        <div className="flex justify-between">
          <span className="text-[15px]">Visitas</span>
          <span className={`${mono} text-muted max-sm:hidden`}>Pasa el ratón por cada barra</span>
        </div>
        <div className="flex h-[220px] items-stretch gap-[clamp(3px,0.8vw,12px)]" role="img" aria-label={`Visitas por ${d?.unit === "month" ? "mes" : "día"}`}>
          {(d?.bars ?? []).map((b) => (
            <div key={b.slot} className="group flex min-w-0 flex-1 flex-col gap-2" title={`${num(b.visits)} visitas`}>
              <div className="relative flex flex-1 flex-col justify-end border-b border-line">
                <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[10px] text-bone opacity-0 transition-opacity group-hover:opacity-100">{num(b.visits)}</span>
                <div className="bg-ghost transition-[height,background-color] duration-700 ease-[var(--ease-cut)] group-hover:bg-bone" style={{ height: `${Math.max(1, (b.visits / maxBar) * 100)}%` }} />
              </div>
              <span className="text-center font-mono text-[9px] text-muted">{slotLabel(b.slot)}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[15px]">Ecosistema</span>
            <span className="text-[13px] text-muted">Del vídeo al contacto.</span>
          </div>
          {funnel.map(([l, v]) => {
            const pct = d?.funnel.visits ? (v / d.funnel.visits) * 100 : 0;
            return (
              <div key={l} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[14px]">
                  <span>{l}</span>
                  <span className="font-mono text-[12px]">
                    {num(v)} <span className="text-muted">· {percent(pct)}</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-[3px] bg-surface-2">
                  <div className="h-full rounded-[3px] bg-bone transition-[width] duration-700 ease-[var(--ease-cut)]" style={{ width: `${Math.max(1.5, pct)}%` }} />
                </div>
              </div>
            );
          })}
        </Card>
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[15px]">De dónde llegan</span>
            <span className="text-[13px] text-muted">Origen de las visitas.</span>
          </div>
          {(d?.sources ?? []).length === 0 && <span className="text-[14px] text-muted">Aún no hay datos.</span>}
          {(d?.sources ?? []).map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="w-[90px] text-[14px]">{s.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-surface-2">
                <div className="h-full rounded-[3px] bg-muted" style={{ width: `${(s.count / srcMax) * 100}%` }} />
              </div>
              <span className="w-12 text-right font-mono text-[12px]">{Math.round((s.count / srcTotal) * 100)} %</span>
            </div>
          ))}
        </Card>
      </div>

      <Card padded={false}>
        <div className="border-b border-line-soft px-5 py-4 text-[15px]">Páginas más vistas</div>
        {(d?.pages ?? []).length === 0 && <p className="px-5 py-5 text-[14px] text-muted">Aún no hay datos.</p>}
        {(d?.pages ?? []).map((p) => (
          <div key={p.path} className="flex items-center gap-4 border-b border-line-faint px-5 py-3">
            <span className="w-[140px] flex-none truncate font-mono text-[11px] text-muted">{p.path}</span>
            <span className="min-w-0 flex-1 text-[14px]">{PAGE_NAMES[p.path] ?? (p.path.startsWith("/proyectos/") ? "Proyecto" : "Otra página")}</span>
            <span className="font-mono text-[12px]">{num(p.count)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
