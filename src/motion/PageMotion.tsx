"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { EASE, gsap, MQ, ScrollTrigger } from "./gsap";
import { canHover, prefersReducedMotion } from "./media";
import { openCurtainIfPending } from "./curtain";
import { whenReady } from "./ready";
import { useMotion } from "./MotionProvider";

/**
 * Movimiento común de cada página (se monta en template.tsx: se recrea al navegar
 * y se limpia por completo al salir, sin fugas ni animaciones duplicadas).
 *  - Revelados [data-reveal]: "" (fundido + subida) · "mask" (máscara) · "wipe" (cortinilla)
 *  - Vídeos [data-autoplay]: solo se reproducen mientras se ven
 *  - Táctil: [data-scroll-active] recibe data-active al cruzar el centro (los hovers pasan a scroll)
 */
export function PageMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const { refresh } = useMotion();

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let ctx: gsap.Context | null = null;
    let mm: gsap.MatchMedia | null = null;
    let io: IntersectionObserver | null = null;
    const listeners = new AbortController();
    // Si venimos de una cortinilla, se abre ahora que la página nueva está montada
    openCurtainIfPending();

    const cancel = whenReady(() => {
      const reduced = prefersReducedMotion();
      ctx = gsap.context(() => {
        // --- Revelados por lotes (una sola pasada por elemento) ---
        const items = gsap.utils.toArray<HTMLElement>("[data-reveal]", el);
        items.forEach((item) => {
          const kind = item.dataset.reveal || "fade";
          if (reduced) gsap.set(item, { opacity: 0 });
          else if (kind === "mask") gsap.set(item, { opacity: 0, yPercent: 18, clipPath: "inset(0% 0% 100% 0%)" });
          else if (kind === "wipe") gsap.set(item, { opacity: 0, clipPath: "inset(0% 50% 0% 50%)" });
          else gsap.set(item, { opacity: 0, y: 36 });
        });
        const reveal = (batch: Element[]) => {
          const pending = batch.filter((b) => !(b as HTMLElement).dataset.revealed);
          if (!pending.length) return;
          pending.forEach((b) => ((b as HTMLElement).dataset.revealed = "1"));
          gsap.to(pending, {
            opacity: 1,
            y: 0,
            yPercent: 0,
            clipPath: "inset(0% 0% 0% 0%)",
            duration: reduced ? 0.5 : 1,
            ease: EASE.cut,
            // Escalonado, pero un grupo grande no tarda más de medio segundo en completarse
            stagger: { amount: Math.min(0.5, (pending.length - 1) * 0.08) },
            overwrite: true,
            clearProps: "transform,clipPath",
          });
        };
        // Los elementos dentro de una escena pinneada se calculan con su contenedor
        // (si no, sus posiciones ignorarían el espacio del pin). Se revelan al entrar
        // bajando o subiendo: nada se queda oculto si un ancla salta por encima.
        // Los que entran en el mismo fotograma se revelan juntos, escalonados.
        let queue: HTMLElement[] = [];
        let frame = 0;
        const enqueue = (item: HTMLElement) => {
          queue.push(item);
          if (frame) return;
          frame = requestAnimationFrame(() => {
            frame = 0;
            const batch = queue;
            queue = [];
            reveal(batch);
          });
        };
        // Activo desde su punto de entrada hasta el final de la página ("max"): si se llega
        // saltando (ancla, atrás, restauración), se revela igualmente.
        // Dentro de una escena pinneada, el disparador es la propia escena (sus elementos
        // no se mueven durante el pin, así que se revelan juntos al llegar a ella).
        items.forEach((item) => {
          const pinned = item.closest<HTMLElement>("[data-pin-container]");
          ScrollTrigger.create({
            trigger: pinned ?? item,
            start: pinned ? "top 85%" : "top 92%",
            end: "max",
            onEnter: () => enqueue(item),
          });
        });

        // --- Hovers por scroll en táctil ---
        mm = gsap.matchMedia();
        // --- Parallax suave [data-parallax="velocidad"] (no en móvil ni con movimiento reducido) ---
        mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
          gsap.utils.toArray<HTMLElement>("[data-parallax]", el).forEach((node) => {
            const speed = Number(node.dataset.parallax) || 0.1;
            gsap.fromTo(
              node,
              { y: () => speed * window.innerHeight * 0.5 },
              {
                y: () => -speed * window.innerHeight * 0.5,
                ease: "none",
                scrollTrigger: { trigger: node, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true },
              },
            );
          });
        });

        mm.add(MQ.touch, () => {
          gsap.utils.toArray<HTMLElement>("[data-scroll-active]", el).forEach((node) => {
            ScrollTrigger.create({
              trigger: node,
              start: "top 62%",
              end: "bottom 38%",
              onToggle: (self) => node.toggleAttribute("data-active", self.isActive),
            });
          });
        });
      }, el);

      // --- Vídeos: reproducir solo en pantalla (y nunca con movimiento reducido) ---
      if (!reduced) {
        io = new IntersectionObserver(
          (entries) =>
            entries.forEach((e) => {
              const v = e.target as HTMLVideoElement;
              if (e.isIntersecting) v.play().catch(() => {});
              else v.pause();
            }),
          { rootMargin: "120px 0px" },
        );
        el.querySelectorAll("video[data-autoplay]").forEach((v) => io!.observe(v));
      }

      // Vídeos que se reproducen al pasar el ratón (máscara «RO»)
      if (canHover()) {
        el.querySelectorAll<HTMLVideoElement>("video[data-hover-play]").forEach((v) => {
          const host = v.closest<HTMLElement>("[data-track]") ?? v.parentElement;
          if (!host) return;
          host.addEventListener("mouseenter", () => v.play().catch(() => {}), { signal: listeners.signal });
          host.addEventListener("mouseleave", () => v.pause(), { signal: listeners.signal });
        });
      }

      refresh();
    });

    return () => {
      cancel();
      listeners.abort();
      io?.disconnect();
      mm?.revert();
      ctx?.revert();
    };
  }, [refresh]);

  return (
    <div ref={root} data-page className="relative z-[1]">
      {children}
    </div>
  );
}
