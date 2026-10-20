"use client";

import { useEffect, useRef } from "react";
import { gsap } from "./gsap";
import { useMotionOptional } from "./MotionProvider";
import { carouselSetup } from "./scenes/carousel";
import { ecosistemaSetup } from "./scenes/ecosistema";
import { estudioSetup } from "./scenes/estudio";
import { heroSetup } from "./scenes/hero";
import { procesoSetup } from "./scenes/proceso";
import type { SceneSetup } from "./scenes/types";
import { webSetup } from "./scenes/web";

const setups = {
  hero: heroSetup,
  estudio: estudioSetup,
  web: webSetup,
  ecosistema: ecosistemaSetup,
  proceso: procesoSetup,
  carousel: carouselSetup,
} satisfies Record<string, SceneSetup>;

export type SceneMotionName = keyof typeof setups;

/**
 * «Isla» de movimiento: se coloca dentro de una escena (componente de servidor) y
 * anima su sección. Todo lo que crea vive en un gsap.context + gsap.matchMedia con
 * ámbito en la escena, y se deshace al desmontar (cambio de página) o al cruzar un
 * breakpoint: sin fugas, sin ScrollTriggers huérfanos ni animaciones duplicadas.
 * Fuera de <MotionProvider> (p. ej. la guía de estilo) no hace nada.
 */
export function SceneMotion({ name }: { name: SceneMotionName }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motion = useMotionOptional();

  useEffect(() => {
    if (!motion) return;
    const root = ref.current?.closest<HTMLElement>("[data-scene]");
    if (!root) return;
    const mm = gsap.matchMedia(root);
    let extra: void | (() => void);
    const ctx = gsap.context(() => {
      extra = setups[name]({ root, mm });
    }, root);
    motion.refresh();
    return () => {
      if (typeof extra === "function") extra();
      mm.revert();
      ctx.revert();
    };
  }, [name, motion]);

  return <span ref={ref} hidden aria-hidden="true" />;
}
