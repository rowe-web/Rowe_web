"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { action, ActionError, check, requireRole } from "@/admin/auth";
import { processOutbox } from "@/lib/email/outbox";
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

/** Reintenta ya el aviso por email de un mensaje (la cola es interna: se usa la clave del servidor). */
export async function retryLeadEmail(leadId: string) {
  return action(async () => {
    await requireRole("staff");
    const db = adminClient();
    const { data } = await db.from("email_outbox").select("id, status").eq("lead_id", id.parse(leadId)).order("id", { ascending: false }).limit(1).maybeSingle();
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
