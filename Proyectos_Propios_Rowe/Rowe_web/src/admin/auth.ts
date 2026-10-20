import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { createSupabaseServer } from "@/lib/supabase/server";

export type Role = "admin" | "editor";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role | null;
}

/**
 * Capa de acceso a datos del panel: quién es el usuario y qué rol tiene.
 * Una sola lectura por petición (React cache). El rol sale de `profiles`
 * (lo que dice la base de datos), nunca del navegador.
 */
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  const { data: profile } = await supabase.from("profiles").select("id, email, full_name, role").eq("id", id).maybeSingle();
  if (!profile) return { id, email: String(data.claims.email ?? ""), name: "", role: null };
  return { id: profile.id, email: profile.email, name: profile.full_name || profile.email.split("@")[0], role: profile.role };
});

/** Para páginas: exige sesión (si no, al login). Devuelve el usuario (puede no tener rol). */
export async function requirePageUser(): Promise<AdminUser> {
  // El panel siempre se genera en cada petición (depende de quién eres y de la hora)
  await connection();
  const user = await getAdminUser();
  if (!user) redirect("/admin/acceso");
  return user;
}

export class ActionError extends Error {}

/** Para acciones del servidor: exige un rol. Lanza ActionError con un mensaje claro. */
export async function requireRole(role: "staff" | "admin"): Promise<AdminUser & { role: Role }> {
  const user = await getAdminUser();
  if (!user) throw new ActionError("Tu sesión ha caducado. Vuelve a entrar.");
  if (!user.role) throw new ActionError("Tu usuario no tiene acceso al panel.");
  if (role === "admin" && user.role !== "admin") throw new ActionError("Solo un administrador puede hacer esto.");
  return user as AdminUser & { role: Role };
}

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/** Envuelve una acción: errores conocidos → mensaje para la interfaz; desconocidos → registrados. */
export async function action<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof ActionError) return { ok: false, error: err.message };
    // redirect()/notFound() de Next se propagan
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("[admin]", err);
    return { ok: false, error: friendlyDbError(err) };
  }
}

/** Traduce errores habituales de la base de datos a algo entendible. */
export function friendlyDbError(err: unknown): string {
  const msg = err instanceof Error ? err.message : typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : String(err);
  if (/row-level security|permission denied|42501/i.test(msg)) return "No tienes permiso para hacer esto.";
  if (/config_price_range/.test(msg)) return "El mínimo no puede ser mayor que el máximo.";
  if (/duplicate key|unique/i.test(msg)) return "Ya existe otro elemento con ese identificador.";
  if (/al menos un administrador/i.test(msg)) return "Debe quedar al menos un administrador.";
  if (/Solo un administrador/i.test(msg)) return msg;
  if (/fetch failed|network|timeout/i.test(msg)) return "No hay conexión con la base de datos. Inténtalo de nuevo.";
  return "Algo ha fallado al guardar. Inténtalo de nuevo.";
}

/** Lanza si la respuesta de Supabase trae error (para usar dentro de action()). */
export function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
