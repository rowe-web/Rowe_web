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

/** Respuesta a un mensaje, escrita en el panel y enviada desde la cuenta de ROWE. */
export async function replyEmail(p: { to: string; subject: string; body: string; from: string }): Promise<Mail> {
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#EDEAE4;padding:24px 12px;font-family:Helvetica,Arial,sans-serif;color:#0A0A0A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #d9d5ce">
<tr><td style="padding:28px 32px 8px"><img src="cid:rowe-logo" alt="ROWE" height="22" style="display:block;height:22px"></td></tr>
<tr><td style="padding:18px 32px 30px;font:15px/1.65 Helvetica,Arial,sans-serif;white-space:pre-wrap">${esc(p.body)}</td></tr>
<tr><td style="padding:16px 32px 26px;border-top:1px solid #ebe7e0;font:10px/1.6 'Courier New',monospace;letter-spacing:.12em;text-transform:uppercase;color:#6B6862"><span style="color:#FF3B1F">●</span> ROWE · Web &amp; Audiovisual${p.from ? ` · ${esc(p.from)}` : ""}</td></tr>
</table></body></html>`;
  const logo = await readFile(path.join(process.cwd(), "src/assets/brand/rowe-logo-negro.png")).catch(() => null);
  return {
    to: [p.to],
    replyTo: p.from || undefined,
    subject: p.subject,
    html,
    text: p.body,
    attachments: logo ? [{ filename: "rowe.png", content: logo, cid: "rowe-logo" }] : undefined,
  };
}
