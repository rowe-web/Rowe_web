import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env.server";
import { supabaseConfig } from "@/lib/site";

let client: SupabaseClient | null = null;

/**
 * Cliente con la clave secret (rol service_role): ignora RLS. SOLO servidor.
 * Lo usan las rutas que crean leads, presupuestos, eventos y emails tras validar.
 */
export function adminClient(): SupabaseClient {
  client ??= createClient(supabaseConfig.url, serverEnv().SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
