import { gsap } from "../gsap";
import { q, type SceneSetup } from "./types";

/**
 * Carrusel horizontal (Escena 07 · Proyectos).
 * Ratón: arrastrar con inercia; si se ha arrastrado, no se dispara el clic del enlace.
 * Táctil: deslizamiento nativo con scroll-snap (no interferimos: el gesto vertical
 * sigue desplazando la página). La rueda vertical sigue bajando la página.
 */
export const carouselSetup: SceneSetup = ({ root, mm }) => {
  const track = q(root, "[data-carousel]");
  if (!track) return;

  mm.add("(hover: hover) and (pointer: fine)", () => {
    let down = false;
    let moved = 0;
    let startX = 0;
    let startScroll = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;
    let inertia: gsap.core.Tween | null = null;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      down = true;
      moved = 0;
      startX = lastX = e.clientX;
      startScroll = track.scrollLeft;
      lastT = performance.now();
      velocity = 0;
      inertia?.kill();
      track.style.scrollSnapType = "none";
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      if (moved > 4) track.setPointerCapture?.(e.pointerId);
      track.scrollLeft = startScroll - dx;
      const now = performance.now();
      velocity = (e.clientX - lastX) / Math.max(1, now - lastT);
      lastX = e.clientX;
      lastT = now;
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      down = false;
      track.releasePointerCapture?.(e.pointerId);
      const target = track.scrollLeft - velocity * 420;
      inertia = gsap.to(track, {
        scrollLeft: target,
        duration: 0.9,
        ease: "power3.out",
        onComplete: () => {
          track.style.scrollSnapType = "";
        },
      });
    };
    // Si se ha arrastrado, el clic no navega
    const onClick = (e: MouseEvent) => {
      if (moved > 6) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const noDrag = (e: DragEvent) => e.preventDefault();

    track.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    track.addEventListener("click", onClick, true);
    track.addEventListener("dragstart", noDrag);
    return () => {
      inertia?.kill();
      track.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      track.removeEventListener("click", onClick, true);
      track.removeEventListener("dragstart", noDrag);
      track.style.scrollSnapType = "";
    };
  });
};
