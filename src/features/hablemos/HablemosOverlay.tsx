"use client";

import { useEffect, useRef } from "react";
import { Logo } from "@/components/brand/Logo";
import { RichText } from "@/components/ui/RichText";
import type { ContactSettings } from "@/lib/content/settings";
import { EASE, gsap } from "@/motion/gsap";
import { prefersReducedMotion } from "@/motion/media";
import { useMotionOptional } from "@/motion/MotionProvider";
import { HablemosForm } from "./HablemosForm";
import { PrefillBox } from "./PrefillBox";
import type { HablemosSettings } from "./settings";
import { hablemos, useHablemos } from "./store";

/**
 * Overlay «Hablemos» (ROWE Presupuesto): se abre desde «Hablemos» de la cabecera o
 * desde «Enviar y hablemos» del configurador. Corte desde el centro, Esc para cerrar,
 * scroll de la página bloqueado y foco dentro del diálogo.
 */
export function HablemosOverlay({ settings, contact, closeLabel }: { settings: HablemosSettings; contact: ContactSettings; closeLabel: string }) {
  const { overlayOpen } = useHablemos();
  const root = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const motion = useMotionOptional();

  useEffect(() => {
    if (!overlayOpen || !root.current) return;
    const el = root.current;
    opener.current = document.activeElement as HTMLElement;
    motion?.lock();
    el.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    if (!prefersReducedMotion()) {
      gsap.fromTo(el, { clipPath: "inset(50% 0% 50% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.8, ease: EASE.cut });
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hablemos.close();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      motion?.unlock();
      opener.current?.focus?.({ preventScroll: true });
    };
  }, [overlayOpen, motion]);

  const close = () => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return hablemos.close();
    gsap.to(el, { clipPath: "inset(50% 0% 50% 0%)", duration: 0.5, ease: EASE.cut, onComplete: () => hablemos.close() });
  };

  if (!overlayOpen) return null;
  return (
    <div ref={root} role="dialog" aria-modal="true" aria-label="Hablemos" data-lenis-prevent data-cursor-rec className="fixed inset-0 z-[200] overflow-y-auto bg-ink">
      <div className="sticky top-0 z-[2] flex h-16 items-center justify-between border-b border-line-soft bg-ink gutter-x md:h-[76px]">
        <Logo height={18} href={null} />
        <span className="hidden label-mono text-muted md:inline">{settings.kicker}</span>
        <button type="button" onClick={close} className="flex min-h-11 items-center gap-2.5 text-[14px] hover:text-white">
          {closeLabel} <span className="label-mono text-[10px] text-muted max-md:hidden">Esc</span>
        </button>
      </div>
      <div className="flex flex-wrap items-start gap-[clamp(32px,5vw,96px)] gutter-x pb-[8vh] pt-[7vh]">
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-6">
          <RichText as="p" className="headline-serif text-[clamp(64px,8vw,128px)] leading-[0.9]" text={settings.overlay_title} />
          <p className="max-w-[36ch] text-[18px] leading-relaxed text-muted">{settings.overlay_lead}</p>
          <PrefillBox settings={settings} variant="overlay" />
        </div>
        <div className="min-w-0 flex-[1.4_1_520px]">
          <HablemosForm settings={settings} contact={contact} variant="overlay" />
        </div>
      </div>
    </div>
  );
}
