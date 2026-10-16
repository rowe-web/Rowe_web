import "server-only";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { serverEnv } from "@/lib/env.server";
import { adminClient } from "@/lib/supabase/admin";
import { matchInbound, normalizeMessageId, stripQuoted, threadIds } from "./inbound";

/** Primera lectura (o si Gmail renumera el buzón): se revisan los emails de los últimos días. */
const FIRST_RUN_DAYS = 30;
/** Emails más grandes (adjuntos pesados) se leen igual, pero solo hasta este tamaño. */
const MAX_SOURCE_BYTES = 2_000_000;

export interface InboxResult {
  /** false si otra lectura estaba en marcha o la última fue hace muy poco. */
  ran: boolean;
  checked: number;
  imported: number;
  error?: string;
}

/** ¿Se puede leer el buzón? (hoy: Gmail por IMAP con la misma cuenta y contraseña de aplicación que el SMTP). */
export function inboxConfigured(): boolean {
  const env = serverEnv();
  return env.EMAIL_PROVIDER === "smtp" && Boolean(env.SMTP_USER && env.SMTP_PASSWORD) && env.EMAIL_DRY_RUN !== "1";
}

/**
 * Lee del buzón de ROWE los emails nuevos y guarda como respuesta de cliente (lead_inbound)
 * los que contestan a ROWE o vienen de un cliente que ya escribió. El buzón no se toca:
 * se abre en solo lectura (nada se marca como leído ni se mueve). Cada email se guarda una
 * sola vez (Message-ID único), así que repetir la lectura no duplica nada.
 */
export async function syncInbox({ minInterval = 20 }: { minInterval?: number } = {}): Promise<InboxResult> {
  if (!inboxConfigured()) return { ran: false, checked: 0, imported: 0, error: "La lectura del correo no está configurada." };
  const db = adminClient();
  const { data: claimed, error: claimError } = await db.rpc("claim_mail_sync", { min_interval: minInterval });
  if (claimError) throw new Error(`No se pudo reservar la lectura del correo: ${claimError.message}`);
  const state = (claimed as { uid_validity: number | null; last_uid: number; mailbox: string }[] | null)?.[0];
  if (!state) return { ran: false, checked: 0, imported: 0 };

  const env = serverEnv();
  const own = env.SMTP_USER.toLowerCase();
  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    logger: false,
    socketTimeout: 60_000,
  });

  let checked = 0;
  let imported = 0;
  let lastUid = state.last_uid;
  let uidValidity = state.uid_validity;
  try {
    await client.connect();
    const box = await client.mailboxOpen(state.mailbox, { readOnly: true });
    const validity = Number(box.uidValidity);
    const fresh = uidValidity === null || Number(uidValidity) !== validity;
    if (fresh) lastUid = 0;
    uidValidity = validity;

    const uids = fresh
      ? ((await client.search({ since: new Date(Date.now() - FIRST_RUN_DAYS * 86_400_000) }, { uid: true })) || [])
      : ((await client.search({ uid: `${lastUid + 1}:*` }, { uid: true })) || []).filter((u) => u > lastUid);

    if (uids.length) {
      // Lo que hace falta para asociar: Message-ID de lo que ROWE envió y los clientes por email
      const { data: sent } = await db.from("lead_replies").select("message_id, lead_id").not("message_id", "is", null);
      for await (const msg of client.fetch(uids, { uid: true, envelope: true, size: true, source: { maxLength: MAX_SOURCE_BYTES } }, { uid: true })) {
        checked++;
        lastUid = Math.max(lastUid, msg.uid);
        const from = msg.envelope?.from?.[0]?.address?.toLowerCase() ?? "";
        if (!from || from === own || !msg.source) continue; // avisos internos y lo que envía ROWE

        const mail = await simpleParser(msg.source);
        const messageId = normalizeMessageId(mail.messageId ?? msg.envelope?.messageId);
        if (!messageId) continue;
        const ids = threadIds(mail.inReplyTo, mail.references);

        const { data: leads } = await db.from("leads").select("id, email, created_at").ilike("email", from);
        const match = matchInbound({ from, threadIds: ids }, sent ?? [], leads ?? []);
        if (!match) continue;

        const full = (mail.text || "").trim().slice(0, 60_000);
        const { data: row, error } = await db
          .from("lead_inbound")
          .upsert(
            {
              lead_id: match.leadId,
              received_at: new Date(mail.date ?? msg.envelope?.date ?? Date.now()).toISOString(),
              from_email: from,
              from_name: (mail.from?.value?.[0]?.name || "").slice(0, 160),
              subject: (mail.subject || "").slice(0, 300),
              body: stripQuoted(full).slice(0, 20_000),
              full_text: full,
              attachments: mail.attachments?.length ?? 0,
              message_id: messageId,
              in_reply_to: normalizeMessageId(mail.inReplyTo),
              matched_by: match.by,
            },
            { onConflict: "message_id", ignoreDuplicates: true },
          )
          .select("id");
        if (error) throw new Error(`No se pudo guardar una respuesta: ${error.message}`);
        imported += row?.length ?? 0;
      }
    }

    await db
      .from("mail_sync_state")
      .update({ running_since: null, last_run_at: new Date().toISOString(), last_uid: lastUid, uid_validity: uidValidity, last_error: null, last_imported: imported })
      .eq("id", 1);
    return { ran: true, checked, imported };
  } catch (e) {
    const message = e instanceof Error ? (e as Error & { responseText?: string }).responseText || e.message : String(e);
    // Lo ya guardado se queda; la próxima lectura sigue desde el último email procesado
    await db
      .from("mail_sync_state")
      .update({ running_since: null, last_run_at: new Date().toISOString(), last_uid: lastUid, uid_validity: uidValidity, last_error: message.slice(0, 500) })
      .eq("id", 1);
    return { ran: true, checked, imported, error: message };
  } finally {
    await client.logout().catch(() => {});
  }
}
