import type { CookieOptions } from "@supabase/ssr";

/** Cookie que guarda la elección «Recordarme» del login. */
export const REMEMBER_COOKIE = "rowe-remember";

/**
 * Si el usuario NO marcó «Recordarme», las cookies de sesión pasan a ser de sesión
 * del navegador (sin fecha de caducidad): se borran al cerrarlo.
 */
export function sessionCookieOptions(options: CookieOptions, remember: boolean): CookieOptions {
  if (remember) return options;
  const rest = { ...options };
  delete rest.maxAge;
  delete rest.expires;
  return rest;
}
