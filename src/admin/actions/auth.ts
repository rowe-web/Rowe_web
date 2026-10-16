"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { absoluteUrl } from "@/lib/site";
import { REMEMBER_COOKIE } from "@/lib/supabase/cookies";
import { createSupabaseServer } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  remember: z.boolean(),
  next: z.string().default("/admin"),
});

/** Solo se permite volver a rutas internas del panel (nada de redirecciones abiertas). */
function safeNext(next: string) {
  return next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
}

export async function signIn(input: z.input<typeof loginSchema>): Promise<{ error: string } | void> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { error: "Email o contraseña incorrectos. Inténtalo de nuevo." };
  const { email, password, remember, next } = parsed.data;

  // Se guarda antes de iniciar sesión: decide si las cookies de sesión caducan al cerrar el navegador
  (await cookies()).set(REMEMBER_COOKIE, remember ? "1" : "0", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { maxAge: 60 * 60 * 24 * 400 } : {}),
  });

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/rate|too many/i.test(error.message)) return { error: "Demasiados intentos. Espera unos minutos." };
    return { error: "Email o contraseña incorrectos. Inténtalo de nuevo." };
  }
  redirect(safeNext(next));
}

export async function signOut() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/admin/acceso");
}

/** Envía el enlace para crear una contraseña nueva. Siempre responde igual (no revela qué emails existen). */
export async function requestPasswordReset(email: string): Promise<{ ok: true } | { error: string }> {
  const parsed = z.string().trim().toLowerCase().email().safeParse(email);
  if (!parsed.success) return { error: "Escribe tu email para enviarte el enlace." };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: absoluteUrl("/admin/acceso/confirmar?next=/admin/acceso/nueva-contrasena"),
  });
  if (error && /rate/i.test(error.message)) return { error: "Ya te hemos enviado un enlace hace poco. Espera unos minutos." };
  if (error) console.error("[auth] reset", error.message);
  return { ok: true };
}

export async function updatePassword(password: string): Promise<{ error: string } | void> {
  if (password.length < 12) return { error: "Usa al menos 12 caracteres." };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: /same/i.test(error.message) ? "Elige una contraseña distinta de la anterior." : "No se ha podido cambiar. Vuelve a abrir el enlace del email." };
  redirect("/admin");
}
