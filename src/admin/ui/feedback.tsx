"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/* Avisos (toasts) y confirmaciones del panel. */

interface ConfirmOptions {
  title: string;
  body: string;
  cta: string;
  danger?: boolean;
}

/** Aviso en tiempo real (nuevo mensaje, respuesta de un cliente): más rico que un toast y con enlace. */
export interface LiveAlert {
  kicker: string;
  title: string;
  body?: string;
  href?: string;
  cta?: string;
}

interface FeedbackApi {
  toast: (text: string, tone?: "ok" | "error") => void;
  alert: (a: LiveAlert) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const Ctx = createContext<FeedbackApi | null>(null);

export function useFeedback(): FeedbackApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFeedback fuera de <FeedbackProvider>");
  return ctx;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; text: string; tone: "ok" | "error" }[]>([]);
  const [alerts, setAlerts] = useState<(LiveAlert & { id: number })[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  const toast = useCallback<FeedbackApi["toast"]>((text, tone = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 6000 : 3200);
  }, []);

  const dismiss = useCallback((id: number) => setAlerts((a) => a.filter((x) => x.id !== id)), []);
  const alert = useCallback<FeedbackApi["alert"]>(
    (a) => {
      const id = Date.now() + Math.random();
      setAlerts((list) => [...list.slice(-3), { ...a, id }]);
      window.setTimeout(() => dismiss(id), 12_000);
    },
    [dismiss],
  );

  const confirm = useCallback<FeedbackApi["confirm"]>((opts) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })), []);

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  useEffect(() => {
    if (!dialog) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog]);

  return (
    <Ctx.Provider value={{ toast, alert, confirm }}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-5 right-4 z-[90] flex max-w-[calc(100%-32px)] flex-col items-end gap-2 max-[819px]:bottom-[84px]">
        {/* Avisos en tiempo real: esquina inferior derecha, encima de los toasts */}
        {alerts.map((a) => (
          <div key={a.id} data-live-alert className="toast-in pointer-events-auto flex w-[min(360px,calc(100vw-32px))] flex-col gap-2 rounded-lg border border-line-strong border-l-2 border-l-rec bg-surface p-4 shadow-[0_18px_40px_rgb(0_0_0/0.45)]">
            <div className="flex items-start justify-between gap-3">
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                <span className="h-[7px] w-[7px] flex-none animate-rec rounded-full bg-rec" aria-hidden="true" />
                {a.kicker}
              </span>
              <button type="button" onClick={() => dismiss(a.id)} aria-label="Cerrar aviso" className="-mr-1 -mt-1 flex h-7 w-7 items-center justify-center rounded text-[12px] text-muted hover:text-bone">
                ✕
              </button>
            </div>
            <p className="text-[15px] font-medium leading-snug text-bone">{a.title}</p>
            {a.body && <p className="line-clamp-2 text-[13px] leading-relaxed text-muted">{a.body}</p>}
            {a.href && (
              <Link href={a.href} onClick={() => dismiss(a.id)} className="mt-1 flex h-9 w-fit items-center rounded-full bg-bone px-4 text-[13px] font-medium text-ink hover:bg-white">
                {a.cta ?? "Abrir"} →
              </Link>
            )}
          </div>
        ))}
        {toasts.map((t) => (
          <div key={t.id} className={`toast-in flex items-center gap-2.5 rounded-lg px-4 py-3 text-[13px] ${t.tone === "error" ? "bg-rec text-ink" : "bg-bone text-ink"}`}>
            <span className="h-1.5 w-1.5 flex-none rounded-full bg-ink" />
            {t.text}
          </div>
        ))}
      </div>
      {dialog && (
        <div onClick={() => close(false)} className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgb(10_10_10/0.75)] p-5 backdrop-blur-sm">
          <div role="alertdialog" aria-modal="true" aria-labelledby="cf-title" onClick={(e) => e.stopPropagation()} className="toast-in flex w-[min(440px,100%)] flex-col gap-3.5 rounded-[10px] border border-line-strong bg-surface p-[26px]">
            <p id="cf-title" className="headline-serif text-[30px] leading-[1.05]">
              {dialog.title}
            </p>
            <p className="text-[14px] leading-relaxed text-muted">{dialog.body}</p>
            <div className="mt-2 flex justify-end gap-2.5">
              <button type="button" onClick={() => close(false)} className="h-10 rounded-full px-4 text-[14px] text-muted hover:text-bone">
                Cancelar
              </button>
              <button ref={okRef} type="button" onClick={() => close(true)} className={`h-10 rounded-full px-5 text-[14px] font-medium text-ink ${dialog.danger ? "bg-rec" : "bg-bone hover:bg-white"}`}>
                {dialog.cta}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
