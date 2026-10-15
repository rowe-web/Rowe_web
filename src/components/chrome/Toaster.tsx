"use client";

import { useEffect, useRef, useState } from "react";

const EVENT = "rowe:toast";

/** Muestra un aviso breve (estilo del diseño: píldora hueso, mono, abajo al centro). */
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: message }));
}

export function Toaster() {
  const [msg, setMsg] = useState<{ text: string; id: number } | null>(null);
  const timer = useRef(0);

  useEffect(() => {
    const on = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      setMsg({ text, id: Date.now() });
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setMsg(null), 2400);
    };
    window.addEventListener(EVENT, on);
    return () => {
      window.removeEventListener(EVENT, on);
      window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-7 z-[320] flex justify-center px-4">
      {msg && (
        <span key={msg.id} className="toast-in whitespace-nowrap bg-bone px-5 py-3.5 label-mono text-ink">
          {msg.text}
        </span>
      )}
    </div>
  );
}
