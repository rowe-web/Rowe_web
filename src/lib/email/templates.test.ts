import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { replyEmail } = await import("./templates");

const base = {
  to: "cliente@example.com",
  from: "rowe.web.contacto@gmail.com",
  subject: "Tu proyecto con ROWE",
  body: "Hola Lucía:\n\nGracias por escribirnos.",
  lead: {
    name: "Lucía Martín",
    need: "Las dos cosas",
    budget: "1.800 – 2.400 €",
    items: ["Web a medida", "Reservas / citas", "8 reels/mes"],
    quoteNumber: "ROWE-2026-0001",
    message: "Queremos renovar la web.",
    createdAt: "2026-10-16T08:36:03.190Z",
  },
  contact: { email: "rowe.web.contacto@gmail.com", phone: "+34 600 000 000", whatsapp: "+34 600 000 000", city: "Madrid", tagline: "Web & Audiovisual" },
};

describe("email de respuesta al cliente", () => {
  it("resume la solicitud (servicio, presupuesto, funciones) en HTML y en texto", async () => {
    const mail = await replyEmail(base);
    for (const s of ["Las dos cosas", "1.800 – 2.400 €", "ROWE-2026-0001", "Web a medida", "Reservas / citas", "8 reels/mes", "Queremos renovar la web."]) {
      expect(mail.html).toContain(s);
      expect(mail.text).toContain(s);
    }
    expect(mail.text.startsWith(base.body)).toBe(true);
  });

  it("es un email limpio: logotipo, versión de texto, respuesta a la cuenta de ROWE y sin scripts ni localhost", async () => {
    const mail = await replyEmail(base);
    expect(mail.to).toEqual(["cliente@example.com"]);
    expect(mail.replyTo).toBe("rowe.web.contacto@gmail.com");
    expect(mail.html).toContain('alt="ROWE"');
    expect(mail.html).toMatch(/<html lang="es"/);
    expect(mail.html).not.toMatch(/<script|<form|localhost/i);
    expect(mail.text.length).toBeGreaterThan(100);
    // Sin dominio https todavía: el logotipo va incrustado (no un enlace a localhost)
    expect(mail.html).toContain("cid:rowe-logo");
    expect(mail.attachments?.[0]).toMatchObject({ cid: "rowe-logo", contentDisposition: "inline" });
  });

  it("escapa lo que escribe el cliente", async () => {
    const mail = await replyEmail({ ...base, lead: { ...base.lead, message: '<img src=x onerror="alert(1)">' } });
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).toContain("&lt;img src=x");
  });
});
