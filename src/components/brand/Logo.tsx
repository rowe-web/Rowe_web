import Image from "next/image";
import Link from "next/link";
import { RecDot } from "@/components/ui/RecDot";
import styles from "./Logo.module.css";

/** Proporciones del PNG oficial (design/assets/rowe-logo-blanco.png). */
const LOGO_W = 407;
const LOGO_H = 101;
/** Columna donde acaba la «O» (diafragma) y empieza la «W». Medida píxel a píxel. */
const SPLIT_X = 194;

interface LogoProps {
  /** Alto del logotipo en px (diseño: 20 escritorio, 15 móvil, 18 cabecera). */
  height?: number;
  /** Variante sobre fondo claro (PDF, emails). */
  tone?: "light" | "dark";
  href?: string | null;
  /** RO + WE se separan al hover mostrando «Rodaje» y «Web». */
  interactive?: boolean;
  rec?: boolean;
  priority?: boolean;
  className?: string;
}

/**
 * Logotipo oficial de ROWE. No se redibuja: son dos recortes del mismo PNG
 * («RO» y «WE») que se separan al pasar el ratón.
 */
export function Logo({ height = 18, tone = "light", href = "/", interactive = true, rec = true, priority = false, className = "" }: LogoProps) {
  const src = tone === "light" ? "/brand/rowe-logo-blanco.png" : "/brand/rowe-logo-negro.png";
  const width = Math.round((height * LOGO_W) / LOGO_H);
  const split = (SPLIT_X / LOGO_W) * 100;

  const art = (
    <span
      className={`${styles.root} ${interactive ? styles.interactive : ""} ${className}`}
      style={{ "--logo-h": `${height}px`, "--logo-w": `${width}px`, "--split": `${split}%` } as React.CSSProperties}
    >
      <span className={styles.mark} aria-hidden="true">
        <span className={`${styles.half} ${styles.ro}`}>
          <Image src={src} alt="" width={LOGO_W} height={LOGO_H} priority={priority} unoptimized className={styles.img} />
        </span>
        <span className={`${styles.half} ${styles.we}`}>
          <Image src={src} alt="" width={LOGO_W} height={LOGO_H} priority={priority} unoptimized className={styles.img} />
        </span>
        {interactive && (
          <>
            <span className={`${styles.label} ${styles.labelRo}`}>Rodaje</span>
            <span className={`${styles.label} ${styles.labelWe}`}>Web</span>
          </>
        )}
      </span>
      {rec && <RecDot size={Math.max(6, Math.round(height * 0.42))} />}
    </span>
  );

  if (!href) {
    return (
      <span role="img" aria-label="ROWE">
        {art}
      </span>
    );
  }
  return (
    <Link href={href} aria-label="ROWE — Inicio" className={styles.link}>
      {art}
    </Link>
  );
}
