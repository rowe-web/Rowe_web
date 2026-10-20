import { gsap, MQ } from "../gsap";
import { q, qa, type SceneSetup } from "./types";

/**
 * Escena 03 · Desarrollo web: la página del visor se desplaza con el scroll (scrub, solo transform).
 * Un único progreso mueve a la vez la vista de escritorio y la del smartphone, así que las dos
 * van siempre sincronizadas (cada una recorre su propia altura) y cambiar de vista no salta.
 */
export const webSetup: SceneSetup = ({ root, mm }) => {
  const stage = q(root, "[data-web-stage]");
  const pages = qa(root, "[data-web-scroll]");
  if (!stage || !pages.length) return;
  mm.add(MQ.motion, () => {
    const state = { p: 0 };
    const apply = () => {
      for (const page of pages) {
        const frame = page.parentElement;
        if (!frame) continue;
        const dist = Math.max(0, page.scrollHeight - frame.clientHeight * 0.92);
        gsap.set(page, { y: -state.p * dist });
      }
    };
    gsap.to(state, {
      p: 1,
      ease: "none",
      onUpdate: apply,
      scrollTrigger: { trigger: stage, start: "top 85%", end: "bottom 15%", scrub: 0.5, invalidateOnRefresh: true, onRefresh: apply },
    });
  });
};
