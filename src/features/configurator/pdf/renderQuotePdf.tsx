import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import type { Quote } from "@/features/configurator/engine";
import { getConfiguratorSettings } from "@/features/configurator/settings";
import { emptyContact, getSetting, hasRealValue, type ContactSettings } from "@/lib/content/settings";
import type { SiteSnapshot } from "@/lib/content/types";
import { siteHost } from "@/lib/site";
import { QuoteDocument } from "./QuoteDocument";

/**
 * PDF del presupuesto: el de la descarga (/api/quote/pdf) y el que va adjunto al email de
 * confirmación. Pie con los datos de contacto reales (sin vacíos ni provisionales).
 */
export async function renderQuotePdf(site: SiteSnapshot, quote: Quote, number: string, when = new Date()): Promise<{ content: Buffer; filename: string }> {
  const settings = getConfiguratorSettings(site);
  const contact = getSetting<ContactSettings>(site, "contact", emptyContact);
  const date = when.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, ".");
  const content = await renderToBuffer(
    <QuoteDocument quote={quote} number={number} date={date} settings={settings} footer={[contact.email_contact, siteHost, contact.phone].filter(hasRealValue)} />,
  );
  return { content, filename: settings.pdf.file_name.replace(/"/g, "") };
}
