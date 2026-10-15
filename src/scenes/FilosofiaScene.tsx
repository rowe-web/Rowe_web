import { RichText } from "@/components/ui/RichText";
import { SceneHeader } from "@/components/scene/SceneHeader";
import type { SceneProps } from "./types";

interface Point {
  key: string;
  title: string;
  body: string;
}

/**
 * Escena 08 · Filosofía — diseño nuevo siguiendo el sistema.
 * Lista editorial numerada: cada principio en una fila grande (sans 300) con su
 * explicación. Revelado por máscara al entrar; hover: la fila se desplaza y aparece
 * el punto REC (mismo gesto que las filas del configurador).
 */
export function FilosofiaScene({ scene }: SceneProps<{ points?: Point[] }>) {
  const points = scene.data.points ?? [];
  return (
    <section id="filosofia" data-scene="filosofia" className="relative gutter-x py-[clamp(88px,13vh,140px)]">
      <SceneHeader kicker={scene.kicker} meta={[`${points.length} principios`]} />
      <h2 data-reveal="mask" className="headline mt-12 text-[clamp(48px,12.5vw,64px)] md:mt-[9vh] md:text-[clamp(64px,8.3vw,128px)]">
        <RichText text={scene.title} />
      </h2>

      <ol className="mt-14 flex flex-col border-t border-line md:mt-[10vh]">
        {points.map((p) => (
          <li
            key={p.key}
            data-reveal
            className="group/pt grid grid-cols-[36px_1fr] gap-x-4 gap-y-3 border-b border-line py-7 transition-[padding] duration-[400ms] ease-[var(--ease-out)] md:grid-cols-[110px_minmax(0,1.2fr)_minmax(0,1fr)] md:items-baseline md:gap-x-[3vw] md:py-10 md:hover:pl-4"
          >
            <span className="flex items-center gap-3 label-mono text-muted">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-rec opacity-0 transition-opacity duration-300 group-hover/pt:opacity-100 max-md:hidden" />
              {p.key}
            </span>
            <span className="headline text-[clamp(30px,8vw,40px)] leading-[1] md:text-[clamp(40px,4.4vw,68px)]">
              <RichText text={p.title} />
            </span>
            <span className="col-start-2 max-w-[44ch] text-[15px] leading-relaxed text-muted md:col-start-3 md:text-[17px]">{p.body}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
