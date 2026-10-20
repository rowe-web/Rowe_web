import { CornerMarks } from "@/components/ui/CornerMarks";
import { ArrowUpRight } from "@/components/ui/ArrowUpRight";
import { RecDot } from "@/components/ui/RecDot";
import styles from "./ProcessLoop.module.css";

export interface ProcessStep {
  key: string;
  label: string;
}

/**
 * Fig. 01 del hero mientras no haya vídeo del proceso: animación en bucle (9 s, cortes secos)
 * del proceso integral de ROWE en tres planos:
 *   01 WE — la web se construye (navegador + bloques que se montan)
 *   02 RO — contenido vertical 9:16 grabando para redes
 *   03 ↗  — tráfico: las visitas suben
 * Barra de «historias» abajo. Solo CSS (transform / opacity). Con movimiento reducido queda
 * fijo el primer plano. Decorativa: el pie de figura la describe.
 */
export function ProcessLoop({ steps, className = "" }: { steps: ProcessStep[]; className?: string }) {
  const s = [0, 1, 2].map((i) => steps[i] ?? { key: "", label: "" });
  // «↗» (o cualquier flecha) se dibuja en SVG: como carácter, el móvil lo puede pintar como emoji
  const isArrow = (k: string) => /^[↗↑→]️?$/.test(k.trim());
  const label = (i: number) =>
    [String(i + 1).padStart(2, "0"), s[i].key, s[i].label]
      .filter(Boolean)
      .flatMap((part, k) => [k ? " · " : null, isArrow(part) ? <ArrowUpRight key={k} className={styles.labelArrow} strokeWidth={2} /> : part]);

  return (
    <div aria-hidden="true" className={`${styles.root} relative overflow-hidden bg-ph ${className}`} style={{ aspectRatio: "4 / 5" }}>
      {/* 01 · Web */}
      <div className={`${styles.shot} ${styles.s1}`}>
        <div className={styles.browser}>
          <div className={styles.chrome}>
            <span />
            <span />
            <span />
            <i />
          </div>
          <div className={styles.page}>
            <b className={styles.g} data-i={0} style={{ width: "62%" }} />
            <b className={styles.g} data-i={1} style={{ width: "44%" }} />
            <em className={styles.g} data-i={2} style={{ width: "36%" }} />
            <span className={`${styles.btn} ${styles.g}`} data-i={3} />
            <span className={styles.cards}>
              {[4, 5, 6].map((i) => (
                <span key={i} className={styles.g} data-i={i} />
              ))}
            </span>
          </div>
        </div>
        <span className={styles.code}>
          &lt;/&gt;<span className={styles.caret} />
        </span>
        <span className={styles.label}>{label(0)}</span>
      </div>

      {/* 02 · Contenido vertical */}
      <div className={`${styles.shot} ${styles.s2}`}>
        <div className={styles.vertical}>
          <span className={styles.rec}>
            <RecDot size={5} /> Rec
          </span>
          <span className={styles.ratio}>9:16</span>
          <span className={styles.play} />
          <span className={styles.scrub}>
            <span />
          </span>
        </div>
        <span className={styles.label}>{label(1)}</span>
      </div>

      {/* 03 · Tráfico */}
      <div className={`${styles.shot} ${styles.s3}`}>
        <div className={styles.chart}>
          {[22, 34, 30, 52, 68, 90].map((h, i) => (
            <span key={i} className={styles.g} data-i={i} style={{ height: `${h}%` }} />
          ))}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={styles.trend}>
            <path d="M2 82 L22 70 L40 74 L58 50 L78 34 L98 8" pathLength={1} />
          </svg>
        </div>
        <ArrowUpRight className={styles.arrow} />
        <span className={styles.label}>{label(2)}</span>
      </div>

      {/* Barra de planos */}
      <div className={styles.segs}>
        <span>
          <span className={styles.seg1} />
        </span>
        <span>
          <span className={styles.seg2} />
        </span>
        <span>
          <span className={styles.seg3} />
        </span>
      </div>
      <CornerMarks size={12} inset={10} color="rgb(237 234 228 / 0.5)" />
    </div>
  );
}
