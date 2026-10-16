import type { CSSProperties, ReactNode } from "react";
import { CornerMarks } from "@/components/ui/CornerMarks";
import { RecDot } from "@/components/ui/RecDot";
import styles from "./MenuPreview.module.css";

export type MenuPreviewKind = "inicio" | "web" | "audiovisual" | "proyectos" | "presupuesto" | "hablemos";

/**
 * Qué animación toca a cada elemento del menú, por su enlace (así se pueden añadir,
 * quitar o reordenar elementos desde el panel sin tocar código). Un enlace que no
 * encaja devuelve null y el menú muestra el recuadro de siempre.
 */
export function menuPreviewKind(href: string): MenuPreviewKind | null {
  const [path, hash = ""] = href.split("#");
  if (hash === "presupuesto") return "presupuesto";
  if (hash === "hablemos") return "hablemos";
  if (hash) return null;
  if (path === "/" || path === "") return "inicio";
  if (path.startsWith("/web")) return "web";
  if (path.startsWith("/audiovisual")) return "audiovisual";
  if (path.startsWith("/proyectos")) return "proyectos";
  return null;
}

const at = (s: number) => ({ "--at": s }) as CSSProperties;

/**
 * Vista previa animada (4:5) del elemento del menú que tiene el cursor encima.
 * Se monta de nuevo al cambiar de elemento: entra con la cortinilla desde el centro y la
 * animación empieza desde el principio. Solo CSS. Decorativa: el pie de figura la describe.
 */
export function MenuPreview({ kind }: { kind: MenuPreviewKind }) {
  return (
    <div aria-hidden="true" data-menu-preview={kind} className={`${styles.root} relative overflow-hidden bg-ph`} style={{ aspectRatio: "4 / 5" }}>
      {SCENES[kind]}
      <CornerMarks size={16} inset={12} color="rgb(237 234 228 / 0.5)" />
    </div>
  );
}

const SCENES: Record<MenuPreviewKind, ReactNode> = {
  inicio: (
    <>
      <div className={styles.reel}>
        <span className={styles.play} />
      </div>
      <span className={`${styles.bar} ${styles.barTop}`} />
      <span className={`${styles.bar} ${styles.barBottom}`} />
      <span className={styles.tag}>2.39:1</span>
      <span className={`${styles.tag} ${styles.tagR}`}>RO + WE</span>
      <span className={styles.scrub}>
        <i />
      </span>
      <span className={styles.strip}>
        {[0.3, 0.45, 0.6, 0.75].map((s) => (
          <span key={s} className={styles.pop} style={at(s)} />
        ))}
      </span>
    </>
  ),

  web: (
    <>
      <span className={styles.tag}>WE · Build</span>
      <span className={styles.code}>
        &lt;/&gt;
        <span className={styles.caret} />
      </span>
      <div className={styles.browser}>
        <div className={styles.chrome}>
          <span />
          <span />
          <span />
          <i />
        </div>
        <div className={styles.page}>
          <b className={styles.g} style={{ ...at(0), width: "64%" }} />
          <b className={styles.g} style={{ ...at(0.08), width: "46%" }} />
          <em className={styles.g} style={{ ...at(0.16), width: "38%" }} />
          <span className={`${styles.btn} ${styles.g}`} style={at(0.24)} />
          <span className={styles.cards}>
            {[0.32, 0.4, 0.48].map((s) => (
              <span key={s} className={styles.pop} style={at(s)} />
            ))}
          </span>
        </div>
        <span className={styles.pointer} />
      </div>
    </>
  ),

  audiovisual: (
    <>
      <span className={styles.recTag}>
        <RecDot size={6} /> Rec
      </span>
      <span className={`${styles.tag} ${styles.tagR}`}>25 fps</span>
      <div className={styles.viewfinder}>
        <span className={styles.grid3} />
        <span className={`${styles.subject} ${styles.pop}`} style={at(0.1)} />
        <span className={styles.focus}>
          <span />
          <span />
          <span />
          <span />
        </span>
      </div>
      <span className={styles.meter}>
        {[0, 0.35, 0.15, 0.6, 0.25, 0.5, 0.1, 0.4, 0.7, 0.2, 0.55, 0.3].map((s, i) => (
          <span key={i} style={at(s)} />
        ))}
      </span>
    </>
  ),

  proyectos: (
    <>
      <div className={styles.tiles}>
        {[0, 0.15, 0.3, 0.45].map((s) => (
          <span key={s} className={styles.tile} style={at(s)}>
            <i />
          </span>
        ))}
      </div>
      <span className={styles.arrow}>↗</span>
    </>
  ),

  presupuesto: (
    <>
      <div className={styles.tracks}>
        <div className={styles.track}>
          RO
          <span className={styles.lane}>
            <b className={styles.g} style={{ ...at(0), flex: 3 }} />
            <b className={styles.g} style={{ ...at(0.25), flex: 2 }} />
          </span>
        </div>
        <div className={styles.track}>
          WE
          <span className={styles.lane}>
            <b className={styles.g} style={{ ...at(0.12), flex: 4 }} />
            <b className={styles.g} style={{ ...at(0.37), flex: 1.5 }} />
            <b className={styles.g} style={{ ...at(0.5), flex: 1 }} />
          </span>
        </div>
      </div>
      <div className={styles.total}>
        <span className={`${styles.totalRule} ${styles.g}`} style={at(0.6)} />
        <span className={styles.totalRow}>
          <span className={`${styles.euro} ${styles.pop}`} style={at(0.7)}>
            €
          </span>
          <span className={styles.sw} />
        </span>
      </div>
    </>
  ),

  hablemos: (
    <>
      <span className={styles.recTag}>
        <RecDot size={7} morph="start" />
      </span>
      <div className={styles.chat}>
        <span className={`${styles.msg} ${styles.pop}`} style={at(0)}>
          <em />
          <em />
          <em />
        </span>
        <span className={`${styles.msg} ${styles.me} ${styles.pop}`} style={at(0.5)}>
          <em />
          <em />
          <em />
        </span>
        <span className={`${styles.typing} ${styles.pop}`} style={at(1)}>
          {[0, 0.15, 0.3].map((s) => (
            <span key={s} style={at(s)} />
          ))}
        </span>
      </div>
      <span className={styles.send}>
        <em />→
      </span>
    </>
  ),
};

/** Resumen de la sección: las palabras suben por máscara, escalonadas (se reinicia al cambiar). */
export function MenuSummary({ text, className = "" }: { text: string; className?: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <p className={`${styles.summary} ${className}`}>
      <span className="sr-only">{text}</span>
      {words.map((w, i) => (
        <span key={i} aria-hidden="true" className={styles.word}>
          <span style={{ "--i": i } as CSSProperties}>{w}</span>
        </span>
      ))}
    </p>
  );
}
