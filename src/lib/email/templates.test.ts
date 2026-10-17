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
    expect(mail.html).toContain(">ROWE</span>");
    expect(mail.html).toMatch(/<html lang="es"/);
    expect(mail.html).not.toMatch(/<script|<form|localhost/i);
    expect(mail.text.length).toBeGreaterThan(100);
    // Sin dominio https todavía: rótulo de texto, ni imagen adjunta ni enlace a localhost
    expect(mail.html).not.toMatch(/<img|cid:/);
    expect(mail.attachments).toBeUndefined();
  });

  it("escapa lo que escribe el cliente", async () => {
    const mail = await replyEmail({ ...base, lead: { ...base.lead, message: '<img src=x onerror="alert(1)">' } });
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).toContain("&lt;img src=x");
  });
});

describe("email de respuesta · datos reales, contraste y modo oscuro", () => {
  it("resumen «Tu solicitud»: rótulos y funciones elegidas casi negros y en semi-negrita", async () => {
    const { html } = await replyEmail(base);
    const summary = html.slice(html.indexOf("Tu solicitud") - 400);
    for (const label of ["Tu solicitud", "Servicio", "Presupuesto", "Nº de presupuesto", "Solicitud", "Lo que elegiste", "Tu mensaje"]) {
      const cell = summary.slice(0, summary.indexOf(label)).split("<td").pop()!;
      expect(cell, label).toContain("font:600 ");
      expect(cell, label).toContain("color:#222222");
    }
    for (const item of ["Web a medida", "8 reels/mes"]) {
      const chip = summary.slice(0, summary.indexOf(item)).split("<span").pop()!;
      expect(chip, item).toContain("font:600 ");
      expect(chip, item).toContain("color:#1a1a1a");
    }
  });

  it("nunca muestra datos de relleno ni enlaza a un número inventado", async () => {
    const mail = await replyEmail({ ...base, contact: { ...base.contact, phone: "[+34 600 000 000]", whatsapp: "[+34 600 000 000]", city: "[Ciudad, Provincia]" } });
    expect(mail.html).not.toMatch(/\[\+34|\[Ciudad|wa\.me|tel:/);
    expect(mail.text).not.toMatch(/\[\+34|\[Ciudad|wa\.me/);
    expect(mail.html).toContain("mailto:rowe.web.contacto@gmail.com");
  });

  it("texto oscuro sobre fondo claro, HTML limpio: solo estilos en línea, sin clases, CSS ni texto oculto", async () => {
    const mail = await replyEmail(base);
    expect(mail.html).toContain("color:#111111");
    expect(mail.html).not.toMatch(/ class=|<style|@media|display:none|opacity:0|mso-hide/);
    // Sin URLs externas: solo el email de contacto (y teléfono/WhatsApp cuando sean reales)
    expect(mail.html.match(/(?:https?:|mailto:|tel:|cid:)[^"]*/g)).toEqual(["mailto:rowe.web.contacto@gmail.com", "tel:+34600000000", "https://wa.me/34600000000"]);
  });
});
