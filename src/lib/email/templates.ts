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

// Paleta de la web (globals.css) en valores fijos: los clientes de correo no leen variables CSS
const INK = "#0A0A0A";
const PANEL = "#121212";
const BONE = "#EDEAE4";
const MUTED = "#8A8780";
const LINE = "#262524";
const REC = "#FF3B1F";
const SERIF = "Georgia,'Times New Roman',serif";
const MONO = "'Courier New',Courier,monospace";
const SANS = "Helvetica,Arial,sans-serif";

const LABEL = `font:10px/1.5 ${MONO};letter-spacing:.14em;text-transform:uppercase;color:${MUTED}`;

/**
 * Respuesta a un mensaje, escrita en el panel y enviada desde la cuenta de ROWE.
 * Mismo lenguaje que la web: fondo negro, logotipo blanco, titular en serif, rótulos
 * monoespaciados y el punto REC como único color. Incluye el resumen de lo que pidió.
 *
 * Pensada para llegar a la bandeja de entrada: HTML de tablas con estilos en línea (sin
 * scripts, formularios ni CSS externo), versión de texto equivalente, texto real (no una
 * imagen), pocos enlaces y todos a la propia marca, y una línea que explica por qué se
 * recibe. El logotipo va como imagen alojada en la web cuando hay dominio https; antes,
 * incrustado en el propio email (nunca un enlace a localhost).
 */
export async function replyEmail(p: { to: string; subject: string; body: string; from: string; lead: ReplyLeadSummary; contact: ReplyContact }): Promise<Mail> {
  const hosted = absoluteUrl("/").startsWith("https://");
  const logoSrc = hosted ? absoluteUrl("/brand/rowe-logo-blanco.png") : "cid:rowe-logo";
  const received = new Date(p.lead.createdAt).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric" });
  const preheader = p.body.replace(/\s+/g, " ").trim().slice(0, 110);
  const wa = p.contact.whatsapp.replace(/[^\d]/g, "");

  const rows: [string, string][] = [
    ["Servicio", p.lead.need],
    ["Presupuesto", p.lead.budget || "Sin indicar"],
    ...(p.lead.quoteNumber ? ([["Nº de presupuesto", p.lead.quoteNumber]] as [string, string][]) : []),
    ["Solicitud", `Recibida el ${received}`],
  ];

  const summary = `
<tr><td style="padding:34px 40px 0" class="px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:4px" bgcolor="${PANEL}">
    <tr><td style="padding:18px 22px 6px;${LABEL}"><span style="color:${REC}">&#9679;</span>&nbsp; Tu solicitud</td></tr>
    <tr><td style="padding:4px 22px 6px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${rows
  .map(
    ([k, v]) =>
      `        <tr><td style="padding:10px 0;border-top:1px solid ${LINE};${LABEL};width:140px;vertical-align:top">${esc(k)}</td><td style="padding:10px 0;border-top:1px solid ${LINE};font:15px/1.5 ${SANS};color:${BONE}">${esc(v)}</td></tr>`,
  )
  .join("\n")}
      </table>
    </td></tr>
${
  p.lead.items.length
    ? `    <tr><td style="padding:8px 22px 4px;${LABEL}">Lo que elegiste</td></tr>
    <tr><td style="padding:2px 22px 10px">${p.lead.items
        .map(
          (i) =>
            `<span style="display:inline-block;margin:0 6px 8px 0;padding:6px 11px;border:1px solid ${LINE};border-radius:999px;font:12px/1.3 ${MONO};letter-spacing:.04em;color:${BONE}">${esc(i)}</span>`,
        )
        .join("")}</td></tr>`
    : ""
}
${
  p.lead.message
    ? `    <tr><td style="padding:8px 22px 4px;${LABEL}">Tu mensaje</td></tr>
    <tr><td style="padding:2px 22px 20px"><div style="border-left:2px solid ${LINE};padding:2px 0 2px 14px;font:italic 15px/1.6 ${SERIF};color:${MUTED};white-space:pre-wrap">${esc(p.lead.message)}</div></td></tr>`
    : `    <tr><td style="padding:0 0 12px"></td></tr>`
}
  </table>
</td></tr>`;

  const contactBits = [
    p.contact.email ? `<a href="mailto:${esc(p.contact.email)}" style="color:${BONE};text-decoration:none">${esc(p.contact.email)}</a>` : "",
    p.contact.phone ? esc(p.contact.phone) : "",
    wa ? `<a href="https://wa.me/${wa}" style="color:${BONE};text-decoration:none">WhatsApp</a>` : "",
  ].filter(Boolean);

  const html = `<!doctype html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>${esc(p.subject)}</title>
<style>
  @media (max-width:620px){ .px{padding-left:22px!important;padding-right:22px!important} .h1{font-size:34px!important} }
</style>
</head>
<body style="margin:0;padding:0;background:${INK};color:${BONE}" bgcolor="${INK}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${INK}">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${INK}" style="background:${INK}">
<tr><td align="center" style="padding:28px 12px 36px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:${INK};border:1px solid ${LINE}" bgcolor="${INK}">

<tr><td style="padding:22px 40px;border-bottom:1px solid ${LINE}" class="px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle"><img src="${logoSrc}" alt="ROWE" width="97" height="24" style="display:block;width:97px;height:24px;border:0;outline:none"></td>
    <td align="right" style="vertical-align:middle;${LABEL}"><span style="color:${REC}">&#9679;</span>&nbsp; Rec &middot; ${esc(p.contact.tagline || "Web & Audiovisual")}</td>
  </tr></table>
</td></tr>

<tr><td style="padding:40px 40px 6px;${LABEL}" class="px">Para ${esc(p.lead.name)}</td></tr>
<tr><td style="padding:6px 40px 0;font:400 42px/1.05 ${SERIF};color:${BONE}" class="px h1">${esc(p.subject)}</td></tr>

<tr><td style="padding:28px 40px 0;font:16px/1.7 ${SANS};color:${BONE};white-space:pre-wrap" class="px">${esc(p.body)}</td></tr>
${summary}

<tr><td style="padding:34px 40px 30px" class="px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${LINE}"><tr>
    <td style="padding-top:18px;font:14px/1.7 ${SANS};color:${MUTED}">Responde a este email o escríbenos:<br>${contactBits.join(` <span style="color:${LINE}">&middot;</span> `)}</td>
  </tr></table>
</td></tr>

<tr><td style="padding:16px 40px 22px;border-top:1px solid ${LINE};${LABEL}" class="px">ROWE &middot; ${esc(p.contact.tagline || "Web & Audiovisual")}${p.contact.city ? ` &middot; ${esc(p.contact.city)}` : ""}</td></tr>
</table>
<p style="max-width:640px;margin:14px auto 0;font:11px/1.6 ${SANS};color:${MUTED};text-align:center">Recibes este email porque nos escribiste desde la web de ROWE.</p>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    p.body,
    "",
    "— Tu solicitud —",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(p.lead.items.length ? [`Lo que elegiste: ${p.lead.items.join(" · ")}`] : []),
    ...(p.lead.message ? ["", "Tu mensaje:", p.lead.message] : []),
    "",
    `ROWE · ${p.contact.tagline || "Web & Audiovisual"}`,
    [p.contact.email, p.contact.phone, wa ? `WhatsApp: https://wa.me/${wa}` : ""].filter(Boolean).join(" · "),
    "",
    "Recibes este email porque nos escribiste desde la web de ROWE.",
  ].join("\n");

  const logo = hosted ? null : await readFile(path.join(process.cwd(), "src/assets/brand/rowe-logo-blanco.png")).catch(() => null);
  return {
    to: [p.to],
    replyTo: p.from || undefined,
    subject: p.subject,
    html,
    text,
    attachments: logo ? [{ filename: "rowe.png", content: logo, cid: "rowe-logo", contentDisposition: "inline" }] : undefined,
  };
}
