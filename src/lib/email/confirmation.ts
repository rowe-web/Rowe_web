import "server-only";
import type { Quote } from "@/features/configurator/engine";
import { renderQuotePdf } from "@/features/configurator/pdf/renderQuotePdf";
import { emptyBrand, emptyContact, getSetting, hasRealValue, type BrandSettings, type ContactSettings } from "@/lib/content/settings";
import { loadSite } from "@/lib/content/site";
import { adminClient } from "@/lib/supabase/admin";
import { confirmationMessageId } from "./inbound";
import { confirmationEmail, type ConfirmationPayload, type ConfirmationTexts } from "./templates";
import { mailSender, type Mail } from "./transport";

/** Ajuste «confirmation_email» (interno: se aplica al guardar, sin publicar). */
export type ConfirmationSettings = ConfirmationTexts & { enabled: boolean };

/** Lo que se encola: el resumen y, si viene del configurador, el presupuesto para el PDF. */
export type ConfirmationJob = ConfirmationPayload & { quote?: Quote | null };

/** Agenda para reservar videollamada (ajuste «booking», si algún día existe y está activo). */
interface BookingSettings {
  enabled: boolean;
  url: string;
  label: string;
}

/** El ajuste guardado, o null si no existe o no se puede leer (entonces no se envía nada). */
export async function loadConfirmationSettings(): Promise<ConfirmationSettings | null> {
  const { data, error } = await adminClient().from("site_settings").select("value").eq("key", "confirmation_email").maybeSingle();
  if (error || !data?.value) return null;
  return data.value as ConfirmationSettings;
}

/** El email listo para enviar, con los textos, el contacto y la agenda publicados en este momento. */
export async function buildConfirmationMail(job: ConfirmationJob): Promise<Mail> {
  const [site, settings] = await Promise.all([loadSite(), loadConfirmationSettings()]);
  if (!settings) throw new Error("Falta el ajuste «confirmation_email»");
  const from = mailSender();
  const contact = getSetting<ContactSettings>(site, "contact", emptyContact);
  const brand = getSetting<BrandSettings>(site, "brand", emptyBrand);
  const booking = getSetting<BookingSettings>(site, "booking", { enabled: false, url: "", label: "" });
  // El PDF es un extra: si no se puede generar, la confirmación sale igualmente sin él
  const pdf = job.quote && job.quoteNumber ? await renderQuotePdf(site, job.quote, job.quoteNumber, new Date(job.createdAt)).catch((e) => (console.error("[email] PDF de la confirmación", e), null)) : null;

  return confirmationEmail({
    lead: job,
    texts: settings,
    contact: { email: contact.email_contact || from, phone: contact.phone, whatsapp: contact.whatsapp, city: brand.city, tagline: brand.tagline },
    from,
    booking: booking.enabled && hasRealValue(booking.url) ? { url: booking.url, label: booking.label } : null,
    pdf,
    messageId: from ? confirmationMessageId(job.leadId, from) : undefined,
  });
}
