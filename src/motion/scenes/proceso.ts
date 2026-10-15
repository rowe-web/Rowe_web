import { gsap, ScrollTrigger } from "../gsap";
import { q, qa, type SceneSetup } from "./types";

/** Escena 06 · Proceso: el cabezal recorre la línea de tiempo con el scroll y enciende cada toma. */
export const procesoSetup: SceneSetup = ({ root, mm }) => {
  const timeline = q(root, "[data-proceso-timeline]");
  const head = q(root, "[data-proceso-head]");
  const items = qa(root, "[data-proceso-item]");
  if (!timeline || !head) return;

  mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
    const update = (p: number) => {
      head.style.transform = `translate3d(${p * timeline.clientWidth}px, 0, 0)`;
      head.style.opacity = "1";
      items.forEach((it) => it.toggleAttribute("data-off", p + 0.001 < Number(it.dataset.start)));
    };
    update(0);
    const st = ScrollTrigger.create({
      trigger: timeline,
      start: "top 78%",
      end: "bottom 30%",
      scrub: 0.5,
      onUpdate: (self) => update(self.progress),
      onRefresh: (self) => update(self.progress),
    });
    return () => {
      st.kill();
      gsap.set(head, { clearProps: "transform,opacity" });
      items.forEach((it) => it.removeAttribute("data-off"));
    };
  });
};
