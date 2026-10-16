import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "@/lib/site";
import { REMEMBER_COOKIE, sessionCookieOptions } from "./cookies";

/**
 * Cliente de Supabase con la sesión del usuario del panel (cookies).
 * Todo lo que hace pasa por RLS: un editor no puede tocar lo que no le corresponde
 * aunque se saltara la interfaz.
 */
export async function createSupabaseServer() {
  const store = await cookies();
  const remember = store.get(REMEMBER_COOKIE)?.value !== "0";
  return createServerClient(supabaseConfig.url, supabaseConfig.publishableKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, sessionCookieOptions(options, remember)));
        } catch {
          // Desde un Server Component no se pueden escribir cookies: lo hace el proxy.
        }
      },
    },
  });
}
