/**
 * Utilidades puras para las respuestas de los clientes por email (sin red ni base de datos,
 * para poder probarlas). La lectura del buzón está en inbox.ts.
 */

/** «<abc@gmail.com>» / «abc@gmail.com» → «<abc@gmail.com>» (minúsculas, sin espacios). */
export function normalizeMessageId(id: string | null | undefined): string | null {
  const v = (id ?? "").trim().replace(/^<|>$/g, "").trim().toLowerCase();
  return v ? `<${v}>` : null;
}

/** Todos los Message-ID de las cabeceras In-Reply-To y References de un email. */
export function threadIds(inReplyTo: string | null | undefined, references: string | string[] | null | undefined): string[] {
  const refs = Array.isArray(references) ? references.join(" ") : (references ?? "");
  const all = `${inReplyTo ?? ""} ${refs}`.match(/<[^<>\s]+>/g) ?? [];
  return [...new Set(all.map((m) => normalizeMessageId(m)!).filter(Boolean))];
}

// Primera línea de la cita que añaden los clientes de correo al responder
const QUOTE_HEADERS = [
  /^El\s.+\sescribió:\s*$/i, // Gmail en español
  /^On\s.+\swrote:\s*$/i, // Gmail / Apple Mail en inglés
  /^Le\s.+\sa écrit\s?:\s*$/i,
  /^-{2,}\s*(Mensaje original|Original Message|Message d'origine)\s*-{2,}/i, // Outlook
  /^_{8,}\s*$/, // Outlook (raya)
  /^(De|From):\s.+$/i, // bloque de cabeceras de Outlook
  /^Enviado desde mi (iPhone|iPad|Android|móvil)/i,
  /^Sent from my (iPhone|iPad|Android)/i,
];

/**
 * Texto nuevo de una respuesta: corta en la cita del email anterior (líneas «> …» o la
 * cabecera «El … escribió:») y en la firma, y quita espacios sobrantes. Si no queda nada,
 * devuelve el texto completo recortado (mejor de más que vacío).
 */
export function stripQuoted(text: string, { sender = "" }: { sender?: string } = {}): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (t.startsWith(">")) break;
    // Gmail parte a veces la cabecera de la cita en dos líneas: «El jue, 16 oct 2026,» + «ROWE <…> escribió:»
    const joined = `${t} ${(lines[i + 1] ?? "").trim()}`;
    if (QUOTE_HEADERS.some((re) => re.test(t)) || /^El\s.+\sescribió:\s*$/i.test(joined) || /^On\s.+\swrote:\s*$/i.test(joined)) break;
    out.push(line);
  }
  const body = out.slice(0, signatureStart(out, sender)).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return body || text.trim();
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const CONTACT = /[^\s@]+@[^\s@]+\.[a-z]{2,}|https?:\/\/|www\.|\+?\d[\d\s]{7,}\d/i;

/**
 * Dónde empieza la firma (o lines.length si no hay):
 *  - el separador estándar «-- » o los pies automáticos («Libre de virus…»), o
 *  - un bloque tras una línea en blanco que empieza por el nombre de quien escribe o es una
 *    línea con «|» (p. ej. «Lucía Pérez | Directora»), y que trae datos de contacto (email,
 *    web o teléfono). Una despedida sola («Lucía») no se toca: es parte del mensaje.
 */
function signatureStart(lines: string[], sender: string): number {
  const name = fold(sender);
  for (let i = 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^--\s*$/.test(t) || /^(Libre de virus|Virus-free)\b/i.test(t)) return i;
    if (lines[i - 1].trim() !== "" || !t) continue;
    const byName = name.length >= 3 && fold(t).startsWith(name);
    if ((byName || /\s\|\s/.test(t)) && CONTACT.test(lines.slice(i).join("\n"))) return i;
  }
  return lines.length;
}

export interface LeadCandidate {
  id: string;
  email: string;
  created_at: string;
}

export type InboundMatch = { leadId: string; by: "thread" | "sender" } | null;

/**
 * A qué mensaje (lead) pertenece un email recibido:
 *  1. «thread»: contesta (In-Reply-To / References) a una respuesta que ROWE envió desde el panel.
 *  2. «sender»: lo envía la dirección de un cliente que ya escribió → su mensaje más reciente.
 * Cualquier otro email del buzón (avisos internos, publicidad…) se ignora: null.
 */
export function matchInbound(
  email: { from: string; threadIds: string[] },
  sentReplies: { message_id: string | null; lead_id: string }[],
  leadsByEmail: LeadCandidate[],
): InboundMatch {
  const byId = new Map(sentReplies.filter((r) => r.message_id).map((r) => [normalizeMessageId(r.message_id)!, r.lead_id]));
  for (const id of email.threadIds) {
    const lead = byId.get(id);
    if (lead) return { leadId: lead, by: "thread" };
  }
  const from = email.from.trim().toLowerCase();
  const own = leadsByEmail.filter((l) => l.email.trim().toLowerCase() === from).sort((a, b) => b.created_at.localeCompare(a.created_at));
  return own[0] ? { leadId: own[0].id, by: "sender" } : null;
}
