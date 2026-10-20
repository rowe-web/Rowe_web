"use client";

import { cloneElement, forwardRef, isValidElement, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

/* Kit visual del panel (ROWE Admin.dc.html): superficies #121212, bordes 8 px,
   campos #1A1A1A con radio 6 px, botones píldora, etiquetas monoespaciadas. */

import { mono } from "./styles";

export { mono, visibleLength } from "./styles";

// ---------------------------------------------------------------------------
// Botones
// ---------------------------------------------------------------------------
type BtnVariant = "primary" | "outline" | "ghost" | "danger";
interface AButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: "sm" | "md";
  loading?: boolean;
}

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-full whitespace-nowrap transition-[background-color,border-color,color,opacity,scale] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone";
const btnVariant: Record<BtnVariant, string> = {
  primary: "bg-bone text-ink font-medium hover:bg-white",
  outline: "border border-line-input text-bone hover:border-bone",
  ghost: "text-muted hover:text-bone",
  danger: "bg-rec text-ink font-medium hover:brightness-110",
};
const btnSize = { sm: "h-9 px-3.5 text-[13px]", md: "h-10 px-[18px] text-[14px]" };

export const AButton = forwardRef<HTMLButtonElement, AButtonProps>(function AButton(
  { variant = "outline", size = "md", loading = false, className = "", children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${btnBase} ${btnVariant[variant]} ${btnSize[size]} ${className}`}
      {...rest}
    >
      {loading && <span className="h-2 w-2 animate-rec-fast rounded-full bg-rec" aria-hidden="true" />}
      {children}
    </button>
  );
});

// ---------------------------------------------------------------------------
// Campos
// ---------------------------------------------------------------------------
interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  count?: number;
  max?: number;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, hint, error, count, max, children, className = "" }: FieldProps) {
  const over = max !== undefined && count !== undefined && count > max;
  // Sin htmlFor, la etiqueta se asocia sola al campo (lectores de pantalla y clic en la etiqueta)
  const autoId = useId();
  const child = !htmlFor && isValidElement<{ id?: string }>(children) && !children.props.id ? cloneElement(children, { id: autoId }) : children;
  const forId = htmlFor ?? (child !== children ? autoId : undefined);
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={forId} className={`flex justify-between gap-3 ${mono} text-muted`}>
        <span>{label}</span>
        {max !== undefined && (
          <span className={over ? "text-rec" : ""}>
            {count ?? 0} / {max}
          </span>
        )}
      </label>
      {child}
      {error ? <span className="text-[12px] text-rec">{error}</span> : hint ? <span className="text-[12px] text-muted">{hint}</span> : null}
    </div>
  );
}

const inputBase =
  "w-full rounded-md border bg-surface-2 px-3.5 text-[15px] text-bone outline-none transition-colors placeholder:text-dim focus:border-bone disabled:opacity-50";

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; monospace?: boolean }>(
  function TextInput({ invalid, monospace, className = "", ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={`${inputBase} h-11 ${invalid ? "border-rec" : "border-line"} ${monospace ? "font-mono text-[13px]" : ""} ${className}`}
        {...rest}
      />
    );
  },
);

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function TextArea(
  { invalid, className = "", rows = 3, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={`${inputBase} resize-y py-3 leading-[1.55] ${invalid ? "border-rec" : "border-line"} ${className}`}
      {...rest}
    />
  );
});

// ---------------------------------------------------------------------------
// Controles
// ---------------------------------------------------------------------------
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  label,
}: {
  options: { value: T; label: ReactNode; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex w-fit max-w-full flex-wrap gap-0.5 rounded-full border border-line-strong p-[3px]">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`flex items-center gap-2 rounded-full px-3.5 transition-colors duration-200 ${size === "sm" ? "h-8 text-[12px]" : "h-[34px] text-[13px]"} ${
              on ? "bg-bone text-ink" : "text-muted hover:text-bone"
            }`}
          >
            {o.label}
            {o.count !== undefined && <span className="font-mono text-[10px] opacity-70">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({ checked, onChange, label, size = "md" }: { checked: boolean; onChange: (v: boolean) => void; label: string; size?: "sm" | "md" }) {
  const dims = size === "sm" ? { w: "w-9 h-5", k: "h-3.5 w-3.5", x: "translate-x-4" } : { w: "w-11 h-[26px]", k: "h-[18px] w-[18px]", x: "translate-x-[18px]" };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative flex-none rounded-full border transition-colors duration-300 ${dims.w} ${checked ? "border-bone bg-bone" : "border-line-cta bg-transparent"}`}
    >
      <span
        className={`absolute left-[3px] top-1/2 -translate-y-1/2 rounded-full transition-transform duration-300 ease-[var(--ease-cut)] ${dims.k} ${checked ? `${dims.x} bg-ink` : "bg-muted"}`}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Bloques
// ---------------------------------------------------------------------------
export function Card({ children, className = "", padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return <div className={`rounded-lg border border-line bg-surface ${padded ? "p-[clamp(18px,2.2vw,24px)]" : "overflow-hidden"} ${className}`}>{children}</div>;
}

export function PageTitle({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="headline-serif text-[40px] leading-none">{title}</h1>
        {subtitle && <p className="text-[14px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

const statusStyles = {
  on: "bg-bone border-bone text-bone",
  half: "bg-transparent border-muted text-muted",
  off: "bg-ghost border-ghost text-dim",
  alert: "bg-rec border-rec text-rec",
};
export function StatusDot({ tone, label }: { tone: keyof typeof statusStyles; label: string }) {
  const s = statusStyles[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] ${s.split(" ").pop()}`}>
      <span className={`h-[7px] w-[7px] rounded-full border ${s.split(" ").slice(0, 2).join(" ")}`} />
      {label}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-[skel_1.2s_ease-in-out_infinite] rounded-lg bg-surface ${className}`} />;
}

export function EmptyState({ kicker, title, body, action }: { kicker: string; title: ReactNode; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 px-6 py-12">
      <span className={`${mono} text-muted`}>{kicker}</span>
      <p className="headline-serif text-[30px] leading-none">{title}</p>
      <p className="max-w-[40ch] text-[14px] leading-relaxed text-muted">{body}</p>
      {action}
    </div>
  );
}

