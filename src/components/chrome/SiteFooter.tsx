import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Timecode } from "@/components/scene/Timecode";
import type { SiteSnapshot } from "@/lib/content/types";
import {
  emptyBrand,
  emptyContact,
  emptyNavigation,
  getSetting,
  instagramHref,
  whatsappHref,
  type BrandSettings,
  type ContactSettings,
  type NavigationSettings,
} from "@/lib/content/settings";
import { siteHost } from "@/lib/site";

/**
 * Pie — «créditos finales» (amplía el pie centrado y monoespaciado de ROWE Presupuesto).
 * Logo, créditos, columnas de contacto / redes / estudio / legal y cierre con el timecode.
 */
export function SiteFooter({ site }: { site: SiteSnapshot }) {
  const contact = getSetting<ContactSettings>(site, "contact", emptyContact);
  const brand = getSetting<BrandSettings>(site, "brand", emptyBrand);
  const nav = getSetting<NavigationSettings>(site, "navigation", emptyNavigation);
  const credits = brand.credits.split("·").map((c) => c.trim()).filter(Boolean);
  const social = [
    { label: "Instagram", value: contact.instagram, href: instagramHref(contact.instagram) },
    { label: "TikTok", value: contact.tiktok, href: contact.tiktok ? `https://tiktok.com/${contact.tiktok.startsWith("@") ? contact.tiktok : `@${contact.tiktok}`}` : "" },
    { label: "LinkedIn", value: "LinkedIn", href: contact.linkedin ? `https://${contact.linkedin.replace(/^https?:\/\//, "")}` : "" },
    { label: "YouTube", value: "YouTube", href: contact.youtube ? `https://${contact.youtube.replace(/^https?:\/\//, "")}` : "" },
  ].filter((s) => s.href);

  const col = "flex flex-col gap-3 text-[15px]";
  const head = "label-mono text-[10px] text-muted pb-1";
  const link = "w-fit border-b border-transparent transition-colors hover:border-line-cta";

  return (
    <footer data-site-footer className="relative border-t border-line gutter-x pb-8 pt-[10vh]">
      <div className="flex flex-col items-center gap-6 text-center">
        <Logo height={28} />
        <ul className="flex flex-col gap-1.5 label-mono text-[10px] text-muted md:text-[11px]">
          {credits.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>

      <div className="mt-[8vh] grid grid-cols-2 gap-x-6 gap-y-10 border-t border-line pt-10 md:grid-cols-4">
        <div className={col}>
          <span className={head}>Contacto</span>
          <a className={link} href={`mailto:${contact.email_contact}`}>
            {contact.email_contact}
          </a>
          {whatsappHref(contact.whatsapp) && (
            <a className={link} href={whatsappHref(contact.whatsapp)} target="_blank" rel="noopener noreferrer">
              WhatsApp {contact.whatsapp}
            </a>
          )}
          <a className={link} href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>
            {contact.phone}
          </a>
        </div>
        <div className={col}>
          <span className={head}>Redes</span>
          {social.map((s) => (
            <a key={s.label} className={link} href={s.href} target="_blank" rel="noopener noreferrer">
              {s.label === "Instagram" ? s.value : s.label}
            </a>
          ))}
        </div>
        <div className={col}>
          <span className={head}>Estudio</span>
          <span>{contact.address}</span>
          <span className="text-muted">{contact.hours}</span>
        </div>
        <div className={col}>
          <span className={head}>Legal</span>
          {nav.legal.map((l) => (
            <Link key={l.href} className={link} href={l.href}>
              {l.label}
            </Link>
          ))}
          <button type="button" data-cookie-settings className={`${link} text-left`}>
            Preferencias de cookies
          </button>
        </div>
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5 label-mono text-[10px] text-muted">
        <span>
          © {brand.year} ROWE · {siteHost}
        </span>
        <span className="flex items-center gap-3">
          {nav.footer_end} · <Timecode />
        </span>
      </div>
    </footer>
  );
}
