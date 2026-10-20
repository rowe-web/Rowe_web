import type { Metadata } from "next";
import { requirePageUser } from "@/admin/auth";
import { LeadsScreen, type LeadRow } from "@/admin/screens/LeadsScreen";
import { getHablemosSettings } from "@/features/hablemos/settings";
import { loadSite } from "@/lib/content/site";
import { mailSender } from "@/lib/email/transport";
import { adminClient } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mensajes" };

export default async function MensajesPage({ searchParams }: PageProps<"/admin/mensajes">) {
  const user = await requirePageUser();
  const sp = await searchParams;
  const supabase = await createSupabaseServer();
  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, created_at, origin, need, sector, budget_label, message, name, company, email, phone, city, status, notes, quote_id, source, quotes(number, items)")
    .order("created_at", { ascending: false })
    .limit(500);

  // Estado de los avisos por email (tabla interna: se lee en el servidor tras comprobar el acceso)
  const ids = (leads ?? []).map((l) => l.id);
  const mails = ids.length && user.role
    ? ((await adminClient().from("email_outbox").select("lead_id, status, attempts, last_error, sent_at").in("lead_id", ids).eq("template", "new-lead")).data ?? [])
    : [];
  const mailBy = new Map(mails.map((m) => [m.lead_id, m]));

  // Respuestas enviadas desde el panel (RLS: solo el equipo las lee)
  const { data: replies } = ids.length
    ? await supabase.from("lead_replies").select("id, lead_id, created_at, sent_by_name, from_email, subject, body, status, error").in("lead_id", ids).order("created_at", { ascending: true })
    : { data: [] };
  const repliesBy = new Map<string, LeadRow["replies"]>();
  for (const r of replies ?? []) repliesBy.set(r.lead_id, [...(repliesBy.get(r.lead_id) ?? []), r]);

  // Respuestas de los clientes por email (leídas del buzón de ROWE)
  const { data: inbound } = ids.length
    ? await supabase.from("lead_inbound").select("id, lead_id, received_at, from_email, from_name, subject, body, full_text, attachments, matched_by, seen_at").in("lead_id", ids).order("received_at", { ascending: true })
    : { data: [] };
  const inboundBy = new Map<string, LeadRow["inbound"]>();
  for (const r of inbound ?? []) inboundBy.set(r.lead_id, [...(inboundBy.get(r.lead_id) ?? []), r]);

  const rows: LeadRow[] = (leads ?? []).map((l) => ({
    ...l,
    quote: (Array.isArray(l.quotes) ? l.quotes[0] : l.quotes) as LeadRow["quote"],
    mail: mailBy.get(l.id) ?? null,
    replies: repliesBy.get(l.id) ?? [],
    inbound: inboundBy.get(l.id) ?? [],
  }));

  const site = await loadSite();
  const needs = getHablemosSettings(site).needs.map((n) => n.label);

  return (
    <LeadsScreen
      leads={rows}
      needs={needs}
      isAdmin={user.role === "admin"}
      mailFrom={mailSender()}
      initialLead={typeof sp.lead === "string" ? sp.lead : null}
      initialStatus={typeof sp.estado === "string" ? sp.estado : "todos"}
      loadError={error ? "No se han podido cargar los mensajes. Recarga la página." : null}
    />
  );
}
