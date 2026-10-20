"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Nombre accesible (no se ve: el rótulo visible va fuera). */
  label: string;
  placeholder?: string;
}

const MAX_H = 280;

/**
 * Desplegable del panel (en lugar del <select> nativo, cuya lista abierta pinta el sistema:
 * blanca, con selección azul). Caja y lista en oscuro, con flecha vectorial y hover gris.
 * Accesible como un listbox: Flechas, Inicio/Fin, Intro/Espacio, Esc, Tab y búsqueda al teclear.
 * La lista va en un portal con posición fija, así que ninguna caja con scroll la recorta.
 */
export function Select({ value, options, onChange, label, placeholder = "—" }: SelectProps) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null);
  const typed = useRef({ text: "", at: 0 });

  const selected = options.find((o) => o.value === value);
  const enabled = (i: number) => i >= 0 && i < options.length && !options[i].disabled;

  const place = useCallback(() => {
    const r = button.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 8;
    const above = r.top - 8;
    const up = below < Math.min(MAX_H, 160) && above > below;
    setPos({
      left: r.left,
      width: r.width,
      ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
      maxHeight: Math.min(MAX_H, (up ? above : below) - 4),
    });
  }, []);

  const show = (start?: number) => {
    const i = start ?? options.findIndex((o) => o.value === value);
    setActive(enabled(i) ? i : options.findIndex((o) => !o.disabled));
    place();
    setOpen(true);
  };
  const close = (focusButton = true) => {
    setOpen(false);
    if (focusButton) button.current?.focus();
  };
  const choose = (i: number) => {
    if (!enabled(i)) return;
    onChange(options[i].value);
    close();
  };
  const step = (from: number, dir: 1 | -1) => {
    for (let i = from + dir; i >= 0 && i < options.length; i += dir) if (!options[i].disabled) return i;
    return from;
  };

  // Abierta: foco en la lista, se recoloca con el scroll/redimensionado y se cierra al pulsar fuera
  useLayoutEffect(() => {
    if (open) list.current?.focus({ preventScroll: true });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!list.current?.contains(t) && !button.current?.contains(t)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);
  // La opción activa siempre a la vista
  useEffect(() => {
    if (open && active >= 0) list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const typeAhead = (key: string, now: number) => {
    typed.current = { text: (now - typed.current.at > 700 ? "" : typed.current.text) + key.toLowerCase(), at: now };
    const i = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(typed.current.text));
    if (i >= 0) setActive(i);
  };

  const onButtonKey = (e: KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      show();
    }
  };
  const onListKey = (e: KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => setActive((i) => step(i, 1)),
      ArrowUp: () => setActive((i) => step(i, -1)),
      Home: () => setActive(step(-1, 1)),
      End: () => setActive(step(options.length, -1)),
      Enter: () => choose(active),
      " ": () => choose(active),
      Escape: () => close(),
    };
    if (keys[e.key]) {
      e.preventDefault();
      keys[e.key]();
    } else if (e.key === "Tab") {
      close(false);
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      typeAhead(e.key, e.timeStamp);
    }
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        data-select
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-label={label}
        onClick={() => (open ? close() : show())}
        onKeyDown={onButtonKey}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-[#111111] pl-3 pr-2.5 text-left text-[13px] text-bone transition-colors hover:border-[#4a4a4a] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-bone ${open ? "border-[#4a4a4a]" : "border-[#333333]"}`}
      >
        <span className={`truncate ${selected ? "" : "text-muted"}`}>{selected?.label ?? placeholder}</span>
        <svg viewBox="0 0 12 12" aria-hidden="true" className={`h-3 w-3 flex-none text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </button>
      {open &&
        pos &&
        createPortal(
          <ul
            ref={list}
            id={`${id}-list`}
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            aria-activedescendant={active >= 0 ? `${id}-o${active}` : undefined}
            onKeyDown={onListKey}
            style={{ position: "fixed", left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
            className="z-[700] flex flex-col gap-0.5 overflow-y-auto rounded-lg border border-[#333333] bg-[#111111] p-1 shadow-[0_18px_44px_rgb(0_0_0/0.55)] outline-none [scrollbar-color:#333333_transparent] [scrollbar-width:thin]"
          >
            {options.map((o, i) => {
              const isSel = o.value === value;
              return (
                <li
                  key={o.value}
                  id={`${id}-o${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSel}
                  aria-disabled={o.disabled || undefined}
                  onPointerEnter={() => enabled(i) && setActive(i)}
                  onClick={() => choose(i)}
                  className={`flex min-h-9 cursor-pointer select-none items-center justify-between gap-3 rounded-md px-3 py-2 text-[13px] leading-snug ${
                    o.disabled ? "cursor-not-allowed text-muted" : isSel ? "text-bone" : "text-[#d6d3cd]"
                  } ${i === active && !o.disabled ? "bg-[#222222]" : ""}`}
                >
                  <span>{o.label}</span>
                  {o.disabled && <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">No disponible</span>}
                  {isSel && (
                    <svg viewBox="0 0 12 12" aria-hidden="true" className="h-3 w-3 flex-none text-bone" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.5 6.2 5 8.6l4.5-5" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </>
  );
}
