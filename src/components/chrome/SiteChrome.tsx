"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { HablemosOverlay } from "@/features/hablemos/HablemosOverlay";
import type { HablemosSettings } from "@/features/hablemos/settings";
import type { BrandSettings, ContactSettings, CookieSettings, NavigationSettings } from "@/lib/content/settings";
import { Analytics } from "./Analytics";
import { CookieBanner } from "./CookieBanner";
import { toggleAmbient } from "@/motion/ambient";
import { EASE, gsap } from "@/motion/gsap";
import { prefersReducedMotion } from "@/motion/media";
import { useMotion } from "@/motion/MotionProvider";
import { Cursor } from "./Cursor";
import { Curtain } from "./Curtain";
import { PreloaderGate } from "./PreloaderGate";
import { SiteHeader } from "./SiteHeader";
import { SiteMenu } from "./SiteMenu";
import { toast, Toaster } from "./Toaster";

interface SiteChromeProps {
  nav: NavigationSettings;
  contact: ContactSettings;
  brand: BrandSettings;
  hablemosSettings: HablemosSettings;
  cookies: CookieSettings;
  /** URL del audio ambiente subido en el panel (si no hay, se sintetiza). */
  ambientUrl: string | null;
}

/**
 * Todo lo que rodea a las escenas: cabecera (se oculta al bajar), menú a pantalla
 * completa, cursor, cortinilla, preloader, avisos, tecla R (sonido ambiente) y el
 * título de la pestaña cuando la web pasa a segundo plano.
 */
export function SiteChrome({ nav, contact, brand, hablemosSettings, cookies, ambientUrl }: SiteChromeProps) {
  const { lock, unlock, onScroll } = useMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const animating = useRef(false);
  const menuButton = useRef<HTMLElement | null>(null);

  // --- Cabecera: oculta al bajar, visible al subir, con fondo tras 40 px ----------
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-site-header]");
    if (!header) return;
    let hidden = false;
    let solid = false;
    const apply = (y: number, dir: number) => {
      const shouldHide = dir > 0 && y > 140;
      const shouldShow = dir < 0 || y < 140;
      if (shouldHide && !hidden) {
        hidden = true;
        header.style.transform = "translateY(-100%)";
      } else if (shouldShow && hidden) {
        hidden = false;
        header.style.transform = "";
      }
      const s = y > 40;
      if (s !== solid) {
        solid = s;
        header.classList.toggle("header-solid", s);
      }
    };
    apply(window.scrollY, 0);
    return onScroll(apply);
  }, [onScroll]);

  // --- Menú ---------------------------------------------------------------------
  const openTl = useRef<gsap.core.Timeline | null>(null);

  const openMenu = useCallback(() => {
    if (animating.current) return; // se está cerrando
    menuButton.current = document.activeElement as HTMLElement;
    lock();
    setMenuOpen(true);
  }, [lock]);

  const closeMenu = useCallback(
    (instant = false) => {
      const menu = document.querySelector<HTMLElement>("[data-site-menu]");
      if (!menu || animating.current) return;
      // Si aún se está abriendo, se interrumpe y se cierra desde donde esté
      openTl.current?.kill();
      openTl.current = null;
      const finish = () => {
        animating.current = false;
        setMenuOpen(false);
        unlock();
        menuButton.current?.focus?.();
      };
      if (instant || prefersReducedMotion()) return finish();
      animating.current = true;
      gsap.to(menu, { clipPath: "inset(50% 0% 50% 0%)", duration: 0.55, ease: EASE.cut, onComplete: finish });
    },
    [unlock],
  );

  useEffect(() => {
    if (!menuOpen) return;
    const menu = document.querySelector<HTMLElement>("[data-site-menu]");
    if (!menu) return;
    menu.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    if (prefersReducedMotion()) {
      gsap.set(menu, { clipPath: "none" });
      return;
    }
    openTl.current = gsap
      .timeline({ onComplete: () => (openTl.current = null) })
      .fromTo(menu, { clipPath: "inset(50% 0% 50% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.8, ease: EASE.cut })
      .fromTo(menu.querySelectorAll("[data-menu-item] > a"), { yPercent: 100 }, { yPercent: 0, duration: 0.8, ease: EASE.cut, stagger: 0.05 }, 0.25);
    return () => {
      openTl.current?.kill();
      openTl.current = null;
    };
  }, [menuOpen]);

  // --- Navegación desde el menú: la cortinilla tapa → se cierra sin animar; ancla → cierre animado
  useEffect(() => {
    if (!menuOpen) return;
    const covered = () => closeMenu(true);
    const anchor = () => closeMenu();
    window.addEventListener("rowe:covered", covered);
    window.addEventListener("rowe:navigate", anchor);
    return () => {
      window.removeEventListener("rowe:covered", covered);
      window.removeEventListener("rowe:navigate", anchor);
    };
  }, [menuOpen, closeMenu]);

  // --- Teclado: Esc cierra · R sonido ambiente -------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuOpen) closeMenu();
      const tag = (e.target as HTMLElement).tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement).isContentEditable;
      if ((e.key === "r" || e.key === "R") && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        toggleAmbient(ambientUrl).then((isOn) => {
          toast(isOn ? brand.ambient_on : brand.ambient_off);
          document.querySelectorAll<HTMLElement>("[data-sound-label]").forEach((el) => {
            el.textContent = (el.dataset.soundLabel ?? "").replace(/off/i, isOn ? "on" : "off");
          });
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, closeMenu, ambientUrl, brand.ambient_on, brand.ambient_off]);

  // --- Título de la pestaña --------------------------------------------------------
  // Al cambiar de pestaña o de ventana se muestra el texto de Ajustes → Marca; al volver,
  // el título real. Se guarda el título una sola vez por salida: aunque lleguen varios
  // eventos seguidos (blur + visibilitychange) nunca se toma el de pausa por el «original».
  useEffect(() => {
    const away = brand.tab_away_title;
    if (!away) return;
    let original: string | null = null;
    const leave = () => {
      if (original !== null) return;
      original = document.title;
      document.title = away;
    };
    const back = () => {
      if (original === null) return;
      document.title = original;
      original = null;
    };
    const onVis = () => (document.hidden ? leave() : document.hasFocus() && back());
    // Un clic dentro de un vídeo o mapa incrustado (iframe) también quita el foco: no es salir
    const onBlur = () => window.setTimeout(() => document.activeElement?.tagName !== "IFRAME" && !document.hasFocus() && leave(), 0);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", back);
    return () => {
      back();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", back);
    };
  }, [brand.tab_away_title]);

  return (
    <>
      <PreloaderGate label={nav.preloader_label} meta={nav.preloader_meta} steps={nav.preloader_steps} />
      <SiteHeader nav={nav} menuOpen={menuOpen} onMenu={() => (menuOpen ? closeMenu() : openMenu())} />
      <SiteMenu nav={nav} contact={contact} brand={brand} open={menuOpen} onClose={() => closeMenu(true)} onCloseAnimated={() => closeMenu()} />
      <HablemosOverlay settings={hablemosSettings} contact={contact} closeLabel={nav.close_label} />
      <Curtain />
      <Cursor />
      <Toaster />
      <CookieBanner settings={cookies} />
      <Suspense fallback={null}>
        <Analytics />
      </Suspense>
    </>
  );
}
