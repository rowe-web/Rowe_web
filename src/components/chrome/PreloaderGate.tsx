"use client";

import { useEffect, useRef, useState } from "react";
import { formatTimecode } from "@/lib/timecode";
import { EASE, gsap } from "@/motion/gsap";
import { prefersReducedMotion } from "@/motion/media";
import { useMotion } from "@/motion/MotionProvider";
import { markReady } from "@/motion/ready";
import { Preloader } from "./Preloader";

const SESSION_KEY = "rowe:intro";
const MIN_MS = 1400;
const MAX_MS = 4200;

/**
 * Controla el preloader: lo pinta el servidor (tapa la web desde el primer fotograma),
 * avanza con la carga real (fuentes + página), se abre en letterbox y libera el scroll.
 * Solo la primera visita de cada sesión; nunca con movimiento reducido.
 */
export function PreloaderGate({ label, meta }: { label: string; meta: string }) {
  const [done, setDone] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const { lock, unlock } = useMotion();

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      /* almacenamiento bloqueado: se muestra el preloader */
    }
    if (seen || prefersReducedMotion()) {
      // Ya oculto por CSS (html.intro-seen / html.reduced, del script de arranque)
      markReady();
      return;
    }

    const el = root.current;
    const tc = el?.querySelector<HTMLElement>("[data-preloader-tc]");
    const bar = el?.querySelector<HTMLElement>("[data-preloader-bar]");
    const state = { p: 0 };
    const render = () => {
      if (tc) tc.textContent = formatTimecode(state.p * 62);
      if (bar) bar.style.transform = `scaleX(${state.p})`;
    };
    lock();
    let locked = true;
    const release = () => {
      if (!locked) return;
      locked = false;
      unlock();
    };

    const t0 = performance.now();
    const loaded = Promise.all([
      document.fonts?.ready ?? Promise.resolve(),
      document.readyState === "complete" ? Promise.resolve() : new Promise((r) => window.addEventListener("load", r, { once: true })),
    ]);
    const timeout = new Promise((r) => setTimeout(r, MAX_MS));

    const tl = gsap.timeline();
    tl.to(state, { p: 0.72, duration: 1.1, ease: "power2.out", onUpdate: render });

    let cancelled = false;
    Promise.race([loaded, timeout]).then(async () => {
      const wait = Math.max(0, MIN_MS - (performance.now() - t0));
      await new Promise((r) => setTimeout(r, wait));
      if (cancelled || !el) return;
      gsap
        .timeline({
          onComplete: () => {
            try {
              sessionStorage.setItem(SESSION_KEY, "1");
            } catch {}
            release();
            setDone(true);
          },
        })
        .to(state, { p: 1, duration: 0.45, ease: "power2.inOut", onUpdate: render })
        .to(el.querySelector("[data-preloader-content]"), { autoAlpha: 0, duration: 0.35 }, "+=0.15")
        // La película empieza mientras se abre el letterbox
        .add(() => markReady(), "<0.1")
        .to(el.querySelector("[data-preloader-top]"), { scaleY: 0, duration: 1.1, ease: EASE.cut }, "<")
        .to(el.querySelector("[data-preloader-bottom]"), { scaleY: 0, duration: 1.1, ease: EASE.cut }, "<");
    });

    return () => {
      // Desmontado a medias (o doble montaje de React en desarrollo): nunca dejar el scroll bloqueado
      cancelled = true;
      tl.kill();
      release();
    };
  }, [lock, unlock]);

  if (done) return null;
  return (
    <div ref={root} className="rowe-preloader">
      <Preloader label={label} meta={meta} />
    </div>
  );
}
