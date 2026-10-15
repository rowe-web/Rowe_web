import { gsap, MQ, ScrollTrigger } from "../gsap";
import { q, qa, type SceneSetup } from "./types";

/**
 * Escena 05 · Ecosistema — scroll pinneado en N pasos (escritorio).
 * Cada tramo de scroll activa un paso; la señal REC viaja de forma continua por el
 * diagrama RO → WE. En tablet/móvil no hay pin: los pasos se iluminan al cruzar el centro.
 */
export const ecosistemaSetup: SceneSetup = ({ root, mm }) => {
  const steps = qa(root, "[data-eco-step]");
  const segs = qa(root, "[data-eco-seg]");
  const nodes = qa(root, "[data-eco-node]");
  const signal = q(root, "[data-eco-signal]");
  const current = q(root, "[data-eco-current]");
  const stage = q(root, "[data-eco-stage]");
  const n = steps.length;
  if (!n || !stage) return;

  let active = -1;
  const setActive = (i: number) => {
    if (i === active) return;
    active = i;
    steps.forEach((s, k) => s.toggleAttribute("data-off", k !== i));
    nodes.forEach((s, k) => s.toggleAttribute("data-on", k <= i));
    if (current) current.textContent = String(i + 1).padStart(2, "0");
  };
  const reset = () => {
    active = -1;
    steps.forEach((s) => s.removeAttribute("data-off"));
    nodes.forEach((s) => s.setAttribute("data-on", ""));
    segs.forEach((s) => (s.style.transform = ""));
  };

  // Posiciones de los nodos (relativas a su contenedor) para mover la señal en continuo
  let points: { x: number; y: number }[] = [];
  const measure = () => {
    const box = signal?.offsetParent as HTMLElement | null;
    if (!box) return;
    const b = box.getBoundingClientRect();
    points = nodes.map((nd) => {
      const r = nd.getBoundingClientRect();
      return { x: r.left + r.width / 2 - b.left, y: r.top + r.height / 2 - b.top };
    });
  };
  const moveSignal = (t: number) => {
    if (!signal || points.length < 2) return;
    const f = gsap.utils.clamp(0, n - 1, t * (n - 1));
    const i = Math.min(n - 2, Math.floor(f));
    const k = f - i;
    const x = points[i].x + (points[i + 1].x - points[i].x) * k;
    const y = points[i].y + (points[i + 1].y - points[i].y) * k;
    signal.style.left = "0px";
    signal.style.top = "0px";
    // El centrado (-50 %) ya lo pone la propiedad CSS `translate` de Tailwind.
    signal.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  mm.add(MQ.desktop, () => {
    setActive(0);
    const st = ScrollTrigger.create({
      trigger: root,
      start: "top top",
      end: () => `+=${n * 70}%`,
      pin: true,
      scrub: true,
      onRefresh: (self) => {
        measure();
        moveSignal(self.progress);
      },
      onUpdate: (self) => {
        const p = self.progress;
        setActive(Math.min(n - 1, Math.floor(p * n)));
        segs.forEach((s, k) => {
          const local = gsap.utils.clamp(0, 1, p * n - k);
          s.style.transform = `scaleX(${local})`;
        });
        moveSignal(p);
      },
    });
    return () => {
      st.kill();
      reset();
    };
  });

  mm.add(MQ.notDesktop, () => {
    setActive(0);
    const triggers = steps.map((s, i) =>
      ScrollTrigger.create({
        trigger: s,
        start: "top 62%",
        end: "bottom 38%",
        onToggle: (self) => self.isActive && setActive(i),
      }),
    );
    return () => {
      triggers.forEach((t) => t.kill());
      reset();
    };
  });
};
