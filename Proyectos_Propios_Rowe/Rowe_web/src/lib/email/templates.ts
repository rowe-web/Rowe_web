import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { hasRealValue } from "@/lib/content/settings";
import { absoluteUrl } from "@/lib/site";
import type { Mail } from "./transport";

export interface NewLeadPayload {
  leadId: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  /** Opcional (los avisos encolados antes de existir el campo no lo traen). */
  city?: string;
  need: string;
  sector: string;
  budget: string;
  items: string;
  message: string;
  origin: "formulario" | "configurador";
  quoteNumber: string | null;
  createdAt: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Aviso interno de nuevo lead (al equipo). Estética de la marca, legible en Gmail y en móvil. */
export async function newLeadEmail(p: NewLeadPayload, to: string[]): Promise<Mail> {
  const rows: [string, string][] = [
    ["Necesita", p.need],
    ["Sector", p.sector],
    ["Presupuesto", p.budget],
    ...(p.items ? ([["Configuración", p.items]] as [string, string][]) : []),
    ["Origen", p.origin === "configurador" ? `Configurador${p.quoteNumber ? ` · ${p.quoteNumber}` : ""}` : "Formulario"],
    ["Email", p.email],
    ["Teléfono", p.phone || "—"],
    ["Empresa", p.company || "—"],
    ["Ubicación", p.city || "—"],
  ];
  const panel = absoluteUrl(`/admin/mensajes?lead=${p.leadId}`);
  const when = new Date(p.createdAt).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "medium", timeStyle: "short" });

  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#EDEAE4;padding:24px 12px;font-family:Helvetica,Arial,sans-serif;color:#0A0A0A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #d9d5ce">
<tr><td style="padding:28px 32px 8px"><img src="cid:rowe-logo" alt="ROWE" height="22" style="display:block;height:22px"></td></tr>
<tr><td style="padding:8px 32px 0;font:11px/1.6 'Courier New',monospace;letter-spacing:.12em;text-transform:uppercase;color:#6B6862"><span style="color:#FF3B1F">●</span> Rec · Nuevo mensaje · ${esc(when)}</td></tr>
<tr><td style="padding:14px 32px 6px;font:400 30px/1.1 Georgia,serif">${esc(p.name)}${p.company ? ` <span style="color:#8A8780">· ${esc(p.company)}</span>` : ""}</td></tr>
<tr><td style="padding:12px 32px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${rows.map(([k, v]) => `<tr><td style="padding:9px 0;border-top:1px solid #ebe7e0;font:10px/1.5 'Courier New',monospace;letter-spacing:.12em;text-transform:uppercase;color:#6B6862;width:130px;vertical-align:top">${esc(k)}</td><td style="padding:9px 0;border-top:1px solid #ebe7e0;font:15px/1.5 Helvetica,Arial,sans-serif">${esc(v)}</td></tr>`).join("")}
</table></td></tr>
<tr><td style="padding:18px 32px 0;font:10px/1.5 'Courier New',monospace;letter-spacing:.12em;text-transform:uppercase;color:#6B6862">Mensaje</td></tr>
<tr><td style="padding:6px 32px 0;font:15px/1.6 Helvetica,Arial,sans-serif;white-space:pre-wrap">${esc(p.message || "Sin mensaje.")}</td></tr>
<tr><td style="padding:26px 32px 32px">
<a href="mailto:${esc(p.email)}?subject=${encodeURIComponent("Tu proyecto con ROWE")}" style="display:inline-block;background:#0A0A0A;color:#EDEAE4;text-decoration:none;padding:13px 22px;border-radius:999px;font:500 14px Helvetica,Arial,sans-serif">Responder por email</a>
&nbsp; <a href="${esc(panel)}" style="color:#0A0A0A;font:14px Helvetica,Arial,sans-serif">Abrir en el panel →</a>
</td></tr>
</table>
<p style="max-width:600px;margin:14px auto 0;font:10px/1.6 'Courier New',monospace;letter-spacing:.1em;text-transform:uppercase;color:#8A8780;text-align:center">El mensaje ya está guardado en el panel aunque este aviso no llegue.</p>
</body></html>`;

  const text = [
    `Nuevo mensaje · ${when}`,
    `${p.name}${p.company ? ` · ${p.company}` : ""}`,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "Mensaje:",
    p.message || "Sin mensaje.",
    "",
    `Panel: ${panel}`,
  ].join("\n");

  const logo = await readFile(path.join(process.cwd(), "src/assets/brand/rowe-logo-negro.png")).catch(() => null);
  return {
    to,
    replyTo: p.email,
    // Aviso automático (RFC 3834): los clientes de correo no le contestan con respuestas automáticas
    headers: { "Auto-Submitted": "auto-generated" },
    subject: `Nuevo mensaje · ${p.name}${p.company ? ` (${p.company})` : ""} · ${p.need}`,
    html,
    text,
    attachments: logo ? [{ filename: "rowe.png", content: logo, cid: "rowe-logo" }] : undefined,
  };
}

/** Invitación al panel (o enlace para volver a crear la contraseña). */
export async function inviteEmail(to: string, link: string, role: "admin" | "editor", invitedBy: string): Promise<Mail> {
  const roleText = role === "admin" ? "administrador" : "editor";
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#EDEAE4;padding:24px 12px;font-family:Helvetica,Arial,sans-serif;color:#0A0A0A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #d9d5ce">
<tr><td style="padding:28px 32px 8px"><img src="cid:rowe-logo" alt="ROWE" height="22" style="display:block;height:22px"></td></tr>
<tr><td style="padding:14px 32px 6px;font:400 30px/1.1 Georgia,serif">Te damos acceso al panel de ROWE</td></tr>
<tr><td style="padding:8px 32px 0;font:15px/1.6 Helvetica,Arial,sans-serif">${esc(invitedBy)} te ha invitado como <strong>${roleText}</strong>. Pulsa el botón para crear tu contraseña.</td></tr>
<tr><td style="padding:26px 32px 12px"><a href="${esc(link)}" style="display:inline-block;background:#0A0A0A;color:#EDEAE4;text-decoration:none;padding:13px 22px;border-radius:999px;font:500 14px Helvetica,Arial,sans-serif">Crear mi contraseña</a></td></tr>
<tr><td style="padding:0 32px 32px;font:12px/1.6 Helvetica,Arial,sans-serif;color:#6B6862">El enlace caduca pronto y solo sirve una vez. Si no esperabas este email, ignóralo.</td></tr>
</table></body></html>`;
  const text = `${invitedBy} te ha invitado al panel de ROWE como ${roleText}.\n\nCrea tu contraseña aquí:\n${link}\n\nEl enlace caduca pronto y solo sirve una vez.`;
  const logo = await readFile(path.join(process.cwd(), "src/assets/brand/rowe-logo-negro.png")).catch(() => null);
  return { to: [to], subject: "Tu acceso al panel de ROWE", html, text, attachments: logo ? [{ filename: "rowe.png", content: logo, cid: "rowe-logo" }] : undefined };
}


/** Datos de la solicitud del cliente que se resumen en la respuesta. */
export interface ReplyLeadSummary {
  name: string;
  need: string;
  budget: string;
  /** Funciones o partidas elegidas (configurador) o el detalle de la solicitud. */
  items: string[];
  quoteNumber: string | null;
  message: string;
  createdAt: string;
}

export interface ReplyContact {
  email: string;
  phone: string;
  whatsapp: string;
  city: string;
  tagline: string;
}

/** «[+34 600 000 000]», «[Ciudad, Provincia]»…: datos de relleno que nunca salen en un email (ni vacíos). */
export function realValue(v: string | null | undefined): string {
  return hasRealValue(v) ? v.trim() : "";
}

// Paleta clara (máximo contraste) con el lenguaje de la web, solo con estilos en línea: sin
// clases, sin bloque <style> ni texto oculto (lo que los filtros de Gmail/Outlook miran con lupa).
// En modo oscuro, Gmail y Outlook invierten los colores por su cuenta y el diseño lo aguanta:
// no hay texto claro sobre fondo claro.
const PAPER = "#EDEAE4";
const CARD = "#FFFFFF";
const INK = "#111111";
const SOFT = "#555555";
const LINE = "#E3DFD8";
const REC = "#FF3B1F";
const SERIF = "Georgia,'Times New Roman',serif";
const MONO = "'Courier New',Courier,monospace";
const SANS = "Helvetica,Arial,sans-serif";
const LABEL = `font:10px/1.5 ${MONO};letter-spacing:.14em;text-transform:uppercase;color:${SOFT}`;
// Rótulos del resumen «Tu solicitud»: casi negros y en semi-negrita, nítidos sobre el fondo claro
const SUMMARY_LABEL = `font:600 10px/1.5 ${MONO};letter-spacing:.14em;text-transform:uppercase;color:#222222`;

// ---------------------------------------------------------------------------
// Piezas comunes de los emails al cliente (respuesta y confirmación)
// ---------------------------------------------------------------------------

/** Logotipo: con dominio propio, la imagen servida desde la web; sin él, un rótulo de texto (nunca
 * una imagen adjunta, que en el correo de un remitente nuevo pesa en contra en los filtros de spam). */
function wordmark(): string {
  return absoluteUrl("/").startsWith("https://")
    ? `<img src="${absoluteUrl("/brand/rowe-logo-email.png")}" alt="ROWE" width="124" height="47" style="display:block;width:124px;height:47px;border:0">`
    : `<span style="font:400 26px/1 ${SERIF};letter-spacing:.08em;color:${INK}">ROWE</span><span style="font:26px/1 ${SANS};color:${REC}">&nbsp;&#8226;</span>`;
}

/** Recuadro «Tu solicitud»: filas, lo que eligió y su mensaje. */
function summaryHtml(rows: [string, string][], items: string[], message: string): string {
  return `
<tr><td style="padding:30px 28px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F7F5F1" style="background:#F7F5F1;border:1px solid ${LINE};border-radius:4px">
    <tr><td style="padding:18px 22px 6px;${SUMMARY_LABEL}"><span style="color:${REC}">&#9679;</span>&nbsp; Tu solicitud</td></tr>
    <tr><td style="padding:4px 22px 6px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${rows
  .map(
    ([k, v]) =>
      `        <tr><td style="padding:10px 12px 10px 0;border-top:1px solid ${LINE};${SUMMARY_LABEL};width:130px;vertical-align:top">${esc(k)}</td><td style="padding:10px 0;border-top:1px solid ${LINE};font:15px/1.5 ${SANS};color:${INK}">${esc(v)}</td></tr>`,
  )
  .join("\n")}
      </table>
    </td></tr>
${
  items.length
    ? `    <tr><td style="padding:10px 22px 6px;${SUMMARY_LABEL}">Lo que elegiste</td></tr>
    <tr><td style="padding:2px 22px 12px">${items
        .map(
          (i) =>
            `<span style="display:inline-block;margin:0 6px 8px 0;padding:6px 11px;border:1px solid #CFCAC1;border-radius:999px;background:${CARD};font:600 12px/1.3 ${MONO};letter-spacing:.04em;color:#1a1a1a">${esc(i)}</span>`,
        )
        .join("")}</td></tr>`
    : ""
}
${
  message
    ? `    <tr><td style="padding:8px 22px 6px;${SUMMARY_LABEL}">Tu mensaje</td></tr>
    <tr><td style="padding:2px 22px 20px"><div style="border-left:2px solid #CFCAC1;padding:2px 0 2px 14px;font:italic 15px/1.6 ${SERIF};color:#333333;white-space:pre-wrap">${esc(message)}</div></td></tr>`
    : `    <tr><td style="padding:0 0 12px"></td></tr>`
}
  </table>
</td></tr>`;
}

/** Versión de texto del resumen. */
function summaryText(rows: [string, string][], items: string[], message: string): string[] {
  return [
    "----------------------------------------",
    "TU SOLICITUD",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(items.length ? [`Lo que elegiste: ${items.join(" · ")}`] : []),
    ...(message ? ["", "Tu mensaje:", message] : []),
    "----------------------------------------",
  ];
}

/** Datos de contacto reales de ROWE (sin vacíos ni provisionales). */
function contactLines(contact: ReplyContact, from: string) {
  const phone = realValue(contact.phone);
  const wa = realValue(contact.whatsapp).replace(/[^\d]/g, "");
  const email = realValue(contact.email) || from;
  const html = [
    `<a href="mailto:${esc(email)}" style="color:${INK};text-decoration:underline">${esc(email)}</a>`,
    phone ? `<a href="tel:${esc(phone.replace(/[^\d+]/g, ""))}" style="color:${INK};text-decoration:none">${esc(phone)}</a>` : "",
    wa ? `<a href="https://wa.me/${wa}" style="color:${INK};text-decoration:underline">WhatsApp</a>` : "",
  ].filter(Boolean);
  const text = [email, phone, wa ? `WhatsApp: https://wa.me/${wa}` : ""].filter(Boolean).join(" · ");
  return { html: html.join(` <span style="color:#999999">&middot;</span> `), text };
}

/** Marco del email: cabecera con el logotipo, titular, contenido, contacto, pie y por qué lo recibe. */
function layout(o: { subject: string; kicker: string; titleHtml: string; content: string; contactHtml: string; tagline: string; city: string; reason: string }): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(o.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};color:${INK}" bgcolor="${PAPER}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${PAPER}" style="background:${PAPER}">
<tr><td align="center" style="padding:28px 12px 36px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${CARD}" style="max-width:640px;background:${CARD};border:1px solid #D9D5CE">

<tr><td style="padding:20px 28px;border-bottom:1px solid ${LINE}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle">${wordmark()}</td>
    <td align="right" style="vertical-align:middle;${LABEL}"><span style="color:${REC}">&#9679;</span>&nbsp; ${esc(o.tagline)}</td>
  </tr></table>
</td></tr>

<tr><td style="padding:36px 28px 6px;${LABEL}">${esc(o.kicker)}</td></tr>
<tr><td style="padding:6px 28px 0;font:400 34px/1.1 ${SERIF};color:${INK}">${o.titleHtml}</td></tr>
${o.content}

<tr><td style="padding:30px 28px 28px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${LINE}"><tr>
    <td style="padding-top:18px;font:14px/1.8 ${SANS};color:${SOFT}">Responde a este email o escríbenos:<br>${o.contactHtml}</td>
  </tr></table>
</td></tr>

<tr><td style="padding:16px 28px 20px;border-top:1px solid ${LINE};${LABEL}">ROWE &middot; ${esc(o.tagline)}${o.city ? ` &middot; ${esc(o.city)}` : ""}</td></tr>
</table>
<p style="max-width:640px;margin:14px auto 0;font:12px/1.6 ${SANS};color:${SOFT};text-align:center">${esc(o.reason)}</p>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Respuesta a un mensaje, escrita en el panel y enviada desde la cuenta de ROWE.
 * Mismo lenguaje que la web (titular en serif, rótulos monoespaciados, punto REC) en una
 * versión clara de máximo contraste. Incluye el resumen de lo que pidió.
 *
 * Pensada para llegar a la bandeja de entrada: estructura de tablas con estilos en línea
 * (sin scripts, formularios, clases ni CSS), versión de texto equivalente, texto real (no una
 * imagen), pocos enlaces y todos válidos (nunca a localhost ni a un número de relleno) y una
 * línea que explica por qué se recibe.
 */
export async function replyEmail(p: { to: string; subject: string; body: string; from: string; lead: ReplyLeadSummary; contact: ReplyContact }): Promise<Mail> {
  const received = new Date(p.lead.createdAt).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric" });
  const tagline = realValue(p.contact.tagline) || "Web & Audiovisual";
  const city = realValue(p.contact.city);
  const contact = contactLines(p.contact, p.from);
  const reason = "Recibes este email porque nos escribiste desde la web de ROWE.";

  const rows: [string, string][] = [
    ["Servicio", p.lead.need],
    ["Presupuesto", realValue(p.lead.budget) || "Sin indicar"],
    ...(p.lead.quoteNumber ? ([["Nº de presupuesto", p.lead.quoteNumber]] as [string, string][]) : []),
    ["Solicitud", `Recibida el ${received}`],
  ];

  const html = layout({
    subject: p.subject,
    kicker: `Para ${p.lead.name}`,
    titleHtml: esc(p.subject),
    content: `
<tr><td style="padding:26px 28px 0;font:16px/1.7 ${SANS};color:${INK};white-space:pre-wrap">${esc(p.body)}</td></tr>
${summaryHtml(rows, p.lead.items, p.lead.message)}`,
    contactHtml: contact.html,
    tagline,
    city,
    reason,
  });

  const text = [
    p.body,
    "",
    ...summaryText(rows, p.lead.items, p.lead.message),
    "",
    "Responde a este email o escríbenos:",
    contact.text,
    "",
    `ROWE · ${tagline}${city ? ` · ${city}` : ""}`,
    reason,
  ].join("\n");

  return {
    to: [p.to],
    replyTo: p.from || undefined,
    subject: p.subject,
    html,
    text,
  };
}

// ---------------------------------------------------------------------------
// Confirmación automática al cliente
// ---------------------------------------------------------------------------

/** Textos del email de confirmación (Ajustes → Email de confirmación). {nombre} = nombre del cliente. */
export interface ConfirmationTexts {
  subject: string;
  title: string;
  intro: string;
  outro: string;
  /** Línea final: por qué recibe el email. */
  reason: string;
}

/** Lo que se guarda en la cola para enviar la confirmación (y el PDF, si viene del configurador). */
export interface ConfirmationPayload {
  leadId: string;
  name: string;
  email: string;
  need: string;
  sector: string;
  budget: string;
  items: string[];
  quoteNumber: string | null;
  message: string;
  createdAt: string;
}

/** «Hola {nombre}» con el nombre de pila del cliente. */
const fillName = (t: string, name: string) => t.replace(/\{nombre\}/g, name.trim().split(/\s+/)[0] || name.trim());

/** *texto* → cursiva (como en la web), escapando todo lo demás. */
const richHtml = (t: string) => esc(t).replace(/\*([^*\n]+)\*/g, `<em style="font-style:italic">$1</em>`);
const plain = (t: string) => t.replace(/\*([^*\n]+)\*/g, "$1");

/**
 * Confirmación automática al cliente justo después de enviar «Hablemos»: tenemos tu solicitud,
 * cuándo respondemos, el resumen de lo que pidió y, si existe una agenda activa, el botón para
 * reservar videollamada. Si viene del configurador, el PDF del presupuesto va adjunto.
 * Mismas reglas que la respuesta: alta legibilidad, versión de texto, pocos enlaces y válidos,
 * Reply-To a ROWE y la línea de por qué se recibe. Auto-Submitted: es un aviso automático
 * (RFC 3834), así los clientes de correo no le contestan con respuestas automáticas.
 */
export async function confirmationEmail(p: {
  lead: ConfirmationPayload;
  texts: ConfirmationTexts;
  contact: ReplyContact;
  from: string;
  /** Agenda para reservar videollamada, si existe y está activa. */
  booking?: { url: string; label: string } | null;
  pdf?: { filename: string; content: Buffer } | null;
  messageId?: string;
}): Promise<Mail> {
  const received = new Date(p.lead.createdAt).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric" });
  const tagline = realValue(p.contact.tagline) || "Web & Audiovisual";
  const city = realValue(p.contact.city);
  const contact = contactLines(p.contact, p.from);
  const name = p.lead.name;
  const subject = plain(fillName(p.texts.subject, name));
  const title = fillName(p.texts.title, name);
  const intro = fillName(p.texts.intro, name);
  const outro = fillName(p.texts.outro, name);
  const reason = realValue(p.texts.reason) || "Recibes este email porque has enviado una solicitud desde la web de ROWE.";
  const booking = p.booking && /^https:\/\//.test(p.booking.url) ? { url: p.booking.url, label: realValue(p.booking.label) || "Reserva tu videollamada" } : null;

  const rows: [string, string][] = [
    ["Servicio", p.lead.need],
    ...(realValue(p.lead.sector) ? ([["Sector", p.lead.sector]] as [string, string][]) : []),
    ["Presupuesto", realValue(p.lead.budget) || "Sin indicar"],
    ...(p.lead.quoteNumber ? ([["Nº de presupuesto", p.lead.quoteNumber]] as [string, string][]) : []),
    ["Solicitud", `Recibida el ${received}`],
  ];
  const pdfNote = p.pdf ? `Te adjuntamos el PDF de tu presupuesto orientativo${p.lead.quoteNumber ? ` (${p.lead.quoteNumber})` : ""}.` : "";

  const html = layout({
    subject,
    kicker: "Solicitud recibida",
    titleHtml: richHtml(title),
    content: `
${intro ? `<tr><td style="padding:26px 28px 0;font:16px/1.7 ${SANS};color:${INK};white-space:pre-wrap">${richHtml(intro)}</td></tr>` : ""}
${pdfNote ? `<tr><td style="padding:14px 28px 0;font:15px/1.6 ${SANS};color:${INK}">${esc(pdfNote)}</td></tr>` : ""}
${
  booking
    ? `<tr><td style="padding:26px 28px 0"><a href="${esc(booking.url)}" style="display:inline-block;background:${INK};color:#FFFFFF;text-decoration:none;padding:14px 24px;border-radius:999px;font:500 15px/1 ${SANS}">${esc(booking.label)}</a></td></tr>`
    : ""
}
${summaryHtml(rows, p.lead.items, p.lead.message)}
${outro ? `<tr><td style="padding:26px 28px 0;font:15px/1.7 ${SANS};color:${INK};white-space:pre-wrap">${richHtml(outro)}</td></tr>` : ""}`,
    contactHtml: contact.html,
    tagline,
    city,
    reason,
  });

  const text = [
    plain(title),
    "",
    ...(intro ? [plain(intro), ""] : []),
    ...(pdfNote ? [pdfNote, ""] : []),
    ...(booking ? [`${booking.label}: ${booking.url}`, ""] : []),
    ...summaryText(rows, p.lead.items, p.lead.message),
    ...(outro ? ["", plain(outro)] : []),
    "",
    "Responde a este email o escríbenos:",
    contact.text,
    "",
    `ROWE · ${tagline}${city ? ` · ${city}` : ""}`,
    reason,
  ].join("\n");

  return {
    to: [p.lead.email],
    replyTo: p.from || undefined,
    messageId: p.messageId,
    headers: { "Auto-Submitted": "auto-generated" },
    subject,
    html,
    text,
    attachments: p.pdf ? [{ filename: p.pdf.filename, content: p.pdf.content, contentDisposition: "attachment" }] : undefined,
  };
}
