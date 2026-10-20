"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

// Registro único de plugins (idempotente).
gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Curvas del diseño en GSAP: «cut» ≈ cubic-bezier(.76,0,.24,1) · «out» ≈ cubic-bezier(.22,1,.36,1) */
export const EASE = { cut: "power4.inOut", out: "power3.out" } as const;

ScrollTrigger.config({
  // En móvil, la barra del navegador cambia la altura: no recalcular por eso (evita saltos).
  ignoreMobileResize: true,
});

/** Consultas de gsap.matchMedia compartidas por todas las escenas. */
export const MQ = {
  desktop: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
  tablet: "(min-width: 768px) and (max-width: 1023.98px) and (prefers-reduced-motion: no-preference)",
  mobile: "(max-width: 767.98px) and (prefers-reduced-motion: no-preference)",
  notDesktop: "(max-width: 1023.98px) and (prefers-reduced-motion: no-preference)",
  motion: "(prefers-reduced-motion: no-preference)",
  reduced: "(prefers-reduced-motion: reduce)",
  touch: "(hover: none), (pointer: coarse)",
} as const;

export { gsap, ScrollTrigger, useGSAP };
