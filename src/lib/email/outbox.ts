import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { newLeadEmail, type NewLeadPayload } from "./templates";
import { EmailNotConfiguredError, sendMail } from "./transport";

/** Esperas entre reintentos: 1 min, 5 min, 30 min, 2 h, 12 h. Después: «dead». */
const BACKOFF_MIN = [1, 5, 30, 120, 720];
export const MAX_ATTEMPTS = BACKOFF_MIN.length;

interface OutboxRow {
  id: number;
  template: string;
  to_addresses: string[];
  payload: NewLeadPayload;
  attempts: number;
}

/** Guarda el aviso en la cola. El lead ya está guardado antes de llamar a esto. */
export async function enqueueNewLead(payload: NewLeadPayload, to: string[]): Promise<number | null> {
  const { data, error } = await adminClient()
    .from("email_outbox")
    .insert({ lead_id: payload.leadId, template: "new-lead", to_addresses: to, payload })
    .select("id")
    .single();
  if (error) {
    console.error("[email] No se pudo encolar el aviso del lead", payload.leadId, error.message);
    return null;
  }
  return data.id as number;
}

/**
 * Envía los avisos pendientes (o los indicados). Cada fallo queda registrado con su
 * error y se reprograma; nunca lanza. Devuelve un resumen.
 */
export async function processOutbox(opts: { ids?: number[]; limit?: number } = {}) {
  const db = adminClient();
  let query = db
    .from("email_outbox")
    .select("id, template, to_addresses, payload, attempts")
    .in("status", ["pending", "failed"])
    .order("created_at", { ascending: true })
    .limit(opts.limit ?? 20);
  if (opts.ids?.length) {
    // Envío inmediato de avisos concretos: sin mirar la hora programada
    query = query.in("id", opts.ids);
  } else {
    // Margen de 2 min por si el reloj del servidor y el de la base de datos no coinciden
    query = query.lte("next_attempt_at", new Date(Date.now() + 120_000).toISOString());
  }
  const { data, error } = await query;
  if (error) {
    console.error("[email] No se pudo leer la cola", error.message);
    return { sent: 0, failed: 0, error: error.message };
  }

  let sent = 0;
  let failed = 0;
  for (const row of (data ?? []) as OutboxRow[]) {
    const attempts = row.attempts + 1;
    try {
      if (!row.to_addresses.length) throw new Error("Sin destinatarios (ajuste «notifications»)");
      const mail = row.template === "new-lead" ? await newLeadEmail(row.payload, row.to_addresses) : null;
      if (!mail) throw new Error(`Plantilla desconocida: ${row.template}`);
      await sendMail(mail);
      await db.from("email_outbox").update({ status: "sent", attempts, sent_at: new Date().toISOString(), last_error: null }).eq("id", row.id);
      sent++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      const dead = attempts >= MAX_ATTEMPTS;
      const wait = BACKOFF_MIN[Math.min(attempts, BACKOFF_MIN.length) - 1] ?? 720;
      await db
        .from("email_outbox")
        .update({
          status: dead ? "dead" : "failed",
          attempts,
          last_error: message.slice(0, 500),
          next_attempt_at: new Date(Date.now() + wait * 60_000).toISOString(),
        })
        .eq("id", row.id);
      if (!(err instanceof EmailNotConfiguredError)) console.error(`[email] Aviso ${row.id} falló (intento ${attempts}):`, message);
    }
  }
  return { sent, failed };
}
