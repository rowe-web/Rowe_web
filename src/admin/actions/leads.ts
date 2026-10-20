"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { action, ActionError, check, requireRole } from "@/admin/auth";
import { processOutbox } from "@/lib/email/outbox";
import { inboxConfigured, syncInbox } from "@/lib/email/inbox";
import { buildReplyMail, REPLY_LEAD_COLUMNS, type ReplyLeadRow } from "@/lib/email/reply";
import { EmailNotConfiguredError, mailSender, sendMail } from "@/lib/email/transport";
import { adminClient } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

const id = z.string().uuid();
const status = z.enum(["nuevo", "contactado", "cerrado"]);

export async function setLeadStatus(leadId: string, value: string) {
  return action(async () => {
    await requireRole("staff");
    const supabase = await createSupabaseServer();
    check(await supabase.from("leads").update({ status: status.parse(value) }).eq("id", id.parse(leadId)).select("id").single());
    refresh();
  });
}

export async function saveLeadNotes(leadId: string, notes: string) {
  return action(async () => {
    await requireRole("staff");
    if (notes.length > 5000) throw new ActionError("Las notas son demasiado largas (máximo 5.000 caracteres).");
    const supabase = await createSupabaseServer();
    check(await supabase.from("leads").update({ notes }).eq("id", id.parse(leadId)).select("id").single());
  });
}

export async function deleteLead(leadId: string) {
  return action(async () => {
    await requireRole("admin");
    const supabase = await createSupabaseServer();
    const rows = check(await supabase.from("leads").delete().eq("id", id.parse(leadId)).select("id"));
    if (!rows?.length) throw new ActionError("No se ha podido eliminar.");
    refresh();
  });
}

const reply = z.object({
  subject: z.string().trim().min(1, "Pon un asunto.").max(200, "El asunto es demasiado largo (máximo 200 caracteres)."),
  body: z.string().trim().min(1, "Escribe la respuesta.").max(10000, "La respuesta es demasiado larga (máximo 10.000 caracteres)."),
});

/**
 * Responde a un mensaje desde el panel: el email sale de la cuenta de ROWE (SMTP_USER),
 * nunca del correo personal de quien responde. Cada intento queda registrado
 * (lead_replies) y, si se envía, el mensaje pasa de «nuevo» a «contactado».
 */
export async function replyToLead(leadId: string, subject: string, body: string) {
  return action(async () => {
    const me = await requireRole("staff");
    const input = reply.safeParse({ subject, body });
    if (!input.success) throw new ActionError(input.error.issues[0]?.message ?? "Revisa la respuesta.");
    const from = mailSender();
    if (!from) throw new ActionError("El envío de emails no está configurado (EMAIL_PROVIDER y SMTP en .env.local).");

    // El destinatario sale de la base de datos (con los permisos de quien responde), no del navegador
    const supabase = await createSupabaseServer();
    const lead = check(await supabase.from("leads").select(REPLY_LEAD_COLUMNS).eq("id", id.parse(leadId)).single()) as (ReplyLeadRow & { id: string; status: string }) | null;
    if (!lead) throw new ActionError("No se ha encontrado el mensaje.");

    const db = adminClient();
    const base = { lead_id: lead.id, sent_by: me.id, sent_by_name: me.name || me.email, from_email: from, to_email: lead.email, subject: input.data.subject, body: input.data.body };
    let messageId: string;
    try {
      messageId = (await sendMail(await buildReplyMail(lead, input.data.subject, input.data.body, from))).id;
    } catch (e) {
      const msg = e instanceof EmailNotConfiguredError ? e.message : e instanceof Error ? e.message.slice(0, 300) : "error desconocido";
      await db.from("lead_replies").insert({ ...base, status: "failed", error: msg });
      refresh();
      throw new ActionError(`No se ha podido enviar: ${msg}`);
    }
    if (lead.status === "nuevo") await supabase.from("leads").update({ status: "contactado" }).eq("id", lead.id);
    const { error } = await db.from("lead_replies").insert({ ...base, status: "sent", message_id: messageId });
    refresh();
    // El email ya ha salido: si solo falla el registro, se avisa sin decir que no se envió
    if (error) throw new ActionError("La respuesta se ha enviado, pero no se ha podido guardar en el historial.");
  });
}

/**
 * Lee ya el buzón de ROWE y guarda las respuestas de clientes que hayan llegado. El panel lo
 * llama solo cada minuto mientras está abierto (y con «Comprobar correo»); el servidor no
 * deja que se solape con otra lectura ni que se repita en menos de 20 s.
 */
export async function checkInbox() {
  return action(async () => {
    await requireRole("staff");
    if (!inboxConfigured()) return { configured: false, imported: 0 };
    const res = await syncInbox({ minInterval: 20 });
    if (res.error) throw new ActionError(`No se ha podido leer el correo: ${res.error}`);
    if (res.imported) refresh();
    return { configured: true, imported: res.imported };
  });
}

/** Las respuestas del cliente de este mensaje pasan a vistas (se quita el aviso «nueva»). */
export async function markInboundSeen(leadId: string) {
  return action(async () => {
    await requireRole("staff");
    await adminClient().from("lead_inbound").update({ seen_at: new Date().toISOString() }).eq("lead_id", id.parse(leadId)).is("seen_at", null);
  });
}

/** Reintenta ya el aviso por email de un mensaje (la cola es interna: se usa la clave del servidor). */
export async function retryLeadEmail(leadId: string) {
  return action(async () => {
    await requireRole("staff");
    const db = adminClient();
    // Solo el aviso al equipo (la confirmación al cliente tiene sus propios reintentos)
    const { data } = await db.from("email_outbox").select("id, status").eq("lead_id", id.parse(leadId)).eq("template", "new-lead").order("id", { ascending: false }).limit(1).maybeSingle();
    if (!data) throw new ActionError("Este mensaje no tiene aviso en la cola.");
    if (data.status === "sent") throw new ActionError("El aviso ya se envió.");
    // Un aviso «agotado» vuelve a la cola para un intento más
    await db.from("email_outbox").update({ status: "failed", attempts: 0, next_attempt_at: new Date().toISOString() }).eq("id", data.id);
    const res = await processOutbox({ ids: [data.id] });
    refresh();
    if (res.failed) {
      const { data: row } = await db.from("email_outbox").select("last_error").eq("id", data.id).single();
      throw new ActionError(`No se ha podido enviar: ${row?.last_error ?? "error desconocido"}`);
    }
  });
}
