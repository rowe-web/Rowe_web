import "server-only";
import type { SiteSnapshot } from "@/lib/content/types";
import { adminClient } from "@/lib/supabase/admin";
import { computeQuote, normalizeSelection, type Quote, type Selection } from "./engine";
import { getConfiguratorSettings } from "./settings";

/**
 * Recalcula el presupuesto EN EL SERVIDOR con los precios publicados.
 * Lo que mande el navegador (rango, importes) se ignora: solo se usa su selección,
 * saneada.
 */
export function serverQuote(site: SiteSnapshot, rawSelection: unknown): { selection: Selection; quote: Quote | null } {
  const selection = normalizeSelection(site.configurator, rawSelection);
  return { selection, quote: computeQuote(site.configurator, selection, getConfiguratorSettings(site)) };
}

/** Guarda el presupuesto calculado y devuelve su número (ROWE-AAAA-NNNN). */
export async function saveQuote(site: SiteSnapshot, selection: Selection, quote: Quote, opts: { pdf?: boolean } = {}) {
  const { data, error } = await adminClient()
    .from("quotes")
    .insert({
      selections: selection,
      items: quote.items,
      one_min: quote.one[0],
      one_max: quote.one[1],
      monthly_min: quote.monthly[0],
      monthly_max: quote.monthly[1],
      weeks_min: quote.weeks[0],
      weeks_max: quote.weeks[1],
      level: quote.level,
      release_version: site.version,
      pdf_downloaded_at: opts.pdf ? new Date().toISOString() : null,
    })
    .select("id, number")
    .single();
  if (error) throw new Error(`No se pudo guardar el presupuesto: ${error.message}`);
  return data as { id: string; number: string };
}
