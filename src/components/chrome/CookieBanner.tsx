"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getConsent, setConsent } from "@/lib/analytics/client";
import type { CookieSettings } from "@/lib/content/settings";

/**
 * Banner de cookies (vista previa del panel: texto + «Configurar» + «Aceptar»).
 * Se añade «Rechazar» con el mismo peso que «Aceptar» (criterio de la AEPD).
 * Solo hay cookies técnicas y, si se acepta, la analítica propia (sin terceros).
 * Se reabre desde «Preferencias de cookies» del pie.
 */
export function CookieBanner({ settings }: { settings: CookieSettings }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    if (!settings.enabled) return;
    // Primera visita (o consentimiento borrado): se muestra tras el preloader
    const t = window.setTimeout(() => setOpen(getConsent() === null), 1200);
    const reopen = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest?.("[data-cookie-settings]")) {
        setAnalytics(getConsent() === "granted");
        setDetail(true);
        setOpen(true);
      }
    };
    document.addEventListener("click", reopen);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("click", reopen);
    };
  }, [settings.enabled]);

  const decide = (value: "granted" | "denied") => {
    setConsent(value);
    setOpen(false);
  };

  if (!open) return null;
  return (
    <div role="dialog" aria-label="Preferencias de cookies" className="toast-in fixed bottom-4 left-4 right-4 z-[300] max-w-[520px] border border-line-strong bg-surface p-5 shadow-[0_20px_60px_rgb(0_0_0/0.5)] sm:right-auto">
      <p className="text-[14px] leading-relaxed text-muted">
        {settings.text}{" "}
        <Link href="/cookies" className="border-b border-line-cta text-bone">
          Política de cookies
        </Link>
      </p>

      {detail && (
        <div className="mt-4 flex flex-col border-t border-line">
          <div className="flex items-center justify-between gap-4 border-b border-line py-3">
            <span className="flex flex-col gap-0.5">
              <span className="text-[14px]">Necesarias</span>
              <span className="text-[12px] text-muted">Funcionamiento básico (preferencias, seguridad).</span>
            </span>
            <span className="label-mono text-[10px] text-muted">Siempre activas</span>
          </div>
          <button type="button" role="switch" aria-checked={analytics} onClick={() => setAnalytics((a) => !a)} className="flex items-center justify-between gap-4 py-3 text-left">
            <span className="flex flex-col gap-0.5">
              <span className="text-[14px]">Analítica</span>
              <span className="text-[12px] text-muted">Visitas anónimas para mejorar la web. Sin terceros.</span>
            </span>
            <span className={`relative h-6 w-11 flex-none rounded-full border transition-colors ${analytics ? "border-bone bg-bone" : "border-line-cta"}`}>
              <span className={`absolute left-[3px] top-[3px] h-4 w-4 rounded-full transition-transform duration-300 ${analytics ? "translate-x-5 bg-ink" : "bg-muted"}`} />
            </span>
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {detail ? (
          <Button size="sm" magnetic={false} onClick={() => decide(analytics ? "granted" : "denied")}>
            Guardar
          </Button>
        ) : (
          <>
            <Button size="sm" magnetic={false} onClick={() => decide("granted")}>
              {settings.accept}
            </Button>
            <Button size="sm" variant="outline" magnetic={false} onClick={() => decide("denied")}>
              {settings.reject}
            </Button>
            <button type="button" onClick={() => setDetail(true)} className="min-h-[42px] px-3 text-[14px] text-muted hover:text-bone">
              {settings.configure}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
