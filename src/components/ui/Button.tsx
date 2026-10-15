"use client";

import Link from "next/link";
import { useRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type PointerEvent, type ReactNode } from "react";
import { useMagnetic } from "@/motion/useMagnetic";
import styles from "./Button.module.css";

type Variant = "primary" | "outline" | "rec" | "link";
type Size = "sm" | "md" | "lg";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  /** Flecha final: se desplaza al hover. */
  arrow?: "→" | "↓" | "↗" | "↑" | false;
  /** Muestra el punto REC parpadeando y bloquea el botón (envíos). */
  loading?: boolean;
  loadingLabel?: ReactNode;
  /** Se ve atenuado pero sigue siendo pulsable (p. ej. para avisar «elige primero…»). */
  dimmed?: boolean;
  /** Efecto magnético (por defecto en primario y contorno). */
  magnetic?: boolean;
  fullWidth?: boolean;
  className?: string;
}

type ButtonProps = CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { href?: undefined };
type LinkProps = CommonProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> & { href: string; disabled?: boolean };

export type ButtonComponentProps = ButtonProps | LinkProps;

/** Posición del relleno circular: nace y muere en el punto por el que entra/sale el ratón. */
function placeFill(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  const d = 2 * Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y));
  el.style.setProperty("--fx", `${x}px`);
  el.style.setProperty("--fy", `${y}px`);
  el.style.setProperty("--fd", `${d}px`);
}

export function Button(props: ButtonComponentProps) {
  const {
    variant = "primary",
    size = "lg",
    children,
    arrow = false,
    loading = false,
    loadingLabel,
    dimmed = false,
    magnetic,
    fullWidth = false,
    className = "",
    ...rest
  } = props;

  const ref = useRef<HTMLElement>(null);
  const isDisabled = Boolean((rest as { disabled?: boolean }).disabled);
  useMagnetic(ref, (magnetic ?? (variant === "primary" || variant === "outline")) && !isDisabled && !loading);

  const classes = [
    styles.root,
    styles[variant],
    variant !== "link" ? styles[size] : "",
    fullWidth ? styles.full : "",
    loading ? styles.loading : "",
    dimmed ? styles.dimmed : "",
    isDisabled ? styles.disabled : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const label = loading && loadingLabel ? loadingLabel : children;
  const content = (
    <>
      {variant !== "link" && <span className={styles.fill} aria-hidden="true" />}
      {variant === "rec" && !loading && (
        <span className={styles.recDot} aria-hidden="true">
          <span className={styles.recRing} />
        </span>
      )}
      {loading && <span className={styles.loadDot} aria-hidden="true" />}
      {variant === "link" ? (
        <span>{label}</span>
      ) : (
        <span className={styles.roll}>
          <span className={styles.rollInner}>
            <span>{label}</span>
            <span aria-hidden="true">{label}</span>
          </span>
        </span>
      )}
      {arrow && (
        <span className={styles.arrow} aria-hidden="true">
          {arrow}
        </span>
      )}
      {variant === "link" && <span className={styles.underline} aria-hidden="true" />}
    </>
  );

  const pointer = {
    onPointerEnter: placeFill,
    onPointerLeave: placeFill,
  };

  if (typeof rest.href === "string") {
    const { href, disabled, onClick, ...anchor } = rest as LinkProps;
    const blocked = disabled || loading;
    const isExternal = /^(https?:|mailto:|tel:)/.test(href);
    const isHash = href.startsWith("#");
    const shared = {
      ...anchor,
      ...pointer,
      ref: ref as React.Ref<HTMLAnchorElement>,
      className: classes,
      "aria-disabled": blocked || undefined,
      "aria-busy": loading || undefined,
      tabIndex: blocked ? -1 : anchor.tabIndex,
      onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (blocked) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      },
    };
    if (isExternal || isHash) {
      return (
        <a href={href} {...(isExternal && !href.startsWith("mailto:") && !href.startsWith("tel:") ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...shared}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} {...shared}>
        {content}
      </Link>
    );
  }

  const { type = "button", onClick, ...button } = rest as ButtonProps;
  return (
    <button
      {...button}
      {...pointer}
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      className={classes}
      aria-busy={loading || undefined}
      onClick={(e) => {
        if (loading) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    >
      {content}
    </button>
  );
}
