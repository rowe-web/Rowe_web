import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { confirmationEmail, newLeadEmail, replyEmail } = await import("./templates");
const { CONFIRMATION_EMAIL } = await import("@/content/seed-data");

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

describe("aviso de mensaje nuevo (al equipo)", () => {
  const lead = { leadId: "x", name: "Lucía", company: "Clínica Sol", email: "lucia@example.com", phone: "", need: "Audiovisual", sector: "Salud", budget: "Sin indicar", items: "", message: "", origin: "formulario" as const, quoteNumber: null, createdAt: "2026-10-16T08:36:03.190Z" };
  it("incluye la ubicación del cliente (o «—» si no la dio)", async () => {
    const mail = await newLeadEmail({ ...lead, city: "Valencia" }, ["equipo@example.com"]);
    const cell = (html: string) => html.slice(html.indexOf(">Ubicación</td>")).match(/<td[^>]*>([^<]*)<\/td>/)?.[1];
    expect(cell(mail.html)).toBe("Valencia");
    expect(mail.text).toContain("Valencia");
    const none = await newLeadEmail(lead, ["equipo@example.com"]);
    expect(cell(none.html)).toBe("—");
  });
});

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

  it("tampoco con el dato provisional a medias, vacío o solo con espacios", async () => {
    const mail = await replyEmail({ ...base, contact: { ...base.contact, phone: "  ", whatsapp: "", city: "Reus [por confirmar]" } });
    expect(mail.html).not.toMatch(/por confirmar|wa\.me|tel:/);
    expect(mail.text).not.toMatch(/por confirmar|wa\.me/);
  });

  it("texto oscuro sobre fondo claro, HTML limpio: solo estilos en línea, sin clases, CSS ni texto oculto", async () => {
    const mail = await replyEmail(base);
    expect(mail.html).toContain("color:#111111");
    expect(mail.html).not.toMatch(/ class=|<style|@media|display:none|opacity:0|mso-hide/);
    // Sin URLs externas: solo el email de contacto (y teléfono/WhatsApp cuando sean reales)
    expect(mail.html.match(/(?:https?:|mailto:|tel:|cid:)[^"]*/g)).toEqual(["mailto:rowe.web.contacto@gmail.com", "tel:+34600000000", "https://wa.me/34600000000"]);
  });
});

describe("email de confirmación al cliente", () => {
  const lead = {
    leadId: "3f2a9c1e-7b4d-4e8a-9f10-2b3c4d5e6f70",
    name: "Lucía Martín",
    email: "lucia@clinica.es",
    need: "Las dos cosas",
    sector: "Salud",
    budget: "1.800 – 2.400 € + 480 – 640 €/mes",
    items: ["Web a medida", "Reservas / citas", "8 reels/mes"],
    quoteNumber: "ROWE-2026-0007",
    message: "Queremos renovar la web <y> grabar al equipo.",
    createdAt: "2026-10-21T08:36:03.190Z",
  };
  const confirm = (over: Partial<Parameters<typeof confirmationEmail>[0]> = {}) =>
    confirmationEmail({ lead, texts: CONFIRMATION_EMAIL, contact: base.contact, from: "rowe.web.contacto@gmail.com", ...over });

  it("saluda por el nombre, dice que tenemos su solicitud y cuándo respondemos (HTML y texto)", async () => {
    const mail = await confirm();
    expect(mail.subject).toBe("Tenemos tu solicitud · ROWE");
    expect(mail.to).toEqual(["lucia@clinica.es"]);
    expect(mail.html).toContain("Hola Lucía, tenemos <em");
    expect(mail.text.split("\n")[0]).toBe("Hola Lucía, tenemos tu solicitud.");
    for (const body of [mail.html, mail.text]) expect(body).toContain("Te respondemos en menos de 24 h");
  });

  it("resume la solicitud: servicio, sector, presupuesto, nº de presupuesto, lo elegido y su mensaje", async () => {
    const mail = await confirm();
    for (const v of ["Las dos cosas", "Salud", "1.800 – 2.400 € + 480 – 640 €/mes", "ROWE-2026-0007", "Reservas / citas", "8 reels/mes"]) {
      expect(mail.html).toContain(v);
      expect(mail.text).toContain(v);
    }
    expect(mail.html).toContain("Queremos renovar la web &lt;y&gt; grabar al equipo.");
    expect(mail.text).toContain("Tu mensaje:\nQueremos renovar la web <y> grabar al equipo.");
  });

  it("mismas reglas que la respuesta: texto, Reply-To a ROWE, por qué lo recibe, aviso automático y Message-ID fijo", async () => {
    const mail = await confirm({ messageId: "<rowe-solicitud-x@gmail.com>" });
    expect(mail.text.trim().length).toBeGreaterThan(200);
    expect(mail.replyTo).toBe("rowe.web.contacto@gmail.com");
    expect(mail.headers).toEqual({ "Auto-Submitted": "auto-generated" });
    expect(mail.messageId).toBe("<rowe-solicitud-x@gmail.com>");
    for (const body of [mail.html, mail.text]) expect(body).toContain("Recibes este email porque has enviado una solicitud desde la web de ROWE.");
    expect(mail.html).not.toMatch(/<script|<style|class=|localhost|display:\s*none/i);
    // Pocos enlaces: email y teléfono / WhatsApp de contacto, nada más
    expect((mail.html.match(/<a /g) ?? []).length).toBeLessThanOrEqual(3);
  });

  it("nunca muestra datos provisionales ni vacíos", async () => {
    const mail = await confirm({ lead: { ...lead, sector: "", budget: "[por definir]" }, contact: { ...base.contact, phone: "[+34 600 000 000]", whatsapp: "", city: "[Ciudad, Provincia]" } });
    for (const body of [mail.html, mail.text]) {
      expect(body).not.toMatch(/\[[^\]]*\]|wa\.me|tel:|Sector/);
      expect(body).toContain("Presupuesto");
    }
    expect(mail.text).toContain("Presupuesto: Sin indicar");
  });

  it("botón «Reserva tu videollamada» solo con una agenda real (https)", async () => {
    expect((await confirm()).html).not.toContain("Reserva tu videollamada");
    expect((await confirm({ booking: { url: "http://agenda.example.com", label: "" } })).html).not.toContain("Reserva tu videollamada");
    const mail = await confirm({ booking: { url: "https://cal.example.com/rowe", label: "" } });
    expect(mail.html).toContain('href="https://cal.example.com/rowe"');
    expect(mail.html).toContain("Reserva tu videollamada");
    expect(mail.text).toContain("Reserva tu videollamada: https://cal.example.com/rowe");
  });

  it("si viene del configurador, adjunta el PDF y lo dice", async () => {
    const pdf = { filename: "Presupuesto_ROWE.pdf", content: Buffer.from("%PDF-1.4") };
    const mail = await confirm({ pdf });
    expect(mail.attachments).toEqual([{ filename: "Presupuesto_ROWE.pdf", content: pdf.content, contentDisposition: "attachment" }]);
    expect(mail.text).toContain("Te adjuntamos el PDF de tu presupuesto orientativo (ROWE-2026-0007).");
    expect((await confirm()).attachments).toBeUndefined();
  });
});
