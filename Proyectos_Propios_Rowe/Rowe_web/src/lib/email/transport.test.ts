import nodemailer from "nodemailer";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { smtpMessage } = await import("./transport");
const { replyEmail } = await import("./templates");

const ACCOUNT = "rowe.web.contacto@gmail.com";

/** El mensaje tal y como saldría por SMTP (sin enviarlo a ningún sitio). */
async function raw(mail: Parameters<typeof smtpMessage>[0]) {
  const t = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });
  const info = await t.sendMail(smtpMessage(mail, ACCOUNT));
  return (info.message as Buffer).toString("utf8");
}

const reply = () =>
  replyEmail({
    to: "cliente@example.com",
    from: ACCOUNT,
    subject: "Tu proyecto con ROWE",
    body: "Hola Lucía:\n\nGracias por escribirnos.",
    lead: { name: "Lucía", need: "Web", budget: "1.800 – 2.400 €", items: ["Web a medida"], quoteNumber: null, message: "", createdAt: "2026-10-16T08:36:03.190Z" },
    contact: { email: ACCOUNT, phone: "", whatsapp: "", city: "", tagline: "Web & Audiovisual" },
  });

describe("mensaje SMTP (lo que ven los filtros de spam)", () => {
  it("From = la cuenta autenticada, Reply-To coherente, Message-ID único, Date y prioridad normal", async () => {
    const msg = await raw(await reply());
    const head = msg.slice(0, msg.indexOf("\n\n"));
    expect(head).toMatch(/^From: ROWE <rowe\.web\.contacto@gmail\.com>$/m);
    expect(head).toMatch(/^Reply-To: rowe\.web\.contacto@gmail\.com$/m);
    expect(head).toMatch(/^Message-ID: <[0-9a-f-]{36}@gmail\.com>$/m);
    expect(head).toMatch(/^Date: \w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} \+0000$/m);
    expect(head).toMatch(/^X-Priority: 3 \(Normal\)$/m);
    expect(head).toMatch(/^Importance: Normal$/m);
    expect(head).toMatch(/^MIME-Version: 1\.0$/m);
    // Nada de cabeceras raras, remitente distinto ni firma de la librería de envío
    expect(head).not.toMatch(/X-Entity-Ref-ID|^Sender:|^X-Mailer:/im);
    expect(msg).not.toMatch(/nodemailer|NmP/i);
  });

  it("texto plano y HTML juntos (multipart/alternative, texto primero) y nada más: sin adjuntos ni imágenes", async () => {
    const msg = await raw(await reply());
    const types = [...msg.matchAll(/^Content-Type: ([\w/-]+)/gm)].map((m) => m[1]);
    expect(types).toEqual(["multipart/alternative", "text/plain", "text/html"]);
  });

  it("dos envíos nunca comparten Message-ID", async () => {
    const id = (m: string) => m.match(/^Message-ID: (.+)$/m)?.[1];
    const mail = await reply();
    expect(id(await raw(mail))).not.toBe(id(await raw(mail)));
  });

  it("sin versión de texto no sale", () => {
    expect(() => smtpMessage({ to: ["a@example.com"], subject: "x", html: "<p>x</p>", text: "  " }, ACCOUNT)).toThrow(/texto plano/);
  });
});
