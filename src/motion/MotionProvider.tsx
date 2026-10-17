"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { timecodeFromScroll } from "@/lib/timecode";
import { gsap, ScrollTrigger } from "./gsap";
import { prefersReducedMotion } from "./media";
import { onReplay } from "./replay";

interface MotionApi {
  /** Bloquea el scroll (preloader, menú, overlays). Se apila: hace falta un unlock por cada lock. */
  lock: () => void;
  unlock: () => void;
  /** Scroll suave y exacto a un elemento, selector («#presupuesto») o posición. */
  scrollTo: (target: string | number | HTMLElement, opts?: { immediate?: boolean; offset?: number }) => void;
  /** Suscripción al scroll (y, dirección). Devuelve la función para desuscribirse. */
  onScroll: (cb: (y: number, direction: number) => void) => () => void;
  /** Recalcula todos los pins y disparadores (tras cargar imágenes, fuentes, vídeos…). */
  refresh: () => void;
}

const MotionContext = createContext<MotionApi | null>(null);

/** Igual que useMotion, pero devuelve null fuera del proveedor (guía de estilo, panel). */
export function useMotionOptional(): MotionApi | null {
  return useContext(MotionContext);
}

export function useMotion(): MotionApi {
  const ctx = useContext(MotionContext);
  if (!ctx) throw new Error("useMotion debe usarse dentro de <MotionProvider>");
  return ctx;
}

/**
 * Núcleo del scroll de la web:
 *  - Lenis + ScrollTrigger con UN único reloj (gsap.ticker). En táctil, scroll nativo.
 *  - Timecode global: 1 fotograma cada 3 px; avanza al bajar y se rebobina al subir.
 *  - Bloqueo de scroll apilable, anclas internas suaves y exactas, refrescos fiables.
 *  - Con movimiento reducido: sin suavizado (scroll nativo) y saltos instantáneos.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const locks = useRef(0);
  const listeners = useRef(new Set<(y: number, d: number) => void>());
  const tcNodes = useRef<HTMLElement[]>([]);
  const lastTc = useRef("");
  /** Scroll suave pedido con el scroll bloqueado (p. ej. un ancla desde el menú abierto). */
  const pendingScroll = useRef<(() => void) | null>(null);

  // --- Arranque (una sola vez) ------------------------------------------------
  useEffect(() => {
    const reduced = prefersReducedMotion();
    history.scrollRestoration = "manual";

    const lenis = new Lenis({
      lerp: reduced ? 1 : 0.1,
      smoothWheel: !reduced,
      syncTouch: false, // en móvil, scroll nativo: sin tirones ni conflictos con la barra del navegador
      autoRaf: false,
      anchors: false, // las anclas las gestionamos aquí (con offsets y pins)
      stopInertiaOnNavigate: true,
      allowNestedScroll: true, // carrusel y overlays con scroll propio
    });
    lenisRef.current = lenis;

    let lastY = window.scrollY;
    const onLenisScroll = () => {
      const y = lenis.scroll;
      const dir = y > lastY ? 1 : y < lastY ? -1 : 0;
      lastY = y;
      ScrollTrigger.update();
      writeTimecode(y);
      listeners.current.forEach((cb) => cb(y, dir));
    };
    lenis.on("scroll", onLenisScroll);

    // Único reloj compartido
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Refrescos: fuentes, carga completa, imágenes y vídeos que terminan de cargar.
    let refreshTimer = 0;
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        lenis.resize();
        ScrollTrigger.refresh();
      }, 150);
    };
    document.fonts?.ready.then(scheduleRefresh);
    window.addEventListener("load", scheduleRefresh);
    const onMediaLoad = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "IMG" || t.tagName === "VIDEO") scheduleRefresh();
    };
    document.addEventListener("load", onMediaLoad, true);
    document.addEventListener("loadedmetadata", onMediaLoad, true);

    // Redimensionar, cambiar de monitor o girar el móvil: la web se queda donde estaba.
    // Al cruzar un breakpoint, gsap.matchMedia rehace las escenas (pins incluidos) y
    // ScrollTrigger pierde la posición por el camino (la deja en 0). Antes del cambio se
    // apunta en qué escena se estaba y cuánto se había avanzado dentro de ella; después de
    // cada refresco se vuelve ahí. Nada se recarga: el estado (configurador, formularios…) sigue.
    // El punto se apunta cuando el scroll se para (el cambio de breakpoint puede llegar antes
    // que el evento «resize», con la posición ya perdida).
    // Se guarda la escena (no su «pin-spacer», que se rehace) y se mide su bloque cada vez.
    type Anchor = { scene: HTMLElement; f: number } | { y: number };
    let anchor: Anchor | null = null;
    let last: Anchor | null = null;
    let settleTimer = 0;
    let idleTimer = 0;
    const blockOf = (el: HTMLElement) => (el.parentElement?.classList.contains("pin-spacer") ? el.parentElement : el);
    const capture = (): Anchor => {
      for (const scene of document.querySelectorAll<HTMLElement>("main [data-scene], main > section, main > div > section")) {
        const r = blockOf(scene).getBoundingClientRect();
        if (r.top <= 1 && r.bottom > 1 && r.height > 0) return { scene, f: -r.top / r.height };
      }
      return { y: window.scrollY };
    };
    const restore = () => {
      if (!anchor) return;
      const a = anchor;
      let target = "y" in a ? a.y : null;
      if ("scene" in a && a.scene.isConnected) {
        const box = blockOf(a.scene);
        target = Math.round(box.getBoundingClientRect().top + window.scrollY + a.f * box.offsetHeight);
      }
      if (target == null) return;
      if (Math.abs(window.scrollY - target) > 2) {
        lenis.scrollTo(target, { immediate: true, force: true });
        window.scrollTo(0, target);
        ScrollTrigger.update();
      }
    };
    const settle = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        restore();
        anchor = null;
        remember();
      }, 500);
    };
    const remember = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        if (!anchor && !(ScrollTrigger as unknown as { isRefreshing?: boolean }).isRefreshing) last = capture();
      }, 160);
    };
    remember();
    let size = { w: window.innerWidth, h: window.innerHeight };
    const onResize = () => {
      const prev = size;
      size = { w: window.innerWidth, h: window.innerHeight };
      // La barra del navegador del móvil al hacer scroll (solo cambia un poco el alto): no es un cambio de pantalla
      if (!anchor && prev.w === size.w && Math.abs(prev.h - size.h) < 160) return;
      anchor ??= last ?? capture();
      settle();
    };
    const onRefreshed = () => {
      if (!anchor) return;
      restore();
      settle();
    };
    // Si la persona se mueve mientras tanto, manda ella
    const dropAnchor = () => {
      anchor = null;
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", remember, { passive: true });
    ScrollTrigger.addEventListener("refresh", onRefreshed);
    const USER_SCROLL = ["wheel", "touchstart", "keydown"] as const;
    USER_SCROLL.forEach((ev) => window.addEventListener(ev, dropAnchor, { passive: true }));

    // Marca para el script de seguridad: el movimiento ha arrancado.
    (window as unknown as { __roweMotion?: boolean }).__roweMotion = true;
    // Solo en desarrollo/pruebas: acceso para los tests de scroll (detectar fugas de ScrollTriggers)
    if (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_E2E === "1") {
      (window as unknown as { __rowe?: object }).__rowe = { ScrollTrigger, lenis };
    }
    collectTimecodes();
    writeTimecode(window.scrollY);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
      window.clearTimeout(refreshTimer);
      window.clearTimeout(settleTimer);
      window.clearTimeout(idleTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", remember);
      ScrollTrigger.removeEventListener("refresh", onRefreshed);
      USER_SCROLL.forEach((ev) => window.removeEventListener(ev, dropAnchor));
      window.removeEventListener("load", scheduleRefresh);
      document.removeEventListener("load", onMediaLoad, true);
      document.removeEventListener("loadedmetadata", onMediaLoad, true);
    };
  }, []);

  // --- Timecode global (escritura directa en el DOM, sin re-renders) -----------
  function collectTimecodes() {
    tcNodes.current = Array.from(document.querySelectorAll<HTMLElement>("[data-tc]"));
    lastTc.current = "";
  }
  function writeTimecode(y: number) {
    const tc = timecodeFromScroll(y);
    if (tc === lastTc.current) return;
    lastTc.current = tc;
    for (const n of tcNodes.current) n.textContent = tc;
  }

  // --- API ---------------------------------------------------------------------
  const lock = useCallback(() => {
    locks.current += 1;
    if (locks.current === 1) {
      lenisRef.current?.stop();
      document.documentElement.classList.add("scroll-locked");
    }
  }, []);

  const unlock = useCallback(() => {
    locks.current = Math.max(0, locks.current - 1);
    if (locks.current === 0) {
      document.documentElement.classList.remove("scroll-locked");
      lenisRef.current?.start();
      // Lenis.start() corta cualquier viaje en curso: el que esperaba sale ahora, completo
      const run = pendingScroll.current;
      pendingScroll.current = null;
      run?.();
    }
  }, []);


  const scrollTo = useCallback<MotionApi["scrollTo"]>(function scrollTo(target, opts = {}) {
    const lenis = lenisRef.current;
    const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
    if (el === null) return;
    const immediate = opts.immediate || prefersReducedMotion();
    // Con el scroll bloqueado (menú u overlay cerrándose), el viaje suave espera al desbloqueo:
    // si empezara ya, el desbloqueo lo cortaría a medias y el ancla no quedaría exacta.
    if (lenis && !immediate && locks.current > 0) {
      pendingScroll.current = () => scrollTo(target, opts);
      return;
    }
    if (lenis) {
      const offset = opts.offset ?? 0;
      lenis.scrollTo(el as HTMLElement | number, {
        offset,
        immediate,
        force: true,
        duration: 1.4,
        // Si algo de arriba cambió de altura durante el viaje (fuentes, imágenes, pins),
        // se corrige al llegar: el ancla queda siempre exacta.
        onComplete: () => {
          if (typeof el === "number") return;
          const drift = (el as HTMLElement).getBoundingClientRect().top - offset;
          if (Math.abs(drift) > 1) lenis.scrollTo(el as HTMLElement, { offset, immediate: true, force: true });
        },
      });
    } else if (typeof el === "number") {
      window.scrollTo({ top: el, behavior: immediate ? "auto" : "smooth" });
    } else {
      el.scrollIntoView({ behavior: immediate ? "auto" : "smooth" });
    }
  }, []);

  const onScroll = useCallback<MotionApi["onScroll"]>((cb) => {
    listeners.current.add(cb);
    return () => listeners.current.delete(cb);
  }, []);

  const refresh = useCallback(() => {
    lenisRef.current?.resize();
    ScrollTrigger.refresh();
  }, []);

  // --- Cambio de ruta: arriba del todo (o al ancla), timecodes y refresco ---------
  const onRouteChange = useCallback(() => {
    collectTimecodes();
    const hash = window.location.hash;
    const id = requestAnimationFrame(() => {
      if (hash && document.querySelector(hash)) {
        refresh();
        scrollTo(hash, { immediate: true });
      } else {
        lenisRef.current?.scrollTo(0, { immediate: true, force: true });
        window.scrollTo(0, 0);
        refresh();
      }
      writeTimecode(window.scrollY);
      // La posición cambió sin evento de scroll: la cabecera (y demás oyentes) se ponen al día,
      // así la página nueva nunca empieza con la cabecera escondida.
      listeners.current.forEach((cb) => cb(window.scrollY, 0));
    });
    return () => cancelAnimationFrame(id);
  }, [refresh, scrollTo]);

  // --- Página vuelta a montar (logo en la propia página): timecodes nuevos ----------
  useEffect(
    () =>
      onReplay(() =>
        requestAnimationFrame(() => {
          collectTimecodes();
          writeTimecode(window.scrollY);
          listeners.current.forEach((cb) => cb(window.scrollY, 0));
        }),
      ),
    [],
  );

  // --- Anclas internas: «#presupuesto», «/#hablemos» (estando en la home) ---------
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest?.("a");
      if (!a || a.target === "_blank") return;
      const href = a.getAttribute("href") ?? "";
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;
      const el = document.querySelector<HTMLElement>(url.hash);
      if (!el) return;
      // Fase de captura: antes que <Link> (que saltaría de golpe al ancla)
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new Event("rowe:navigate"));
      scrollTo(el);
      history.replaceState(history.state, "", url.hash);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [scrollTo]);

  const api = useMemo<MotionApi>(() => ({ lock, unlock, scrollTo, onScroll, refresh }), [lock, unlock, scrollTo, onScroll, refresh]);
  return (
    <MotionContext.Provider value={api}>
      {/* La ruta solo se conoce al pedir la página: fuera del «shell» estático (Suspense) */}
      <Suspense fallback={null}>
        <RouteWatcher onChange={onRouteChange} />
      </Suspense>
      {children}
    </MotionContext.Provider>
  );
}

function RouteWatcher({ onChange }: { onChange: () => () => void }) {
  const pathname = usePathname();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar de ruta
  useEffect(() => onChange(), [pathname]);
  return null;
}
