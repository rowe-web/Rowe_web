"use client";

/**
 * Analítica propia, solo con consentimiento (banner de cookies).
 * Sin cookies de terceros ni IP: un identificador aleatorio por sesión de navegador.
 */
export type EventType = "pageview" | "video_play" | "config_open" | "quote" | "lead" | "pdf";

const CONSENT_KEY = "rowe-consent";
const SESSION_KEY = "rowe-sid";

export function getConsent(): "granted" | "denied" | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: "granted" | "denied") {
  try {
    localStorage.setItem(CONSENT_KEY, value);
    localStorage.setItem(`${CONSENT_KEY}-at`, new Date().toISOString());
  } catch {
    /* sin almacenamiento: se volverá a preguntar */
  }
  window.dispatchEvent(new Event("rowe:consent"));
}

function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, "");
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

const sentOnce = new Set<string>();

/** Registra un evento. `once`: como mucho una vez por sesión de página. */
export function track(type: EventType, meta: Record<string, unknown> = {}, { once = false } = {}) {
  if (typeof window === "undefined" || getConsent() !== "granted") return;
  // La vista previa del panel no cuenta como visita
  if (location.pathname.startsWith("/vista-previa") || location.pathname.startsWith("/admin")) return;
  const key = `${type}:${location.pathname}`;
  if (once) {
    if (sentOnce.has(key)) return;
    sentOnce.add(key);
  }
  const body = JSON.stringify({
    type,
    path: location.pathname,
    referrer: document.referrer,
    session: sessionId(),
    meta,
  });
  try {
    if (!navigator.sendBeacon?.("/api/events", new Blob([body], { type: "application/json" }))) {
      fetch("/api/events", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    /* la analítica nunca debe romper la web */
  }
}
