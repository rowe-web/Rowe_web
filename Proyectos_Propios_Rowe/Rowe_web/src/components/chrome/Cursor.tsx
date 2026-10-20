"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/motion/gsap";
import { canHover, prefersReducedMotion } from "@/motion/media";

type Mode = "base" | "link" | "text" | "label";

/**
 * Cursor personalizado (implementación de ROWE Presupuesto + estados de ROWE Direcciones):
 *  base   · punto + anillo que le sigue con retardo (lerp)
 *  link   · el anillo crece sobre enlaces y botones
 *  text   · barra de texto en campos
 *  label  · píldora con texto: [data-cursor] → «▶ Ver», «❚❚ Pausa», «Ver proyecto», «Arrastra ←→»…
 *  clic   · pulso del anillo · modo REC: el punto se vuelve rojo dentro de «Hablemos»
 * Además mueve el halo de luz que sigue al ratón (variables --mx/--my).
 * Solo con ratón y sin movimiento reducido; nunca bloquea clics (pointer-events: none).
 */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canHover() || prefersReducedMotion() || !ring.current || !dot.current) return;
    const r = ring.current;
    const d = dot.current;
    const root = document.documentElement;
    root.classList.add("has-cursor");

    const ringX = gsap.quickTo(r, "x", { duration: 0.38, ease: "power3.out" });
    const ringY = gsap.quickTo(r, "y", { duration: 0.38, ease: "power3.out" });
    const dotX = gsap.quickSetter(d, "x", "px");
    const dotY = gsap.quickSetter(d, "y", "px");
    let mode: Mode | "" = "";
    let label = "";
    let visible = false;

    const setMode = (m: Mode, text = "") => {
      if (m === mode && text === label) return;
      mode = m;
      label = text;
      r.dataset.mode = m;
      r.textContent = m === "label" ? text : "";
    };

    const labelFor = (el: HTMLElement) => {
      const video = el.querySelector("video");
      if (video && !video.paused) return "❚❚ Pausa";
      return el.getAttribute("data-cursor") ?? "";
    };

    const resolve = (target: Element | null) => {
      const t = target as HTMLElement | null;
      if (!t?.closest) return setMode("base");
      const labelled = t.closest<HTMLElement>("[data-cursor]");
      if (labelled && labelled.getAttribute("data-cursor")) return setMode("label", labelFor(labelled));
      if (t.closest("input, textarea, select, [contenteditable='true']")) return setMode("text");
      if (t.closest("a, button, [role='button'], label")) return setMode("link");
      setMode("base");
      d.dataset.rec = t.closest("#hablemos, [data-cursor-rec]") ? "1" : "";
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (!visible) {
        visible = true;
        gsap.set([r, d], { x: e.clientX, y: e.clientY });
        gsap.to([r, d], { autoAlpha: 1, duration: 0.2 });
      }
      ringX(e.clientX);
      ringY(e.clientY);
      dotX(e.clientX);
      dotY(e.clientY);
      root.style.setProperty("--mx", `${e.clientX}px`);
      root.style.setProperty("--my", `${e.clientY}px`);
    };
    const onOver = (e: PointerEvent) => resolve(e.target as Element);
    const onDown = () => gsap.fromTo(r, { scale: 0.75 }, { scale: 1, duration: 0.32, ease: "power3.out" });
    const onLeave = () => {
      visible = false;
      gsap.to([r, d], { autoAlpha: 0, duration: 0.2 });
    };
    // Al reproducir/pausar vídeos, la etiqueta cambia sin mover el ratón
    const onMedia = () => {
      const under = document.querySelectorAll(":hover");
      resolve(under[under.length - 1] ?? null);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.addEventListener("play", onMedia, true);
    document.addEventListener("pause", onMedia, true);
    setMode("base");

    return () => {
      root.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("play", onMedia, true);
      document.removeEventListener("pause", onMedia, true);
    };
  }, []);

  return (
    <>
      {/* Halo de luz que sigue al ratón (detrás del contenido) */}
      <div aria-hidden="true" className="cursor-halo pointer-events-none fixed inset-0 z-0" />
      <div aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[400] mix-blend-difference">
        <div ref={ring} className="cursor-ring" data-mode="base" />
        <div ref={dot} className="cursor-dot" />
      </div>
    </>
  );
}
