import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * Destino de los enlaces de los emails de acceso (restablecer contraseña, invitación).
 * Admite los dos formatos de Supabase: `?code=` (PKCE) y `?token_hash=&type=`.
 * Tras validar, abre la sesión y lleva a crear la contraseña.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/admin/acceso/nueva-contrasena";
  const safeNext = next.startsWith("/admin") ? next : "/admin";
  const supabase = await createSupabaseServer();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Enlace incompleto") };

  if (error) {
    return NextResponse.redirect(new URL("/admin/acceso?error=enlace", url.origin));
  }
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
