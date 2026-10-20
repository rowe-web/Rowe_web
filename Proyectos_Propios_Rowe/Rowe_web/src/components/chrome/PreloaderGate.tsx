"use client";

import { useEffect, useRef, useState } from "react";
import { formatTimecode } from "@/lib/timecode";
import { EASE, gsap } from "@/motion/gsap";
import { prefersReducedMotion } from "@/motion/media";
import { useMotion } from "@/motion/MotionProvider";
import { markReady } from "@/motion/ready";
import { COUNT_FRAMES, Preloader, preloaderStep } from "./Preloader";

const SESSION_KEY = "rowe:intro";
const MIN_MS = 1400;
const MAX_MS = 4200;
/** Pantallas táctiles: intro más corta (y se salta al tocar o deslizar, como en escritorio con la rueda o una tecla). */
const TOUCH_MIN_MS = 700;
const TOUCH_MAX_MS = 2200;

/**
 * Controla el preloader: lo pinta el servidor (tapa la web desde el primer fotograma),
 * avanza con la carga real (fuentes + página), se abre en letterbox y libera el scroll.
 * Solo la primera visita de cada sesión; nunca con movimiento reducido. Se puede saltar:
 * tocar, deslizar, la rueda o una tecla la terminan al momento. Y si el JavaScript no llega a
 * cargar, el CSS la retira solo (globals.css): nunca se queda tapando la web.
 */
export function PreloaderGate({ label, meta, steps = [] }: { label: string; meta: string; steps?: string[] }) {
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
    const pct = el?.querySelector<HTMLElement>("[data-preloader-pct]");
    const step = el?.querySelector<HTMLElement>("[data-preloader-step]");
    const state = { p: 0 };
    const render = () => {
      if (tc) tc.textContent = formatTimecode(state.p * COUNT_FRAMES);
      if (bar) bar.style.transform = `scaleX(${state.p})`;
      if (pct) pct.textContent = String(Math.round(state.p * 100));
      const line = preloaderStep(steps, state.p);
      if (step && step.textContent !== line) {
        step.textContent = line;
        // Reinicia el «tecleo» de la línea nueva
        step.style.animation = "none";
        void step.offsetWidth;
        step.style.animation = "";
      }
    };
    lock();
    let locked = true;
    const release = () => {
      if (!locked) return;
      locked = false;
      unlock();
    };

    const touch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const minMs = touch ? TOUCH_MIN_MS : MIN_MS;
    const maxMs = touch ? TOUCH_MAX_MS : MAX_MS;
    const t0 = performance.now();
    const loaded = Promise.all([
      document.fonts?.ready ?? Promise.resolve(),
      document.readyState === "complete" ? Promise.resolve() : new Promise((r) => window.addEventListener("load", r, { once: true })),
    ]);
    const timeout = new Promise((r) => setTimeout(r, maxMs));

    const tl = gsap.timeline();
    tl.to(state, { p: 0.72, duration: 1.1, ease: "power2.out", onUpdate: render });

    let cancelled = false;
    let finished = false;
    const finish = (fast: boolean) => {
      if (finished || cancelled || !el) return;
      finished = true;
      tl.kill();
      stopListening();
      const k = fast ? 0.55 : 1;
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
        .to(state, { p: 1, duration: 0.45 * k, ease: "power2.inOut", onUpdate: render })
        .to(el.querySelector("[data-preloader-content]"), { autoAlpha: 0, duration: 0.35 * k }, fast ? ">" : "+=0.15")
        // La película empieza mientras se abre el letterbox
        .add(() => markReady(), "<0.1")
        // Fondo negro opaco hasta aquí; ahora solo quedan las dos mitades que se abren
        .set(el.querySelector("[data-preloader]"), { backgroundColor: "transparent" }, "<")
        .to(el.querySelector("[data-preloader-top]"), { scaleY: 0, duration: 1.1 * k, ease: EASE.cut }, "<")
        .to(el.querySelector("[data-preloader-bottom]"), { scaleY: 0, duration: 1.1 * k, ease: EASE.cut }, "<");
    };
    Promise.race([loaded, timeout]).then(async () => {
      const wait = Math.max(0, minMs - (performance.now() - t0));
      await new Promise((r) => setTimeout(r, wait));
      finish(false);
    });

    // Saltar la intro: tocar, deslizar, la rueda o una tecla
    const skip = () => finish(true);
    const SKIP_EVENTS = ["pointerdown", "touchstart", "wheel", "keydown"] as const;
    SKIP_EVENTS.forEach((ev) => window.addEventListener(ev, skip, { passive: true }));
    function stopListening() {
      SKIP_EVENTS.forEach((ev) => window.removeEventListener(ev, skip));
    }

    return () => {
      // Desmontado a medias (o doble montaje de React en desarrollo): nunca dejar el scroll bloqueado
      cancelled = true;
      tl.kill();
      stopListening();
      release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- las líneas solo se leen al empezar
  }, [lock, unlock]);

  if (done) return null;
  return (
    <div ref={root} className="rowe-preloader">
      <Preloader label={label} meta={meta} steps={steps} />
    </div>
  );
}
