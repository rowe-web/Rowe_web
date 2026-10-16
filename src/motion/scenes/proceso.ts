import { gsap, MQ, ScrollTrigger } from "../gsap";
import { q, qa, type SceneSetup } from "./types";

/**
 * Escena 06 · Proceso: el cabezal recorre la línea de tiempo con el scroll y enciende cada toma.
 * Móvil (< 768 px, línea vertical): la línea se dibuja de arriba abajo pegada al scroll (sin
 * suavizado: sigue al dedo) con la punta siempre al 70 % de la pantalla; cada hito se enciende
 * justo cuando la punta llega a su punto.
 */
export const procesoSetup: SceneSetup = ({ root, mm }) => {
  const timeline = q(root, "[data-proceso-timeline]");
  const head = q(root, "[data-proceso-head]");
  const items = qa(root, "[data-proceso-item]");
  // Móvil: línea vertical
  const vlist = q(root, "[data-proceso-vline-list]");
  const vline = q(root, "[data-proceso-vline]");
  const vitems = qa(root, "[data-proceso-vitem]");
  if (vlist && vline && vitems.length) {
    mm.add(MQ.mobile, () => {
      // Dónde está cada nodo a lo largo de la línea (0–1), medido al refrescar
      let marks: number[] = [];
      const measure = () => {
        const h = vlist.offsetHeight || 1;
        marks = vitems.map((it) => {
          const node = it.querySelector<HTMLElement>("[data-proceso-vnode]");
          return ((it.offsetTop + (node ? node.offsetTop + node.offsetHeight / 2 : 0)) / h);
        });
      };
      const update = (p: number) => {
        vline.style.transform = `scaleY(${p})`;
        vitems.forEach((it, i) => {
          const on = p + 0.001 >= marks[i];
          it.toggleAttribute("data-off", !on);
          it.toggleAttribute("data-on", on);
        });
      };
      const st = ScrollTrigger.create({
        trigger: vlist,
        start: "top 70%",
        end: "bottom 70%",
        onRefresh: (self) => {
          measure();
          update(self.progress);
        },
        onUpdate: (self) => update(self.progress),
      });
      measure();
      update(st.progress);
      return () => {
        st.kill();
        vline.style.transform = "";
        vitems.forEach((it) => {
          it.removeAttribute("data-off");
          it.removeAttribute("data-on");
        });
      };
    });
  }

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
