import { Fragment } from "react";
import { parseRich } from "@/lib/rich-text";

interface SplitWordsProps {
  text: string;
  /** Solo para la guía de estilo: fracción de palabras ya «iluminadas» (0–1). */
  previewLit?: number;
  /** Muestra el cabezal (1b) tras la última palabra iluminada en la vista previa. */
  head?: boolean;
}

/**
 * Divide un texto editable en palabras (<span data-word>) conservando las *cursivas*.
 * El movimiento (src/motion) ilumina las palabras con el scroll. Sin JavaScript o con
 * movimiento reducido, todas se ven iluminadas: el texto siempre es legible.
 */
export function SplitWords({ text, previewLit, head = false }: SplitWordsProps) {
  const words: { word: string; em: boolean }[] = [];
  for (const t of parseRich(text)) {
    if (t.type === "br") continue;
    for (const w of t.value.split(/\s+/).filter(Boolean)) words.push({ word: w, em: t.type === "em" });
  }
  const litCount = previewLit === undefined ? words.length : Math.round(words.length * previewLit);

  return (
    <>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span data-word className={previewLit !== undefined && i >= litCount ? "text-ghost" : undefined}>
            {w.em ? <em>{w.word}</em> : w.word}
          </span>
          {head && previewLit !== undefined && i === litCount - 1 && (
            <span aria-hidden="true" className="mx-1.5 inline-block h-[0.9em] w-[2px] translate-y-[0.12em] bg-bone" />
          )}{" "}
        </Fragment>
      ))}
    </>
  );
}
