"use client";

import type { HablemosSettings } from "./settings";
import { useHablemos } from "./store";

/** «Viene del configurador» — resumen de la configuración enviada al formulario. */
export function PrefillBox({ settings, variant }: { settings: HablemosSettings; variant: "section" | "overlay" }) {
  const { prefill } = useHablemos();
  if (!prefill) return null;
  return (
    <div className="toast-in flex flex-col gap-3 border border-line-strong px-[22px] py-5">
      <div className="flex justify-between gap-3 label-mono text-[10px] text-muted">
        <span>{variant === "overlay" ? settings.prefill_overlay_label : settings.prefill_label}</span>
        {variant === "section" && (
          <a href="#presupuesto" className="border-b border-line-cta text-bone">
            {settings.prefill_edit}
          </a>
        )}
      </div>
      <span className="headline-serif text-[clamp(30px,3vw,36px)] leading-none">{prefill.range}</span>
      <span className="font-mono text-[10px] uppercase leading-[1.8] tracking-[0.08em] text-muted">{prefill.items}</span>
    </div>
  );
}
