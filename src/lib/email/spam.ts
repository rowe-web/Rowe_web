/**
 * Avisos (no bloqueos) sobre lo que suele hacer que un email acabe en spam. Los muestra el
 * panel mientras se escribe una respuesta; el email se puede enviar igual.
 */
const TRIGGERS = [
  "gratis",
  "oferta",
  "promoción",
  "descuento",
  "urgente",
  "gana dinero",
  "100%",
  "sin coste",
  "haz clic",
  "pincha aquí",
  "compra ya",
  "última oportunidad",
  "dinero fácil",
  "garantizado",
  "free",
  "winner",
];

export function spamHints(subject: string, body: string): string[] {
  const hints: string[] = [];
  const s = subject.trim();
  const letters = s.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
  if (!s) hints.push("El asunto está vacío: los emails sin asunto se marcan a menudo como spam.");
  else if (s.length > 78) hints.push("El asunto es muy largo: mejor por debajo de 60–70 caracteres.");
  if (letters.length >= 6 && letters === letters.toUpperCase()) hints.push("El asunto está en mayúsculas: escríbelo en minúsculas normales.");
  if (/[!?]{2,}|[€$]{2,}/.test(`${s} ${body}`)) hints.push("Evita signos repetidos (!!, ??, €€): parecen publicidad.");
  const text = `${s} ${body}`.toLowerCase();
  const found = TRIGGERS.filter((w) => text.includes(w));
  if (found.length) hints.push(`Palabras que los filtros asocian a publicidad: «${found.join("», «")}».`);
  const links = body.match(/https?:\/\//g)?.length ?? 0;
  if (links > 2) hints.push("Demasiados enlaces: deja uno o dos como mucho.");
  if (body.trim().length > 0 && body.trim().length < 20) hints.push("El texto es muy corto: un email con apenas contenido parece automático.");
  return hints;
}
