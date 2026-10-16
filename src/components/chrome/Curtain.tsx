"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { registerCurtainOpener, setCurtainPending } from "@/motion/curtain";
import { EASE, gsap } from "@/motion/gsap";
import { prefersReducedMotion } from "@/motion/media";
import { useMotion } from "@/motion/MotionProvider";
import { replayPage } from "@/motion/replay";

/**
 * Cortinilla entre páginas con timecode.
 * Al pulsar un enlace interno a otra página: las dos mitades negras se cierran
 * (como el letterbox del diseño, al revés) mostrando el destino y el timecode; se
 * navega por debajo y la página nueva la abre al estar lista. Botón «atrás»: el
 * navegador ya ha cambiado de página, así que no hay cierre, solo la página nueva.
 * Enlace a la propia página sin ancla (el logo estando en la home): la misma cortinilla;
 * por debajo se sube arriba del todo, se cierran menú y overlays y la página se vuelve a
 * montar, así que todas sus animaciones empiezan de nuevo.
 */
export function Curtain() {
  const router = useRouter();
  const { lock, unlock, scrollTo } = useMotion();
  const top = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const info = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    const halves = [top.current, bottom.current];
    let failsafe = 0;

    const open = () => {
      window.clearTimeout(failsafe);
      // Dos fotogramas: la página nueva ya está pintada y medida
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          gsap
            .timeline({
              onComplete: () => {
                setCurtainPending(false);
                busy.current = false;
                gsap.set(".rowe-curtain", { autoAlpha: 0 });
                unlock();
              },
            })
            .to(info.current, { autoAlpha: 0, duration: 0.25 })
            .to(halves, { scaleY: 0, duration: 0.85, ease: EASE.cut, stagger: 0 }, 0.05);
        }),
      );
    };
    registerCurtainOpener(open);

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.dataset.noTransition !== undefined) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const samePage = url.pathname === window.location.pathname && url.search === window.location.search;
      // Ancla en la misma página: la gestiona el scroll suave (MotionProvider)
      if (samePage && url.hash) return;
      if (busy.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Volver a empezar la página actual (por debajo de la cortinilla, si la hay)
      const restart = () => {
        window.dispatchEvent(new Event("rowe:covered"));
        history.replaceState(history.state, "", url.pathname + url.search);
        scrollTo(0, { immediate: true });
        window.scrollTo(0, 0);
        replayPage();
      };
      if (prefersReducedMotion()) {
        if (!samePage) return; // navegación normal, sin cortinilla
        e.preventDefault();
        e.stopPropagation();
        restart();
        return;
      }
      // Fase de captura: actuamos antes que el onClick de <Link> y lo detenemos
      e.preventDefault();
      e.stopPropagation();
      busy.current = true;
      setCurtainPending(true);
      lock();

      const name = (a.dataset.transitionLabel || a.textContent || url.pathname).replace(/\s+/g, " ").replace(/[→↗↓]/g, "").trim();
      if (label.current) label.current.textContent = name.slice(0, 42);

      gsap.set(".rowe-curtain", { autoAlpha: 1 });
      gsap
        .timeline({
          onComplete: () => {
            // La página vuelta a montar (o la nueva) abre la cortinilla al estar lista
            if (samePage) restart();
            else router.push(url.pathname + url.search + url.hash, { scroll: false });
            // Si algo fallara, no dejamos la web tapada
            failsafe = window.setTimeout(open, 8000);
          },
        })
        .fromTo(halves, { scaleY: 0 }, { scaleY: 1, duration: 0.6, ease: EASE.cut, onComplete: () => window.dispatchEvent(new Event("rowe:covered")) })
        .fromTo(info.current, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.35);
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      registerCurtainOpener(null);
      window.clearTimeout(failsafe);
    };
  }, [router, lock, unlock, scrollTo]);

  return (
    <div aria-hidden="true" className="rowe-curtain pointer-events-none invisible fixed inset-0 z-[450] opacity-0">
      <div ref={top} className="absolute inset-x-0 top-0 h-1/2 origin-top scale-y-0 bg-black" />
      <div ref={bottom} className="absolute inset-x-0 bottom-0 h-1/2 origin-bottom scale-y-0 bg-black" />
      <div ref={info} className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center gap-3 opacity-0">
        <span className="label-mono text-muted">
          Escena — <span ref={label} />
        </span>
        <span data-tc className="label-mono text-bone tabular-nums">
          00:00:00:00
        </span>
      </div>
    </div>
  );
}
