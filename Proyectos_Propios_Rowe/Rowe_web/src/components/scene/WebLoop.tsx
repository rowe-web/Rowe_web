import { LoopFrame } from "./LoopFrame";
import styles from "./ServiceLoops.module.css";

const at = (s: number) => ({ "--i": `${s}s` }) as React.CSSProperties;

/**
 * Fig. 04 · Web a medida — ilustración animada en línea (SVG + CSS), mientras no haya vídeo:
 * una web en modo oscuro con titulares serif. Ciclo de 12 s: el cursor pasa por el botón
 * (se rellena y responde al clic), la página baja con suavidad, una tarjeta reacciona al
 * pasar por encima, se abre el menú y la página vuelve arriba. Los textos son ilustrativos.
 * Decorativa: el pie la describe.
 */
export function WebLoop({ className = "" }: { className?: string }) {
  return (
    <LoopFrame className={`${styles.root} ${className}`}>
      <svg viewBox="0 0 200 250" className={styles.svg} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <clipPath id="webloop-page">
            <rect x="13" y="31" width="174" height="202" />
          </clipPath>
        </defs>

        {/* Ventana del navegador */}
        <g className={styles.faint}>
          <rect className={`${styles.d} ${styles.fillScreen}`} style={at(0)} pathLength={1} x="12" y="16" width="176" height="218" rx="6" />
          <path className={styles.d} style={at(0.2)} pathLength={1} d="M12 30h176M60 19h80a4 4 0 0 1 0 8H60a4 4 0 0 1 0-8z" />
        </g>
        <g className={`${styles.dots} ${styles.reveal}`} style={at(0.4)}>
          <circle cx="22" cy="23" r="1.6" />
          <circle cx="29" cy="23" r="1.6" />
          <circle cx="36" cy="23" r="1.6" />
        </g>

        <g clipPath="url(#webloop-page)">
          {/* Contenido que se desplaza */}
          <g className={styles.scroll}>
            <text x="22" y="76" className={`${styles.serif} ${styles.reveal}`} style={at(0.5)}>
              Cocina de
            </text>
            <text x="22" y="96" className={`${styles.serif} ${styles.italic} ${styles.reveal}`} style={at(0.65)}>
              mercado.
            </text>
            <g className={styles.faint}>
              <path className={styles.d} style={at(0.8)} pathLength={1} d="M22 108h118M22 114h86" />
            </g>
            {/* Botón principal (se rellena al pasar el cursor) */}
            <rect className={`${styles.btn} ${styles.d}`} style={at(0.9)} pathLength={1} x="22" y="123" width="54" height="14" rx="7" />
            <g className={styles.reveal} style={at(1.1)}>
              <path className={styles.btnLabel} d="M31 130h28M63 127.5l3 2.5-3 2.5" />
            </g>
            <circle className={styles.ripple} cx="48" cy="130" r="10" />
            <g className={styles.faint}>
              <path className={styles.d} style={at(1)} pathLength={1} d="M86 130h26M86 133.5h26" />
            </g>
            {/* Foto del plato, en línea */}
            <g className={styles.faint}>
              <rect className={styles.d} style={at(1)} pathLength={1} x="22" y="148" width="156" height="70" rx="2" />
            </g>
            <g className={styles.line}>
              <circle className={styles.d} style={at(1.15)} pathLength={1} cx="100" cy="185" r="21" />
              <circle className={styles.d} style={at(1.25)} pathLength={1} cx="100" cy="185" r="14" />
              <path className={styles.d} style={at(1.35)} pathLength={1} d="M70 168v34M67 168v8q3 3 6 0v-8M130 168q5 6 0 14v20" />
            </g>
            <g className={`${styles.steam} ${styles.reveal}`} style={at(1.5)}>
              <path d="M94 160q-3-4 0-8t0-8" />
              <path d="M100 158q-3-4 0-8t0-8" />
              <path d="M106 160q-3-4 0-8t0-8" />
            </g>
            {/* Segunda sección: la carta */}
            <g className={styles.faint}>
              <path d="M22 236h22" />
            </g>
            <text x="22" y="256" className={`${styles.serif} ${styles.small}`}>
              La <tspan className={styles.italic}>carta</tspan>
            </text>
            <g className={styles.card}>
              <rect className={`${styles.faint} ${styles.fillScreen}`} x="22" y="266" width="74" height="58" rx="2" />
              <path className={styles.faint} d="M28 304h40M28 311h28" />
              <circle className={styles.faint} cx="59" cy="285" r="9" />
            </g>
            <g className={`${styles.card} ${styles.cardHover}`}>
              <rect className={`${styles.cardBox} ${styles.fillScreen}`} x="104" y="266" width="74" height="58" rx="2" />
              <path className={styles.faint} d="M110 304h40M110 311h28" />
              <circle className={styles.faint} cx="141" cy="285" r="9" />
            </g>
            <text x="22" y="350" className={`${styles.serif} ${styles.small}`}>
              Reserva <tspan className={styles.italic}>tu mesa</tspan>
            </text>
            <g className={styles.faint}>
              <path d="M22 360h110M22 366h80" />
              <rect x="22" y="376" width="54" height="14" rx="7" />
              <path d="M22 404h156" />
            </g>
          </g>

          {/* Barra de navegación fija */}
          <rect className={styles.fillScreen} x="13" y="31" width="174" height="17" />
          <g className={styles.faint}>
            <path className={styles.d} style={at(0.3)} pathLength={1} d="M13 48h174" />
          </g>
          <text x="22" y="43" className={`${styles.serif} ${styles.logo} ${styles.reveal}`} style={at(0.35)}>
            Brasa
          </text>
          <g className={styles.faint}>
            <path className={styles.d} style={at(0.4)} pathLength={1} d="M104 40h14M126 40h14M148 40h12" />
            <rect className={styles.d} style={at(0.45)} pathLength={1} x="166" y="35.5" width="15" height="9" rx="4.5" />
          </g>
          <path className={styles.underline} d="M126 44h14" />
          {/* Menú desplegable */}
          <g className={styles.menu}>
            <rect className={`${styles.faint} ${styles.fillMenu}`} x="118" y="50" width="48" height="36" rx="3" />
            <path className={styles.line} d="M125 60h26M125 68h32M125 76h20" />
          </g>
          {/* Barra de desplazamiento */}
          <g className={styles.reveal} style={at(0.6)}>
            <path className={styles.track} d="M184 52v176" />
            <path className={styles.thumb} d="M184 52v40" />
          </g>
        </g>

        {/* Cursor */}
        <g className={styles.cursor}>
          <path className={styles.cursorShape} d="M0 0v11l3-3 2.5 5 2-1-2.5-5h4.5z" />
        </g>
      </svg>
    </LoopFrame>
  );
}
