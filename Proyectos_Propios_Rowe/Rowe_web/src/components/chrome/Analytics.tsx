"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track } from "@/lib/analytics/client";

/** Páginas vistas y reproducciones de vídeo (solo con consentimiento; ver lib/analytics). */
export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    track("pageview");
  }, [pathname]);

  useEffect(() => {
    // Al aceptar las cookies, se cuenta la página actual
    const onConsent = () => track("pageview", {}, { once: true });
    const played = new WeakSet<EventTarget>();
    const onPlay = (e: Event) => {
      if (!e.target || played.has(e.target)) return;
      played.add(e.target);
      track("video_play", { src: ((e.target as HTMLVideoElement).currentSrc || "").split("/").pop()?.slice(0, 120) ?? "" });
    };
    window.addEventListener("rowe:consent", onConsent);
    document.addEventListener("play", onPlay, true);
    return () => {
      window.removeEventListener("rowe:consent", onConsent);
      document.removeEventListener("play", onPlay, true);
    };
  }, []);

  return null;
}
