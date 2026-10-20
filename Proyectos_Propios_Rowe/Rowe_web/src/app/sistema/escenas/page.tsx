import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { boards } from "./boards";

export const metadata: Metadata = { title: "Escenas · revisión", robots: { index: false, follow: false } };

const SCALE_DESK = 0.5;
const SCALE_MOB = 0.6;

/**
 * Tablero de revisión de la Fase 2 (como las láminas de ROWE Direcciones):
 * cada escena a 1440 y a 390 px, en estático. El movimiento se describe en la nota.
 */
export default function EscenasBoard() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "true") notFound();

  return (
    <main className="min-h-screen bg-canvas px-6 py-16 md:px-16">
      <header className="flex flex-col gap-6 pb-16">
        <Logo height={20} />
        <p className="label-mono text-muted">Fase 2 · Revisión de diseño · estático (sin movimiento)</p>
        <h1 className="headline text-[clamp(48px,7vw,104px)]">
          Escenas 00–08, <em>menú y preloader</em>
        </h1>
        <p className="max-w-[70ch] text-[17px] leading-relaxed text-muted">
          Cada lámina muestra la escena a 1440 px y a 390 px con el contenido inicial. Los textos y medios son editables desde el panel; los
          medios son placeholders para sustituir. Puedes desplazarte dentro de cada marco.
        </p>
      </header>

      <div className="flex flex-col gap-24">
        {boards.map((b) => (
          <section key={b.key} className="flex flex-col gap-5 border-t border-line-strong pt-8">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <h2 className="headline-serif text-[40px]">{b.title}</h2>
              <p className="max-w-[90ch] text-[15px] text-muted">{b.note}</p>
            </div>
            <div className="flex flex-wrap items-start gap-10">
              <Frame src={`/sistema/escenas/${b.key}`} w={1440} h={Math.min(b.desk, 1400)} scale={SCALE_DESK} label="Escritorio 1440" />
              <Frame src={`/sistema/escenas/${b.key}`} w={390} h={Math.min(b.mob, 1500)} scale={SCALE_MOB} label="Móvil 390" />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function Frame({ src, w, h, scale, label }: { src: string; w: number; h: number; scale: number; label: string }) {
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="label-mono text-[10px] text-muted">{label}</figcaption>
      <div className="overflow-hidden border border-line-strong bg-ink" style={{ width: w * scale, height: h * scale }}>
        <iframe
          src={src}
          title={`${label} · ${src}`}
          loading="lazy"
          style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "0 0", border: 0 }}
        />
      </div>
    </figure>
  );
}
