"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { MediaFrame } from "@/components/scene/MediaFrame";
import { Timecode } from "@/components/scene/Timecode";
import type { BrandSettings, ContactSettings, NavigationSettings } from "@/lib/content/settings";
import { instagramHref, whatsappHref } from "@/lib/content/settings";

interface SiteMenuProps {
  nav: NavigationSettings;
  contact: ContactSettings;
  brand: BrandSettings;
  open: boolean;
  /** Cierre inmediato (al navegar: la cortinilla ya tapa). */
  onClose?: () => void;
  /** Cierre animado (botón «Cerrar», Esc). */
  onCloseAnimated?: () => void;
  /** Guía de estilo: abierto y en su sitio. */
  preview?: boolean;
}

/**
 * Menú a pantalla completa — diseño nuevo siguiendo el sistema.
 * «Índice de escenas» numerado en tipografía grande; al pasar por un elemento se apagan
 * los demás y cambia la figura de la derecha. Abre con el corte desde el centro del
 * overlay del diseño (clip-path) y bloquea el scroll mientras está abierto.
 */
export function SiteMenu({ nav, contact, brand, open, onClose, onCloseAnimated, preview = false }: SiteMenuProps) {
  const [hover, setHover] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const current = hover ?? 0;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(contact.email_contact);
    } catch {
      /* el portapapeles puede no estar disponible: no es crítico */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      id="site-menu"
      role="dialog"
      aria-modal={!preview}
      aria-label="Menú"
      aria-hidden={!open}
      data-site-menu
      data-open={open || undefined}
      className={`${preview ? "relative min-h-[900px]" : "fixed inset-0 z-[200] overflow-y-auto"} bg-ink ${
        open ? "" : "pointer-events-none invisible"
      }`}
    >
      <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line-soft bg-ink gutter-x md:h-[76px]">
        <Logo height={18} href={null} />
        <span className="hidden label-mono text-muted md:inline">{nav.menu_kicker}</span>
        <button type="button" onClick={onCloseAnimated ?? onClose} className="flex min-h-11 items-center gap-2.5 text-[15px] md:text-[14px]">
          {nav.close_label} <span className="label-mono text-[10px] text-muted max-md:hidden">Esc</span>
        </button>
      </div>

      <div className="grid gap-12 gutter-x pb-10 pt-[6vh] lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-[6vw] lg:pt-[8vh]">
        <nav aria-label="Principal">
          <ol className="flex flex-col border-t border-line" onMouseLeave={() => setHover(null)}>
            {nav.items.map((item, i) => (
              <li key={item.href} data-menu-item className="overflow-hidden border-b border-line">
                <Link
                  href={item.href}
                  data-transition-label={item.label}
                  onClick={onClose}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  className={`flex items-baseline gap-5 py-3 transition-[color,padding] duration-500 ease-[var(--ease-out)] md:gap-8 md:py-4 ${
                    hover !== null && hover !== i ? "text-ghost" : "text-bone"
                  } ${hover === i ? "md:pl-4" : ""}`}
                >
                  <span className="w-7 shrink-0 label-mono text-[10px] text-muted md:w-10 md:text-[11px]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="headline text-[clamp(34px,9.6vw,48px)] leading-[1.02] md:text-[clamp(48px,4.4vw,72px)]">{item.label}</span>
                  <span aria-hidden="true" className={`ml-auto self-center text-[22px] transition-[opacity,transform] duration-500 ${hover === i ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0"}`}>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <aside className="flex flex-col gap-10">
          <figure className="hidden lg:block">
            <MediaFrame aspect="4 / 5" marks={16} placeholder={`[ ${nav.items[current]?.caption ?? ""} ]`} sizes="30vw" />
            <figcaption className="mt-2.5 label-mono text-[10px] text-muted">{nav.items[current]?.caption}</figcaption>
          </figure>

          <div className="flex flex-col gap-2">
            <button type="button" onClick={copy} className="flex min-h-12 items-center justify-between gap-4 border border-line-strong px-[18px] text-left text-[15px] transition-colors hover:border-[rgb(237_234_228/0.5)]" data-cursor="Copiar">
              <span className="truncate">{contact.email_contact}</span>
              <span className={`label-mono text-[10px] ${copied ? "text-bone" : "text-muted"}`}>{copied ? "Copiado ✓" : "Copiar"}</span>
            </button>
            <div className="flex flex-wrap gap-2">
              {whatsappHref(contact.whatsapp) && (
                <a href={whatsappHref(contact.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center gap-2.5 border border-line-strong px-[18px] text-[15px] transition-colors hover:border-[rgb(237_234_228/0.5)]">
                  WhatsApp <span className="label-mono text-[10px] text-muted">{contact.whatsapp}</span>
                </a>
              )}
              {instagramHref(contact.instagram) && (
                <a href={instagramHref(contact.instagram)} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center border border-line-strong px-[18px] text-[15px] transition-colors hover:border-[rgb(237_234_228/0.5)]">
                  {contact.instagram}
                </a>
              )}
            </div>
          </div>
        </aside>
      </div>

      <div className="flex flex-wrap justify-between gap-4 border-t border-line-soft gutter-x py-5 label-mono text-[10px] text-muted">
        <span>
          {brand.tagline} · {brand.city}
        </span>
        <span className="hidden sm:inline">{contact.hours}</span>
        <Timecode />
      </div>
    </div>
  );
}
