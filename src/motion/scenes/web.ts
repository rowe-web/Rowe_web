import { gsap, MQ } from "../gsap";
import { q, type SceneSetup } from "./types";

/** Escena 03 · Desarrollo web: la página del visor se desplaza con el scroll (scrub, solo transform). */
export const webSetup: SceneSetup = ({ root, mm }) => {
  const page = q(root, "[data-web-scroll]");
  const frame = page?.parentElement;
  if (!page || !frame) return;
  mm.add(MQ.motion, () => {
    gsap.to(page, {
      y: () => -Math.max(0, page.scrollHeight - frame.clientHeight * 0.92),
      ease: "none",
      scrollTrigger: { trigger: frame, start: "top 85%", end: "bottom 15%", scrub: 0.5, invalidateOnRefresh: true },
    });
  });
};
