"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/site";

let client: SupabaseClient | null = null;

/** Cliente del navegador con la sesión del panel (subida de medios, etc.). Siempre bajo RLS. */
export function supabaseBrowser(): SupabaseClient {
  client ??= createBrowserClient(supabaseConfig.url, supabaseConfig.publishableKey);
  return client;
}
