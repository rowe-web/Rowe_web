"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { canHover, prefersReducedMotion } from "./media";

/**
 * Efecto magnético del diseño (ROWE Presupuesto): el elemento sigue al ratón
 * cuando está cerca (radio = max(ancho, 90 px)), con factor 0.15 en X y 0.25 en Y.
 * Solo anima transform, solo con ratón y nunca con movimiento reducido.
 */
export function useMagnetic<T extends HTMLElement>(ref: RefObject<T | null>, enabled = true, strength = { x: 0.15, y: 0.25 }) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || !canHover() || prefersReducedMotion()) return;

    const toX = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
    const toY = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
    let frame = 0;
    let active = false;

    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = el.getBoundingClientRect();
        // El rect incluye la traslación actual: la descontamos para medir desde el reposo.
        const tx = Number(gsap.getProperty(el, "x")) || 0;
        const ty = Number(gsap.getProperty(el, "y")) || 0;
        const cx = r.left - tx + r.width / 2;
        const cy = r.top - ty + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const near = Math.hypot(dx, dy) < Math.max(r.width, 90);
        if (near) {
          active = true;
          toX(dx * strength.x);
          toY(dy * strength.y);
        } else if (active) {
          active = false;
          toX(0);
          toY(0);
        }
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
      gsap.killTweensOf(el);
      gsap.set(el, { x: 0, y: 0 });
    };
  }, [ref, enabled, strength.x, strength.y]);
}
