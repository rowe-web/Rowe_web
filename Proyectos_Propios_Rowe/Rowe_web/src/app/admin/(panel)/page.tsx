import Link from "next/link";
import { requirePageUser } from "@/admin/auth";
import { delta, LEAD_STATUS, longToday, num, percent, when } from "@/admin/format";
import { Card, StatusDot } from "@/admin/ui/kit";
import { mono } from "@/admin/ui/styles";
import { siteHost } from "@/lib/site";
import { createSupabaseServer } from "@/lib/supabase/server";

type Stats = Record<string, number> & { funnel: Record<string, number> };

/** Inicio del panel (ROWE Admin · Dashboard). */
export default async function Dashboard() {
  const user = await requirePageUser();
  const supabase = await createSupabaseServer();
  const [status, stats, leads, recent, history, samples, failedMails] = await Promise.all([
    supabase.rpc("draft_status"),
    supabase.rpc("admin_stats", { p_days: 7 }),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "nuevo"),
    supabase.from("leads").select("id, name, company, need, budget_label, status, created_at").order("created_at", { ascending: false }).limit(3),
    supabase.from("audit_log").select("id, created_at, actor_name, summary").order("id", { ascending: false }).limit(4),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("is_placeholder", true).eq("status", "publicado"),
    user.role === "admin" ? supabase.from("email_outbox").select("id", { count: "exact", head: true }).in("status", ["failed", "dead"]) : Promise.resolve({ count: 0 }),
  ]);

  const st = status.data as { dirty: boolean; version: number; published_at: string; published_by: string; last_change_at: string; last_change_by: string } | null;
  const s = (stats.data ?? { funnel: {} }) as Stats;
  const conversion = s.uniques ? (s.lead_sessions / s.uniques) * 100 : 0;
  const conversionPrev = s.uniques_prev ? (s.lead_sessions_prev / s.uniques_prev) * 100 : 0;
  const firstName = user.name.split(" ")[0] || "equipo";

  const kpis = [
    { label: "Visitas · 7 días", value: num(s.visits ?? 0), delta: delta(s.visits ?? 0, s.visits_prev ?? 0, "periodo"), href: "/admin/estadisticas" },
    { label: "Mensajes nuevos", value: num(leads.count ?? 0), delta: "Respóndelos en menos de 24 h", href: "/admin/mensajes?estado=nuevo" },
    { label: "Conversión", value: percent(conversion), delta: conversionPrev ? `${conversion >= conversionPrev ? "+" : "−"}${Math.abs(conversion - conversionPrev).toFixed(1).replace(".", ",")} pts` : "Visitas que acaban en mensaje", href: "/admin/estadisticas" },
    { label: "Presupuestos calculados", value: num(s.quote_sessions ?? 0), delta: `${num(s.quotes_saved ?? 0)} guardados (PDF o mensaje)`, href: "/admin/estadisticas" },
  ];

  return (
    <div className="toast-in flex max-w-[1240px] flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <span className={`${mono} text-muted`}>{longToday()}</span>
        <h1 className="headline-serif text-[44px] leading-none">
          Hola, <em>{firstName}.</em>
        </h1>
      </div>

      <Card className="flex flex-wrap items-center gap-x-7 gap-y-2.5">
        <span className="flex items-center gap-2 text-[14px]">
          <span className="h-2 w-2 rounded-full bg-bone" /> Web publicada {st?.version ? `· versión ${st.version}` : ""}
        </span>
        <span className="font-mono text-[11px] tracking-[0.08em] text-muted">{siteHost}</span>
        <span className="text-[14px] text-muted">{st?.last_change_at ? `Último cambio ${when(st.last_change_at).toLowerCase()} · ${st.last_change_by}` : "Sin cambios todavía"}</span>
        {st?.dirty && <span className={`${mono} text-bone`}>Tienes cambios sin publicar</span>}
        <a href="/" target="_blank" rel="noopener" className="ml-auto border-b border-line-cta text-[14px]">
          Ver web ↗
        </a>
      </Card>

      {((samples.count ?? 0) > 0 || (failedMails.count ?? 0) > 0) && (
        <div className="flex flex-col gap-2">
          {(samples.count ?? 0) > 0 && (
            <Link href="/admin/proyectos" className="rounded-lg border border-[rgb(255_59_31/0.45)] px-5 py-3.5 text-[14px] hover:border-rec">
              <span className="text-rec">●</span> Hay {samples.count} proyecto{samples.count === 1 ? "" : "s"} de ejemplo del diseño publicado{samples.count === 1 ? "" : "s"}. Sustitúyelos por trabajos reales antes del lanzamiento →
            </Link>
          )}
          {(failedMails.count ?? 0) > 0 && (
            <Link href="/admin/mensajes" className="rounded-lg border border-[rgb(255_59_31/0.45)] px-5 py-3.5 text-[14px] hover:border-rec">
              <span className="text-rec">●</span> {failedMails.count} aviso{failedMails.count === 1 ? "" : "s"} por email no se ha{failedMails.count === 1 ? "" : "n"} podido enviar. Los mensajes están guardados; revisa la configuración del email →
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface px-5 py-[18px] transition-colors hover:border-[rgb(237_234_228/0.35)]">
            <span className={`${mono} text-muted`}>{k.label}</span>
            <span className="text-[38px] font-light leading-none tracking-[-0.02em]">{k.value}</span>
            <span className="font-mono text-[10px] tracking-[0.06em] text-muted">{k.delta}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
        <Card padded={false}>
          <div className="flex items-center justify-between border-b border-line-soft px-5 py-4">
            <span className="text-[15px]">Últimos mensajes</span>
            <Link href="/admin/mensajes" className="text-[13px] text-muted hover:text-bone">
              Ver todos →
            </Link>
          </div>
          {(recent.data ?? []).length === 0 && <p className="px-5 py-6 text-[14px] text-muted">Aún no ha llegado ningún mensaje.</p>}
          {(recent.data ?? []).map((l) => {
            const stt = LEAD_STATUS[l.status as keyof typeof LEAD_STATUS];
            return (
              <Link key={l.id} href={`/admin/mensajes?lead=${l.id}`} className="flex items-center gap-3.5 border-b border-line-faint px-5 py-3.5 hover:bg-surface-3">
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[15px]">
                    {l.name} {l.company && <span className="text-muted">· {l.company}</span>}
                  </span>
                  <span className="truncate font-mono text-[10px] tracking-[0.06em] text-muted">
                    {l.need} · {l.budget_label || "Sin presupuesto"} · {when(l.created_at)}
                  </span>
                </span>
                <StatusDot tone={stt.tone} label={stt.label} />
              </Link>
            );
          })}
        </Card>
        <Card padded={false}>
          <div className="flex items-center justify-between border-b border-line-soft px-5 py-4">
            <span className="text-[15px]">Últimos cambios</span>
            <Link href="/admin/historial" className="text-[13px] text-muted hover:text-bone">
              Historial →
            </Link>
          </div>
          {(history.data ?? []).map((h) => (
            <div key={h.id} className="flex items-baseline gap-3.5 border-b border-line-faint px-5 py-3.5">
              <span className="w-[86px] flex-none font-mono text-[10px] text-muted">{when(h.created_at)}</span>
              <span className="flex-1 text-[14px] leading-snug">{h.summary}</span>
              <span className={`${mono} text-muted`}>{h.actor_name.split(" ")[0]}</span>
            </div>
          ))}
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <span className={`${mono} text-muted`}>Accesos rápidos</span>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          {[
            { title: "Editar el Hero", desc: "Titular, subtítulo y vídeo de portada.", href: "/admin/textos?escena=hero" },
            { title: "Nuevo proyecto", desc: "Añade un caso al portfolio.", href: "/admin/proyectos/nuevo" },
            ...(user.role === "admin" ? [{ title: "Ajustar precios", desc: "Rangos del configurador.", href: "/admin/precios" }] : []),
            { title: "Subir medios", desc: "Fotos y vídeos para la web.", href: "/admin/medios" },
          ].map((q) => (
            <Link key={q.href} href={q.href} className="flex items-start justify-between gap-3 rounded-lg border border-line px-5 py-[18px] transition-colors hover:border-[rgb(237_234_228/0.35)] hover:bg-surface">
              <span className="flex flex-col gap-1.5">
                <span className="text-[15px]">{q.title}</span>
                <span className="text-[13px] leading-snug text-muted">{q.desc}</span>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
