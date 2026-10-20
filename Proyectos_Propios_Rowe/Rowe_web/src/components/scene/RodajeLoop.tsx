import { RecDot } from "@/components/ui/RecDot";
import { LoopFrame } from "./LoopFrame";
import styles from "./ServiceLoops.module.css";

/** Retraso del trazo de entrada (s) para cada grupo de líneas. */
const at = (s: number) => ({ "--i": `${s}s` }) as React.CSSProperties;

/**
 * Fig. 03 · Rodaje — ilustración animada en línea (SVG + CSS), mientras no haya vídeo:
 * rodaje en un restaurante. El dueño habla a cámara (gesticula, ondas de voz), la cámara
 * graba (REC) y a su lado alguien del equipo sigue la escaleta en un papel. Las lámparas
 * se mecen. Al entrar en pantalla las líneas se dibujan. Decorativa: el pie la describe.
 */
export function RodajeLoop({ className = "" }: { className?: string }) {
  return (
    <LoopFrame className={`${styles.root} ${className}`}>
      <svg viewBox="0 0 200 250" className={styles.svg} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id="rodaje-light" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgb(237 234 228)" stopOpacity="0.1" />
            <stop offset="1" stopColor="rgb(237 234 228)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Local: suelo, pizarra, estanterías con botellas, barra y planta */}
        <g className={styles.faint}>
          <line className={styles.d} style={at(0)} pathLength={1} x1="0" y1="214" x2="200" y2="214" />
          <rect className={styles.d} style={at(0.1)} pathLength={1} x="8" y="42" width="40" height="30" rx="1.5" />
          <path className={styles.d} style={at(0.3)} pathLength={1} d="M14 50h20M14 56h26M14 62h16" />
          <path className={styles.d} style={at(0.2)} pathLength={1} d="M114 70h82M114 100h82" />
          <path
            className={styles.d}
            style={at(0.35)}
            pathLength={1}
            d="M120 70v-11q0-3 2-4v-4h2v4q2 1 2 4v11M131 70v-9q0-3 2-4v-5h2v5q2 1 2 4v9M168 70v-12q0-3 2-4v-4h2v4q2 1 2 4v12M181 70v-9q0-3 2-4v-4h2v4q2 1 2 4v9"
          />
          <path className={styles.d} style={at(0.45)} pathLength={1} d="M122 100l1-8h6l1 8M134 100l1-8h6l1 8M172 100l1-8h6l1 8M184 100l1-8h6l1 8" />
          <path className={styles.d} style={at(0.25)} pathLength={1} d="M100 158h100M102 162h98M125 162v52M150 162v52M175 162v52" />
          <path className={styles.d} style={at(0.5)} pathLength={1} d="M184 158l2-9h8l2 9M190 149q-6-8-2-15M190 149q5-7 9-10M190 149q-1-9 4-13" />
        </g>

        {/* Lámparas colgantes (se mecen) */}
        <g className={styles.lampA}>
          <g className={styles.faint}>
            <path className={styles.d} style={at(0.1)} pathLength={1} d="M62 0v26M53 34l5-8h8l5 8z" />
          </g>
          <g className={styles.reveal} style={at(1.2)}>
            <path className={styles.glow} d="M54 34h16l18 70H36z" />
          </g>
        </g>
        <g className={styles.lampB}>
          <g className={styles.faint}>
            <path className={styles.d} style={at(0.2)} pathLength={1} d="M150 0v18M141 26l5-8h8l5 8z" />
          </g>
          <g className={styles.reveal} style={at(1.3)}>
            <path className={styles.glow} d="M142 26h16l20 84h-56z" />
          </g>
        </g>

        {/* Campo de visión de la cámara */}
        <g className={styles.reveal} style={at(1.4)}>
          <path className={styles.beam} d="M97 135L124 98M97 135L124 178" />
        </g>

        {/* Equipo: sigue la escaleta */}
        <g className={styles.crew}>
          <g className={styles.line}>
            <path className={`${styles.d} ${styles.fill}`} style={at(0.6)} pathLength={1} d="M11 214L12 148Q13 120 26 118Q39 120 40 148L41 214Z" />
            <circle className={`${styles.d} ${styles.fill}`} style={at(0.7)} pathLength={1} cx="26" cy="104" r="10" />
            <path className={styles.d} style={at(0.8)} pathLength={1} d="M16.5 102a9.5 9.5 0 0 1 19 0" />
          </g>
          <g className={styles.paper}>
            <g className={styles.bright}>
              <rect className={`${styles.d} ${styles.fillPaper}`} style={at(0.9)} pathLength={1} x="30" y="135" width="15" height="20" rx="1" />
              <path className={styles.d} style={at(1.1)} pathLength={1} d="M33 140h9M33 144h7M33 148h9M33 152h5" />
            </g>
            <rect className={`${styles.page} ${styles.bright} ${styles.fillPaper}`} x="30" y="135" width="15" height="20" rx="1" />
          </g>
          <path className={`${styles.d} ${styles.line}`} style={at(1)} pathLength={1} d="M37 127Q47 135 44 142M15 128Q19 149 31 151" />
        </g>

        {/* Cámara en trípode, objetivo hacia el dueño */}
        <g className={styles.line}>
          <path className={styles.d} style={at(0.5)} pathLength={1} d="M70 150L56 214M70 150L84 214M70 150v56M62 146h16v4H62z" />
          <rect className={`${styles.d} ${styles.fill}`} style={at(0.6)} pathLength={1} x="56" y="124" width="28" height="22" rx="2" />
          <path className={styles.d} style={at(0.75)} pathLength={1} d="M84 128h10v14H84M94 126h3v18h-3zM62 124v-6h16v6M56 127h-8v10h8" />
        </g>
        <g className={styles.reveal} style={at(1.2)}>
          <circle className={styles.recDot} cx="61" cy="129.5" r="1.7" />
        </g>

        {/* El dueño del restaurante, hablando a cámara */}
        <g className={styles.line}>
          <path className={`${styles.d} ${styles.fill}`} style={at(0.4)} pathLength={1} d="M126 214L127 150Q128 124 144 121Q160 124 161 150L162 214Z" />
          <circle className={`${styles.d} ${styles.fill}`} style={at(0.5)} pathLength={1} cx="144" cy="102" r="11" />
          <path className={styles.d} style={at(0.7)} pathLength={1} d="M133.5 99l-3 4 3 1M134 140h21v58h-21zM134 140l4-17M155 140l-4-17M138 160h13" />
          <path className={styles.d} style={at(0.8)} pathLength={1} d="M158 131l4 37" />
        </g>
        <g className={styles.reveal} style={at(1.1)}>
          <ellipse className={styles.mouth} cx="135.5" cy="108.5" rx="1.8" ry="1" />
        </g>
        <g className={styles.arm}>
          <path className={`${styles.d} ${styles.line}`} style={at(0.9)} pathLength={1} d="M130 130L119 151L109 142" />
          <circle className={`${styles.d} ${styles.line} ${styles.fill}`} style={at(1)} pathLength={1} cx="108" cy="141" r="2.4" />
        </g>
        <g className={`${styles.voice} ${styles.reveal}`} style={at(1.3)}>
          <path d="M125 96q-3 6 0 12" />
          <path d="M120.5 93q-5 9 0 18" />
          <path d="M116 90q-7 12 0 24" />
        </g>
      </svg>
      <span className={styles.rec}>
        <RecDot size={5} /> Rec
      </span>
    </LoopFrame>
  );
}
