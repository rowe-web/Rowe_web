import { renderToBuffer } from "@react-pdf/renderer";
import { QuoteDocument } from "@/features/configurator/pdf/QuoteDocument";
import { saveQuote, serverQuote } from "@/features/configurator/server";
import { getConfiguratorSettings } from "@/features/configurator/settings";
import { emptyContact, getSetting, hasRealValue, type ContactSettings } from "@/lib/content/settings";
import { loadSite } from "@/lib/content/site";
import { clientIp, hashIp, json, sameOrigin } from "@/lib/server/request";
import { siteHost } from "@/lib/site";
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

  const settings = getConfiguratorSettings(site);
  const contact = getSetting<ContactSettings>(site, "contact", emptyContact);
  const date = new Date().toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, ".");
  const pdf = await renderToBuffer(
    <QuoteDocument quote={quote} number={number} date={date} settings={settings} footer={[contact.email_contact, siteHost, contact.phone].filter(hasRealValue)} />,
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${settings.pdf.file_name.replace(/"/g, "")}"`,
      "cache-control": "no-store",
      "x-quote-number": number,
    },
  });
}
