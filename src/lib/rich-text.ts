/**
 * Formato de texto editable desde el panel:
 *   *texto*  → cursiva serif (<em>)
 *   \n       → salto de línea
 * No interpreta HTML: todo lo demás se muestra tal cual (sin riesgo de inyección).
 */

export type RichToken = { type: "text"; value: string } | { type: "em"; value: string } | { type: "br" };

export function parseRich(input: string): RichToken[] {
  const tokens: RichToken[] = [];
  const lines = (input ?? "").replace(/\r\n?/g, "\n").split("\n");
  lines.forEach((line, i) => {
    if (i > 0) tokens.push({ type: "br" });
    const re = /\*([^*\n]+)\*/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      if (m.index > last) tokens.push({ type: "text", value: line.slice(last, m.index) });
      tokens.push({ type: "em", value: m[1] });
      last = m.index + m[0].length;
    }
    if (last < line.length) tokens.push({ type: "text", value: line.slice(last) });
  });
  return tokens;
}

/** Texto plano sin marcas (para <title>, alt, contadores de caracteres…). */
export function plainText(input: string, lineBreak = " "): string {
  return parseRich(input)
    .map((t) => (t.type === "br" ? lineBreak : t.value))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
