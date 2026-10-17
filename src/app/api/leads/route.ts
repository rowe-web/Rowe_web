import { after } from "next/server";
import { quoteLabel } from "@/features/configurator/engine";
import { saveQuote, serverQuote } from "@/features/configurator/server";
import { leadSchema, MIN_ELAPSED_MS } from "@/features/hablemos/schema";
import { getHablemosSettings } from "@/features/hablemos/settings";
import { getSetting, emptyContact, type ContactSettings } from "@/lib/content/settings";
import { loadSite } from "@/lib/content/site";
import { enqueueNewLead, processOutbox } from "@/lib/email/outbox";
import { clientIp, hashIp, json, sameOrigin } from "@/lib/server/request";
import { adminClient } from "@/lib/supabase/admin";

/** Máximo de solicitudes por IP y hora. */
const RATE = { limit: 5, windowSeconds: 3600 };

/**
 * POST /api/leads — nueva solicitud «Hablemos» (desde el formulario o el configurador).
 *
 * Orden de seguridad y fiabilidad:
 *  1. Origen y validación (Zod; la misma que en el navegador) + valores permitidos del panel.
 *  2. Anti-spam: campo trampa y tiempo mínimo (se responde «ok» sin guardar: el bot no aprende nada)
 *     y límite por IP (anónima).
 *  3. Si viene del configurador: el presupuesto se RECALCULA aquí con los precios publicados.
 *  4. Se guarda el lead. Si esto falla → error 500 y el formulario ofrece reintentar.
 *  5. El aviso por email se encola y se envía DESPUÉS de responder. Si falla, el lead ya
 *     está guardado y el error queda registrado para reintentarlo.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ message: "Origen no permitido" }, 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ message: "Solicitud no válida" }, 400);
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => String(i.path[0])).filter((f) => ["name", "email", "privacy"].includes(f)))];
    return json({ message: "Revisa los datos del formulario", fields }, 400);
  }
  const lead = parsed.data;

  // Anti-spam silencioso
  if (lead.website || lead.elapsed < MIN_ELAPSED_MS) {
    console.warn("[leads] Descartado como spam", { trap: !!lead.website, elapsed: lead.elapsed });
    return json({ ok: true }, 201);
  }

  const db = adminClient();
  const ipHash = hashIp(clientIp(req));
  const { data: allowed, error: rateError } = await db.rpc("check_rate_limit", {
    p_key: `lead:${ipHash}`,
    p_limit: RATE.limit,
    p_window_seconds: RATE.windowSeconds,
  });
  if (rateError) console.error("[leads] Límite de envíos no disponible", rateError.message);
  const site = await loadSite();
  const contact = getSetting<ContactSettings>(site, "contact", emptyContact);
  if (allowed === false) {
    return json({ message: `Has enviado varias solicitudes seguidas. Espera un poco o escríbenos a ${contact.email_contact}.` }, 429);
  }

  // Solo valores que existen en el formulario publicado
  const hs = getHablemosSettings(site);
  if (!hs.needs.some((n) => n.label === lead.need)) return json({ message: "Opción no válida" }, 400);
  if (lead.sector && !hs.sectors.includes(lead.sector)) return json({ message: "Opción no válida" }, 400);
  if (lead.budget && lead.budget !== "cfg" && !hs.budgets.includes(lead.budget)) return json({ message: "Opción no válida" }, 400);

  // Presupuesto del configurador: recalculado aquí
  let budgetLabel = lead.budget === "cfg" ? "" : lead.budget;
  let quoteId: string | null = null;
  let quoteNumber: string | null = null;
  let items = "";
  if (lead.budget === "cfg") {
    const { selection, quote } = serverQuote(site, lead.selection);
    if (quote) {
      budgetLabel = quoteLabel(quote);
      items = quote.items.map((i) => i.label).join(" · ");
      try {
        const saved = await saveQuote(site, selection, quote);
        quoteId = saved.id;
        quoteNumber = saved.number;
      } catch (err) {
        // El presupuesto es secundario: el lead se guarda igualmente con su rango
        console.error("[leads]", err instanceof Error ? err.message : err);
      }
    }
  }

  const { data: inserted, error } = await db
    .from("leads")
    .insert({
      origin: lead.budget === "cfg" ? "configurador" : "formulario",
      need: lead.need,
      sector: lead.sector,
      budget_label: budgetLabel,
      message: lead.message,
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      city: lead.city,
      privacy_accepted_at: new Date().toISOString(),
      quote_id: quoteId,
      source: { ...lead.source, items },
      ip_hash: ipHash,
      user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300),
    })
    .select("id, created_at")
    .single();

  if (error || !inserted) {
    console.error("[leads] NO SE PUDO GUARDAR EL LEAD", error?.message);
    return json({ message: `No se ha podido guardar. Inténtalo de nuevo o escríbenos a ${contact.email_contact}.` }, 500);
  }

  // Aviso por email (después de responder; nunca bloquea ni pierde el lead)
  const { data: notif } = await db.from("site_settings").select("value").eq("key", "notifications").maybeSingle();
  const recipients = ((notif?.value as { lead_recipients?: string[] } | null)?.lead_recipients ?? [contact.email_admin]).filter(Boolean);
  const outboxId = await enqueueNewLead(
    {
      leadId: inserted.id,
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      city: lead.city,
      need: lead.need,
      sector: lead.sector,
      budget: budgetLabel || "Sin indicar",
      items,
      message: lead.message,
      origin: lead.budget === "cfg" ? "configurador" : "formulario",
      quoteNumber,
      createdAt: inserted.created_at,
    },
    recipients,
  );
  if (outboxId) after(() => processOutbox({ ids: [outboxId] }));

  return json({ ok: true }, 201);
}
