"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { action, ActionError, check, requireRole } from "@/admin/auth";
import { inviteEmail } from "@/lib/email/templates";
import { sendMail } from "@/lib/email/transport";
import { absoluteUrl } from "@/lib/site";
import { adminClient } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

const role = z.enum(["admin", "editor"]);
const uuid = z.string().uuid();
const BAN_FOREVER = "876000h"; // 100 años

/**
 * Invita (o vuelve a dar acceso) a una persona. Genera el enlace en el servidor con la
 * clave secreta y lo devuelve para poder copiarlo: así funciona aunque el email no
 * esté configurado o el SMTP por defecto de Supabase esté al límite.
 */
export async function inviteUser(input: { email: string; role: "admin" | "editor"; name?: string }) {
  return action(async () => {
    const me = await requireRole("admin");
    const email = z.string().trim().toLowerCase().email("Escribe un email válido.").max(200).safeParse(input.email);
    if (!email.success) throw new ActionError("Escribe un email válido.");
    const r = role.parse(input.role);
    const name = z.string().trim().max(80).parse(input.name ?? "");
    const admin = adminClient();

    const { data: existing } = await admin.from("profiles").select("id").eq("email", email.data).maybeSingle();
    let userId: string;
    let hashed: string;
    let type: "invite" | "recovery";

    if (existing) {
      // Ya tiene cuenta: se le devuelve el acceso y se le manda un enlace para crear contraseña
      userId = existing.id;
      const { error: unban } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none", app_metadata: { role: r } });
      if (unban) throw new Error(unban.message);
      const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: email.data });
      if (error || !data) throw new Error(error?.message ?? "No se pudo generar el enlace");
      hashed = data.properties.hashed_token;
      type = "recovery";
    } else {
      const { data, error } = await admin.auth.admin.generateLink({
        type: "invite",
        email: email.data,
        options: { data: { full_name: name || email.data.split("@")[0] } },
      });
      if (error || !data) throw new Error(error?.message ?? "No se pudo crear la invitación");
      userId = data.user.id;
      hashed = data.properties.hashed_token;
      type = "invite";
      const { error: meta } = await admin.auth.admin.updateUserById(userId, { app_metadata: { role: r } });
      if (meta) throw new Error(meta.message);
    }
    check(await admin.from("profiles").update({ role: r, ...(name ? { full_name: name } : {}) }).eq("id", userId).select("id").single());

    const link = absoluteUrl(`/admin/acceso/confirmar?token_hash=${encodeURIComponent(hashed)}&type=${type}&next=${encodeURIComponent("/admin/acceso/nueva-contrasena")}`);
    let emailed = false;
    try {
      await sendMail(await inviteEmail(email.data, link, r, me.name || me.email));
      emailed = true;
    } catch (err) {
      console.warn("[admin] invitación sin email:", err instanceof Error ? err.message : err);
    }
    refresh();
    return { link, emailed };
  });
}

export async function setUserRole(id: string, next: "admin" | "editor") {
  return action(async () => {
    const me = await requireRole("admin");
    const userId = uuid.parse(id);
    if (userId === me.id) throw new ActionError("No puedes cambiar tu propio rol. Pídeselo a otro administrador.");
    const r = role.parse(next);
    const supabase = await createSupabaseServer();
    check(await supabase.from("profiles").update({ role: r }).eq("id", userId).select("id").single());
    await adminClient().auth.admin.updateUserById(userId, { app_metadata: { role: r } });
    refresh();
  });
}

/** Quita el acceso al panel: sin rol y con la cuenta bloqueada (se conserva su historial). */
export async function revokeUser(id: string) {
  return action(async () => {
    const me = await requireRole("admin");
    const userId = uuid.parse(id);
    if (userId === me.id) throw new ActionError("No puedes quitarte el acceso a ti mismo.");
    const supabase = await createSupabaseServer();
    check(await supabase.from("profiles").update({ role: null }).eq("id", userId).select("id").single());
    const { error } = await adminClient().auth.admin.updateUserById(userId, { ban_duration: BAN_FOREVER, app_metadata: { role: null } });
    if (error) throw new Error(error.message);
    refresh();
  });
}
