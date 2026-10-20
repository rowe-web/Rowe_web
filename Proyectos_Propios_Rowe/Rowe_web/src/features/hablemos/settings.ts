import { settings as seedSettings } from "@/content/seed-data";
import type { SiteSnapshot } from "@/lib/content/types";

/** Textos del formulario «Hablemos» (ajuste «hablemos», editable desde el panel). */
export interface HablemosSettings {
  kicker: string;
  title: string;
  lead: string;
  promise: string;
  overlay_title: string;
  overlay_lead: string;
  prefill_label: string;
  prefill_overlay_label: string;
  prefill_edit: string;
  steps: { kicker: string; title: string; hint: string }[];
  needs: { key: string; label: string }[];
  sectors: string[];
  budgets: string[];
  budget_from_configurator: string;
  message_placeholder: string;
  message_max: number;
  optional: string;
  fields: Record<"name" | "name_placeholder" | "company" | "company_placeholder" | "email" | "email_placeholder" | "phone" | "phone_placeholder" | "city" | "city_placeholder" | "privacy" | "privacy_link", string>;
  errors: Record<"name" | "email" | "city" | "privacy" | "send_title" | "send_body", string>;
  next: string;
  back: string;
  submit: string;
  loading: string;
  retry: string;
  success_meta: string;
  success_title: string;
  success_body: string;
  success_reset: string;
  copy: string;
  copied: string;
}

const DEFAULTS = seedSettings.find((s) => s.key === "hablemos")!.value as unknown as HablemosSettings;

/**
 * Textos publicados. Un campo o error que aún no esté en la versión publicada (p. ej. uno
 * recién añadido) usa el texto inicial, para que ningún campo se quede sin etiqueta.
 */
export function getHablemosSettings(site: SiteSnapshot): HablemosSettings {
  const s = site.settings.hablemos as unknown as HablemosSettings;
  return { ...s, fields: { ...DEFAULTS.fields, ...s.fields }, errors: { ...DEFAULTS.errors, ...s.errors } };
}
