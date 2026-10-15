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
  fields: Record<"name" | "name_placeholder" | "company" | "company_placeholder" | "email" | "email_placeholder" | "phone" | "phone_placeholder" | "privacy" | "privacy_link", string>;
  errors: Record<"name" | "email" | "privacy" | "send_title" | "send_body", string>;
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

export function getHablemosSettings(site: SiteSnapshot): HablemosSettings {
  return site.settings.hablemos as unknown as HablemosSettings;
}
