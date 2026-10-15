import { EASE, gsap, MQ } from "../gsap";
import { whenReady } from "../ready";
import { q, qa, type SceneSetup } from "./types";

/**
 * Escena 00 · Hero
 *  - Entrada (tras el preloader / la cortinilla): líneas del titular por máscara, figuras y textos.
 *  - Escritorio: el showreel «Fig. 02» crece con el scroll hasta el letterbox 2.39:1 a pantalla
 *    completa (FLIP con scrub: solo transform). El titular sube con parallax suave.
 *  - Todas las anchuras: el cabezal recorre las pistas RO/WE con el scroll.
 */
export const heroSetup: SceneSetup = ({ root, mm }) => {
  const lines = qa(root, "[data-hero-title] [data-line-inner]");
  const title = q(root, "[data-hero-title]");
  const editorial = q(root, "[data-hero-editorial]");
  const screening = q(root, "[data-hero-screening]");
  const source = q(root, "[data-hero-reel-source]");
  const targetOuter = q(root, "[data-hero-reel-target]");
  const target = targetOuter?.firstElementChild as HTMLElement | null;
  const timeline = q(root, "[data-hero-timeline]");
  const head = q(root, "[data-hero-playhead]");
  const intro = qa(root, "[data-hero-intro]");

  // --- Entrada ---------------------------------------------------------------
  mm.add(MQ.motion, () => {
    gsap.set(intro, { opacity: 0, y: 24 });
    const cancel = whenReady(() => {
      const tl = gsap.timeline({ defaults: { ease: EASE.cut } });
      tl.to(lines, { yPercent: 0, y: 0, duration: 1.25, stagger: 0.11 }, 0.05).to(
        intro,
        { opacity: 1, y: 0, duration: 1, stagger: 0.07, clearProps: "transform" },
        0.45,
      );
    });
    return cancel;
  });
  mm.add(MQ.reduced, () => {
    gsap.set(lines, { yPercent: 0 });
  });

  // --- Escritorio: el showreel crece hasta el letterbox ------------------------
  mm.add(MQ.desktop, () => {
    if (!source || !targetOuter || !target || !screening) return;
    // Medimos contenedores sin transformar (el exterior), animamos el interior.
    const measure = () => {
      const s = source.getBoundingClientRect();
      const t = targetOuter.getBoundingClientRect();
      return { dx: s.left - t.left, dy: s.top - t.top, scale: s.width / t.width };
    };
    gsap.set(source, { autoAlpha: 0 });
    gsap.fromTo(
      target,
      { x: () => measure().dx, y: () => measure().dy, scale: () => measure().scale, transformOrigin: "0 0" },
      {
        x: 0,
        y: 0,
        scale: 1,
        ease: "none",
        scrollTrigger: { trigger: screening, start: "top bottom", end: "top top", scrub: true, invalidateOnRefresh: true },
      },
    );
    if (title && editorial) {
      gsap.to(title, {
        yPercent: -18,
        opacity: 0.35,
        ease: "none",
        scrollTrigger: { trigger: editorial, start: "top top", end: "bottom top", scrub: true },
      });
    }
  });

  // --- Cabezal sobre las pistas ---------------------------------------------
  mm.add(MQ.motion, () => {
    if (!timeline || !head) return;
    const track = timeline.querySelector<HTMLElement>("[data-hero-track-area]");
    gsap.fromTo(
      head,
      { x: 0 },
      {
        x: () => (track ? track.getBoundingClientRect().width : timeline.clientWidth * 0.6),
        ease: "none",
        scrollTrigger: { trigger: screening ?? timeline, start: "top 75%", end: "bottom top", scrub: 0.6, invalidateOnRefresh: true },
      },
    );
  });
};
