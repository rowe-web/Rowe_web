"use client";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Timecode } from "@/components/scene/Timecode";
import type { NavigationSettings } from "@/lib/content/settings";

interface SiteHeaderProps {
  nav: NavigationSettings;
  onMenu?: () => void;
  menuOpen?: boolean;
  /** Guía de estilo: se dibuja en su sitio, sin fijar. */
  preview?: boolean;
}

/**
 * Cabecera de ROWE Presupuesto: logo + REC · timecode central · «Menú» + «Hablemos».
 * Se oculta al bajar y reaparece al subir; con fondo desenfocado al salir del inicio
 * (comportamiento en src/motion/useHeaderScroll).
 */
export function SiteHeader({ nav, onMenu, menuOpen = false, preview = false }: SiteHeaderProps) {
  return (
    <header
      data-site-header
      className={`${preview ? "relative" : "fixed inset-x-0 top-0"} z-[100] flex h-16 items-center justify-between gutter-x transition-[transform,background-color] duration-[600ms] ease-[var(--ease-cut)] md:h-[76px]`}
    >
      <Logo height={18} priority />
      <Timecode className="hidden label-mono text-[12px] text-muted md:block" />
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={onMenu}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          className="min-h-11 text-[15px] md:text-[14px]"
        >
          {menuOpen ? nav.close_label : nav.menu_label}
        </button>
        {/* En móvil, como en el diseño, solo «Menú» */}
        <span className="hidden sm:inline-flex">
          <Button variant="outline" size="sm" href={nav.cta_href}>
            {nav.cta_label}
          </Button>
        </span>
      </div>
    </header>
  );
}
