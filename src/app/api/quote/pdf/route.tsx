import { renderQuotePdf } from "@/features/configurator/pdf/renderQuotePdf";
import { saveQuote, serverQuote } from "@/features/configurator/server";
import { loadSite } from "@/lib/content/site";
import { clientIp, hashIp, json, sameOrigin } from "@/lib/server/request";
import { adminClient } from "@/lib/supabase/admin";

/**
 * POST /api/quote/pdf — PDF del presupuesto.
 * Recalcula el precio en el servidor, lo numera (ROWE-AAAA-NNNN), lo guarda como
 * presupuesto calculado y devuelve el PDF.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ message: "Origen no permitido" }, 403);
  const body = (await req.json().catch(() => null)) as { selection?: unknown } | null;

  const { data: allowed } = await adminClient().rpc("check_rate_limit", {
    p_key: `pdf:${hashIp(clientIp(req))}`,
    p_limit: 20,
    p_window_seconds: 3600,
  });
  if (allowed === false) return json({ message: "Demasiadas descargas seguidas. Espera un poco." }, 429);

  const site = await loadSite();
  const { selection, quote } = serverQuote(site, body?.selection);
  if (!quote) return json({ message: "Elige primero qué necesitas" }, 400);

  let number = "ROWE";
  try {
    number = (await saveQuote(site, selection, quote, { pdf: true })).number;
  } catch (err) {
    // El PDF se entrega igualmente (sin número registrado)
    console.error("[pdf]", err instanceof Error ? err.message : err);
  }

  const pdf = await renderQuotePdf(site, quote, number);

  return new Response(new Uint8Array(pdf.content), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${pdf.filename}"`,
      "cache-control": "no-store",
      "x-quote-number": number,
    },
  });
}
