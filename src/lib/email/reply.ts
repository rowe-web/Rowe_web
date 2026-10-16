import "server-only";
import { emptyBrand, emptyContact, getSetting, type BrandSettings, type ContactSettings } from "@/lib/content/settings";
import { loadSite } from "@/lib/content/site";
import { replyEmail } from "./templates";
import type { Mail } from "./transport";

/** Lo que se lee de un mensaje para responderle (columnas de leads + su presupuesto). */
export interface ReplyLeadRow {
  email: string;
  name: string;
  need: string;
  budget_label: string;
  message: string;
  created_at: string;
  source: { items?: string } | null;
  quotes: { number: string; items: { label: string }[] } | { number: string; items: { label: string }[] }[] | null;
}

export const REPLY_LEAD_COLUMNS = "id, email, status, name, need, budget_label, message, created_at, source, quotes(number, items)";

/**
 * Email de respuesta a un mensaje: el texto escrito en el panel + el resumen de lo que
 * pidió el cliente (servicio, presupuesto, funciones elegidas) + los datos de contacto
 * publicados de ROWE.
 */
export async function buildReplyMail(lead: ReplyLeadRow, subject: string, body: string, from: string): Promise<Mail> {
  const site = await loadSite();
  const contact = getSetting<ContactSettings>(site, "contact", emptyContact);
  const brand = getSetting<BrandSettings>(site, "brand", emptyBrand);
  const quote = Array.isArray(lead.quotes) ? (lead.quotes[0] ?? null) : lead.quotes;
  const items = quote?.items?.length
    ? quote.items.map((i) => i.label).filter(Boolean)
    : (lead.source?.items ?? "")
        .split("·")
        .map((s) => s.trim())
        .filter(Boolean);

  return replyEmail({
    to: lead.email,
    subject,
    body,
    from,
    lead: {
      name: lead.name,
      need: lead.need,
      budget: lead.budget_label,
      items,
      quoteNumber: quote?.number ?? null,
      message: lead.message,
      createdAt: lead.created_at,
    },
    contact: { email: contact.email_contact || from, phone: contact.phone, whatsapp: contact.whatsapp, city: brand.city, tagline: brand.tagline },
  });
}
