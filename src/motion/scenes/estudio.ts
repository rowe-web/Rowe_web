import { EASE, gsap, MQ, ScrollTrigger } from "../gsap";
import { q, qa, type SceneSetup } from "./types";

/**
 * Escena 01 · El estudio
 *  - Manifiesto que se ilumina palabra a palabra con el scroll (opacidad: barato para la GPU).
 *    Escritorio: escena pinneada. Móvil/tablet: sin pin, ligado al paso del texto.
 *  - Cabezal (1b) que sigue al frente de lectura.
 *  - Cifras que cuentan al entrar (el «0 plantillas» hace cuenta atrás, como una claqueta).
 */
export const estudioSetup: SceneSetup = ({ root, mm }) => {
  const manifesto = q(root, "[data-manifesto]");
  const words = qa(root, "[data-manifesto] [data-word]");
  const counters = qa(root, "[data-count]");
  if (!manifesto || !words.length) return;

  // Cabezal: barra fina que se coloca tras la última palabra iluminada
  const head = document.createElement("span");
  head.setAttribute("aria-hidden", "true");
  head.className = "pointer-events-none absolute left-0 top-0 w-[2px] bg-bone opacity-0";
  manifesto.style.position = "relative";
  manifesto.appendChild(head);

  let boxes: { x: number; y: number; h: number }[] = [];
  const measure = () => {
    const base = manifesto.getBoundingClientRect();
    const rects = words.map((w) => w.getBoundingClientRect());
    boxes = rects.map((r, i) => {
      // Centrado en el espacio hasta la siguiente palabra (si está en la misma línea)
      const next = rects[i + 1];
      const gapEnd = next && Math.abs(next.top - r.top) < r.height / 2 ? next.left : r.right + 12;
      return { x: (r.right + gapEnd) / 2 - base.left - 1, y: r.top - base.top + r.height * 0.1, h: r.height * 0.82 };
    });
  };

  const light = (progress: number) => {
    const n = words.length;
    const lit = progress * n;
    words.forEach((w, i) => {
      const o = 0.28 + 0.72 * gsap.utils.clamp(0, 1, lit - i);
      w.style.opacity = String(o);
    });
    const idx = Math.min(n - 1, Math.max(0, Math.ceil(lit) - 1));
    const b = boxes[idx];
    if (b) {
      head.style.transform = `translate3d(${b.x}px, ${b.y}px, 0)`;
      head.style.height = `${b.h}px`;
      head.style.opacity = progress > 0.01 && progress < 0.995 ? "1" : "0";
    }
  };

  const setupScrub = (pin: boolean) => {
    measure();
    const st = ScrollTrigger.create({
      trigger: pin ? root : manifesto,
      start: pin ? "top top" : "top 78%",
      end: pin ? "+=130%" : "bottom 45%",
      pin,
      pinSpacing: true,
      scrub: 0.4,
      onRefresh: (self) => {
        measure();
        light(self.progress);
      },
      onUpdate: (self) => light(self.progress),
    });
    return () => st.kill();
  };

  mm.add(MQ.desktop, () => setupScrub(true));
  mm.add(MQ.notDesktop, () => setupScrub(false));
  mm.add(MQ.reduced, () => {
    words.forEach((w) => (w.style.opacity = "1"));
    head.style.opacity = "0";
  });

  // Cifras
  mm.add(MQ.motion, () => {
    counters.forEach((el) => {
      const target = Number(el.dataset.count);
      if (!Number.isFinite(target)) return;
      const from = target === 0 ? 9 : 0;
      const state = { v: from };
      el.textContent = String(from);
      gsap.to(state, {
        v: target,
        duration: target === 0 ? 1.6 : 1.2,
        ease: EASE.out,
        snap: { v: 1 },
        onUpdate: () => (el.textContent = String(Math.round(state.v))),
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    });
    return () => counters.forEach((el) => (el.textContent = el.dataset.count ?? el.textContent));
  });

  return () => head.remove();
};
