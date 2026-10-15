"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "@/components/chrome/Toaster";
import { Button } from "@/components/ui/Button";
import { RichText } from "@/components/ui/RichText";
import { track } from "@/lib/analytics/client";
import { useMotionOptional } from "@/motion/MotionProvider";
import type { Quote, Selection } from "./engine";
import { range } from "./format";
import type { ConfiguratorSettings } from "./settings";

interface Props {
  quote: Quote;
  selection: Selection;
  settings: ConfiguratorSettings;
  footer: string[];
  onClose: () => void;
}

/**
 * Vista previa del PDF (diseño: hoja hueso sobre fondo desenfocado).
 * «Descargar» pide al servidor el PDF real: recalcula el precio, lo numera
 * (ROWE-AAAA-NNNN) y lo guarda como presupuesto calculado.
 */
export function PdfPreview({ quote, selection, settings, footer, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const motion = useMotionOptional();

  useEffect(() => {
    motion?.lock();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      motion?.unlock();
    };
  }, [motion, onClose]);

  const download = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/quote/pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ selection }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: settings.pdf.file_name });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      track("pdf");
      toast(`${settings.pdf.file_name} descargado`);
      onClose();
    } catch {
      toast("No se ha podido generar el PDF. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const today = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, ".");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vista previa del presupuesto"
      data-lenis-prevent
      onClick={onClose}
      className="toast-in fixed inset-0 z-[250] flex flex-col items-center gap-[18px] overflow-y-auto bg-[rgb(10_10_10/0.88)] px-5 pb-[60px] pt-8 backdrop-blur-md"
    >
      <div onClick={(e) => e.stopPropagation()} className="flex w-[min(680px,100%)] flex-wrap items-center justify-between gap-3">
        <span className="label-mono text-[10px] text-muted">Vista previa · {settings.pdf.file_name}</span>
        <div className="flex gap-2.5">
          <Button size="sm" onClick={download} loading={busy} loadingLabel="Generando…" arrow={busy ? false : "↓"} magnetic={false}>
            Descargar
          </Button>
          <Button size="sm" variant="outline" onClick={onClose} magnetic={false}>
            Cerrar
          </Button>
        </div>
      </div>

      <div onClick={(e) => e.stopPropagation()} className="flex aspect-[1/1.414] w-[min(680px,100%)] flex-col gap-[26px] bg-bone p-[clamp(26px,5vw,56px)] text-ink">
        <div className="flex items-start justify-between gap-5">
          <Image src="/brand/rowe-logo-negro.png" alt="ROWE" width={97} height={24} unoptimized className="h-6 w-auto" />
          <div className="text-right font-mono text-[9px] uppercase leading-[1.8] tracking-[0.12em] text-ghost">
            {settings.pdf.label}
            <br />
            Nº asignado al descargar
            <br />
            {today}
          </div>
        </div>
        <RichText as="p" className="headline-serif text-[clamp(34px,4.5vw,52px)] leading-[0.95]" text={settings.pdf.title} />
        <div className="flex flex-col border-t border-[rgb(10_10_10/0.2)]">
          {quote.items.map((i) => (
            <div key={i.key} className="flex items-center gap-3.5 border-b border-[rgb(10_10_10/0.12)] py-2.5 text-[13px]">
              <span className="w-6 font-mono text-[9px] tracking-[0.12em] text-ghost">{i.track}</span>
              <span className="flex-1">{i.label}</span>
              <span className="whitespace-nowrap font-mono text-[11px]">
                {range(i.min, i.max)}
                {i.monthly ? "/mes" : ""}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-auto grid grid-cols-3 gap-3">
          {[
            ["Pago único", range(quote.one[0], quote.one[1])],
            ["Mensual", quote.monthly[1] ? range(quote.monthly[0], quote.monthly[1]) : "—"],
            ["Plazo", `${quote.weeks[0]}–${quote.weeks[1]} semanas`],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1">
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ghost">{k}</span>
              <span className="headline-serif text-[clamp(18px,2.6vw,30px)] leading-none">{v}</span>
            </div>
          ))}
        </div>
        <p className="border-t border-[rgb(10_10_10/0.2)] pt-3.5 text-[11px] leading-[1.6] text-ghost">{settings.pdf.note}</p>
        <div className="flex flex-wrap justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-ghost">
          {footer.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
