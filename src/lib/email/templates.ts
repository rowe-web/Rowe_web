import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { absoluteUrl } from "@/lib/site";
import type { Mail } from "./transport";

export interface NewLeadPayload {
  leadId: string;
  name: string;
  company: string;
  email: string;
  phone: string;
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

/** «[+34 600 000 000]», «[Ciudad, Provincia]»…: datos de relleno que nunca salen en un email. */
export function realValue(v: string | null | undefined): string {
  const t = (v ?? "").trim();
  return !t || /^\[.*\]$/.test(t) ? "" : t;
}

// Paleta clara (máximo contraste) con el lenguaje de la web; en modo oscuro (Apple Mail, iOS)
// se cambia por la paleta de la web con @media. Gmail y Outlook, que invierten los colores por
// su cuenta, reciben un diseño claro y legible que aguanta la inversión: el logotipo va sobre
// su propio fondo blanco (las imágenes no se invierten) y no hay texto claro sobre fondo claro.
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

/**
 * Respuesta a un mensaje, escrita en el panel y enviada desde la cuenta de ROWE.
 * Mismo lenguaje que la web (titular en serif, rótulos monoespaciados, punto REC) en una
 * versión clara de máximo contraste, con modo oscuro. Incluye el resumen de lo que pidió.
 *
 * Pensada para llegar a la bandeja de entrada: estructura de tablas con estilos en línea
 * (sin scripts, formularios ni CSS externo), versión de texto equivalente, texto real (no una
 * imagen), pocos enlaces y todos válidos (nunca a localhost ni a un número de relleno) y una
 * línea que explica por qué se recibe.
 */
export async function replyEmail(p: { to: string; subject: string; body: string; from: string; lead: ReplyLeadSummary; contact: ReplyContact }): Promise<Mail> {
  const hosted = absoluteUrl("/").startsWith("https://");
  const logoSrc = hosted ? absoluteUrl("/brand/rowe-logo-email.png") : "cid:rowe-logo";
  const received = new Date(p.lead.createdAt).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric" });
  const preheader = p.body.replace(/\s+/g, " ").trim().slice(0, 110);
  const tagline = realValue(p.contact.tagline) || "Web & Audiovisual";
  const city = realValue(p.contact.city);
  const phone = realValue(p.contact.phone);
  const wa = realValue(p.contact.whatsapp).replace(/[^\d]/g, "");
  const contactEmail = realValue(p.contact.email) || p.from;

  const rows: [string, string][] = [
    ["Servicio", p.lead.need],
    ["Presupuesto", realValue(p.lead.budget) || "Sin indicar"],
    ...(p.lead.quoteNumber ? ([["Nº de presupuesto", p.lead.quoteNumber]] as [string, string][]) : []),
    ["Solicitud", `Recibida el ${received}`],
  ];

  const summary = `
<tr><td class="px" style="padding:30px 40px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="panel" bgcolor="#F7F5F1" style="background:#F7F5F1;border:1px solid ${LINE};border-radius:4px">
    <tr><td class="label" style="padding:18px 22px 6px;${LABEL}"><span style="color:${REC}">&#9679;</span>&nbsp; Tu solicitud</td></tr>
    <tr><td style="padding:4px 22px 6px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${rows
  .map(
    ([k, v]) =>
      `        <tr><td class="label line" style="padding:10px 12px 10px 0;border-top:1px solid ${LINE};${LABEL};width:130px;vertical-align:top">${esc(k)}</td><td class="ink line" style="padding:10px 0;border-top:1px solid ${LINE};font:15px/1.5 ${SANS};color:${INK}">${esc(v)}</td></tr>`,
  )
  .join("\n")}
      </table>
    </td></tr>
${
  p.lead.items.length
    ? `    <tr><td class="label" style="padding:10px 22px 6px;${LABEL}">Lo que elegiste</td></tr>
    <tr><td style="padding:2px 22px 12px">${p.lead.items
        .map(
          (i) =>
            `<span class="chip ink" style="display:inline-block;margin:0 6px 8px 0;padding:6px 11px;border:1px solid #CFCAC1;border-radius:999px;background:${CARD};font:12px/1.3 ${MONO};letter-spacing:.04em;color:${INK}">${esc(i)}</span>`,
        )
        .join("")}</td></tr>`
    : ""
}
${
  p.lead.message
    ? `    <tr><td class="label" style="padding:8px 22px 6px;${LABEL}">Tu mensaje</td></tr>
    <tr><td style="padding:2px 22px 20px"><div class="quote" style="border-left:2px solid #CFCAC1;padding:2px 0 2px 14px;font:italic 15px/1.6 ${SERIF};color:#333333;white-space:pre-wrap">${esc(p.lead.message)}</div></td></tr>`
    : `    <tr><td style="padding:0 0 12px"></td></tr>`
}
  </table>
</td></tr>`;

  const contactBits = [
    `<a href="mailto:${esc(contactEmail)}" class="ink" style="color:${INK};text-decoration:underline">${esc(contactEmail)}</a>`,
    phone ? `<a href="tel:${esc(phone.replace(/[^\d+]/g, ""))}" class="ink" style="color:${INK};text-decoration:none">${esc(phone)}</a>` : "",
    wa ? `<a href="https://wa.me/${wa}" class="ink" style="color:${INK};text-decoration:underline">WhatsApp</a>` : "",
  ].filter(Boolean);

  const html = `<!doctype html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(p.subject)}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  @media (max-width:620px) { .px { padding-left:22px !important; padding-right:22px !important; } .h1 { font-size:32px !important; } }
  /* Modo oscuro (Apple Mail, iOS, Outlook para Mac): la paleta de la web */
  @media (prefers-color-scheme: dark) {
    body, .page { background:#0A0A0A !important; }
    .card { background:#121212 !important; border-color:#2A2928 !important; }
    .panel { background:#181817 !important; border-color:#2A2928 !important; }
    .chip { background:#121212 !important; border-color:#3A3937 !important; }
    .ink, .h1 { color:#EDEAE4 !important; }
    .label, .soft { color:#A8A49C !important; }
    .line { border-color:#2A2928 !important; }
    .quote { color:#C9C5BD !important; border-color:#3A3937 !important; }
  }
</style>
</head>
<body class="page" style="margin:0;padding:0;background:${PAPER};color:${INK}" bgcolor="${PAPER}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="page" bgcolor="${PAPER}" style="background:${PAPER}">
<tr><td align="center" style="padding:28px 12px 36px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="card" bgcolor="${CARD}" style="max-width:640px;background:${CARD};border:1px solid #D9D5CE">

<tr><td class="px line" style="padding:20px 40px;border-bottom:1px solid ${LINE}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle"><img src="${logoSrc}" alt="ROWE" width="124" height="47" style="display:block;width:124px;height:47px;border:0;outline:none;text-decoration:none"></td>
    <td align="right" class="label" style="vertical-align:middle;${LABEL}"><span style="color:${REC}">&#9679;</span>&nbsp; ${esc(tagline)}</td>
  </tr></table>
</td></tr>

<tr><td class="px label" style="padding:36px 40px 6px;${LABEL}">Para ${esc(p.lead.name)}</td></tr>
<tr><td class="px h1 ink" style="padding:6px 40px 0;font:400 40px/1.08 ${SERIF};color:${INK}">${esc(p.subject)}</td></tr>

<tr><td class="px ink" style="padding:26px 40px 0;font:16px/1.7 ${SANS};color:${INK};white-space:pre-wrap">${esc(p.body)}</td></tr>
${summary}

<tr><td class="px" style="padding:30px 40px 28px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="line" style="border-top:1px solid ${LINE}"><tr>
    <td class="soft" style="padding-top:18px;font:14px/1.8 ${SANS};color:${SOFT}">Responde a este email o escríbenos:<br>${contactBits.join(` <span class="soft" style="color:#999999">&middot;</span> `)}</td>
  </tr></table>
</td></tr>

<tr><td class="px label line" style="padding:16px 40px 20px;border-top:1px solid ${LINE};${LABEL}">ROWE &middot; ${esc(tagline)}${city ? ` &middot; ${esc(city)}` : ""}</td></tr>
</table>
<p class="soft" style="max-width:640px;margin:14px auto 0;font:12px/1.6 ${SANS};color:${SOFT};text-align:center">Recibes este email porque nos escribiste desde la web de ROWE.</p>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    p.body,
    "",
    "----------------------------------------",
    "TU SOLICITUD",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(p.lead.items.length ? [`Lo que elegiste: ${p.lead.items.join(" · ")}`] : []),
    ...(p.lead.message ? ["", "Tu mensaje:", p.lead.message] : []),
    "----------------------------------------",
    "",
    "Responde a este email o escríbenos:",
    [contactEmail, phone, wa ? `WhatsApp: https://wa.me/${wa}` : ""].filter(Boolean).join(" · "),
    "",
    `ROWE · ${tagline}${city ? ` · ${city}` : ""}`,
    "Recibes este email porque nos escribiste desde la web de ROWE.",
  ].join("\n");

  const logo = hosted ? null : await readFile(path.join(process.cwd(), "src/assets/brand/rowe-logo-email.png")).catch(() => null);
  return {
    to: [p.to],
    replyTo: p.from || undefined,
    subject: p.subject,
    html,
    text,
    attachments: logo ? [{ filename: "rowe.png", content: logo, cid: "rowe-logo", contentDisposition: "inline" }] : undefined,
  };
}
