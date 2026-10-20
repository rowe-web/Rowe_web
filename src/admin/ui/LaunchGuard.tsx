"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { launchBlockers } from "@/admin/actions/publish";
import type { LaunchIssue } from "@/admin/launch-check";
import { mono } from "@/admin/ui/styles";

/*
 * Aviso antes de publicar: si la lista de lanzamiento tiene bloqueantes, se enseñan
 * con «Revisar» y «Publicar igualmente». Solo avisa: nunca impide publicar.
 */

/** clear: no hay bloqueantes · accepted: los hay y se publica igualmente · review: se vuelve a revisar. */
export type LaunchDecision = "clear" | "accepted" | "review";

const Ctx = createContext<(() => Promise<LaunchDecision>) | null>(null);

/** Llamar justo antes de publishSite(): publica solo si no devuelve «review». */
export function useLaunchGuard() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLaunchGuard fuera de <LaunchGuardProvider>");
  return ctx;
}

export function LaunchGuardProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<{ issues: LaunchIssue[]; resolve: (d: LaunchDecision) => void } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLButtonElement>(null);

  const check = useCallback(async (): Promise<LaunchDecision> => {
    const res = await launchBlockers();
    // Si la comprobación falla, no se bloquea la publicación
    if (!res.ok || !res.data?.length) return "clear";
    const issues = res.data;
    return new Promise<LaunchDecision>((resolve) => setDialog({ issues, resolve }));
  }, []);

  const close = useCallback(
    (d: LaunchDecision) => {
      dialog?.resolve(d);
      setDialog(null);
    },
    [dialog],
  );

  useEffect(() => {
    if (!dialog) return;
    const before = document.activeElement as HTMLElement | null;
    reviewRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close("review");
        return;
      }
      if (e.key !== "Tab" || !boxRef.current) return;
      // Foco atrapado dentro del diálogo
      const items = Array.from(boxRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !boxRef.current.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !boxRef.current.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      before?.focus?.();
    };
  }, [dialog, close]);

  return (
    <Ctx.Provider value={check}>
      {children}
      {dialog && (
        <div onClick={() => close("review")} className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgb(10_10_10/0.75)] p-5 backdrop-blur-sm">
          <div
            ref={boxRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="launch-title"
            aria-describedby="launch-body"
            data-launch-dialog
            onClick={(e) => e.stopPropagation()}
            className="toast-in flex max-h-[calc(100dvh-40px)] w-[min(520px,100%)] flex-col gap-3.5 rounded-[10px] border border-line-strong bg-surface p-[26px]"
          >
            <span className={`${mono} flex items-center gap-2 text-rec`}>
              <span className="h-[7px] w-[7px] rounded-full bg-rec" aria-hidden="true" /> Lista de lanzamiento
            </span>
            <p id="launch-title" className="headline-serif text-[30px] leading-[1.05]">
              Hay {dialog.issues.length} {dialog.issues.length === 1 ? "bloqueante" : "bloqueantes"} sin resolver
            </p>
            <p id="launch-body" className="text-[14px] leading-relaxed text-muted">
              Esto se verá en la web pública si publicas ahora. Puedes revisarlo antes o publicar igualmente.
            </p>
            <ul className="-mx-1 flex min-h-0 flex-col overflow-y-auto px-1">
              {dialog.issues.map((i) => (
                <li key={i.id} className="border-b border-line-faint last:border-b-0">
                  <Link href={i.href} onClick={() => close("review")} className="flex items-start gap-3 py-2.5 hover:text-bone">
                    <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-rec" aria-hidden="true" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[14px] leading-snug">{i.title}</span>
                      <span className="truncate text-[12px] text-muted">{i.detail}</span>
                    </span>
                    <span className="text-muted" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-1 flex flex-wrap justify-end gap-2.5">
              <button ref={reviewRef} type="button" onClick={() => close("review")} className="h-10 rounded-full bg-bone px-5 text-[14px] font-medium text-ink hover:bg-white">
                Revisar
              </button>
              <button type="button" onClick={() => close("accepted")} className="h-10 rounded-full border border-[rgb(255_59_31/0.55)] px-5 text-[14px] text-bone hover:border-rec">
                Publicar igualmente
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
