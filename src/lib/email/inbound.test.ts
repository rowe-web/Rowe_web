import { describe, expect, it } from "vitest";
import { matchInbound, normalizeMessageId, stripQuoted, threadIds } from "./inbound";

describe("respuestas de clientes · texto nuevo", () => {
  it("corta la cita de Gmail en español (también partida en dos líneas)", () => {
    const text = "¡Genial! El jueves a las 10 me va bien.\n\nLucía\n\nEl jue, 16 oct 2026,\nROWE <rowe.web.contacto@gmail.com> escribió:\n> Hola Lucía:\n> ¿Te viene bien el jueves?";
    expect(stripQuoted(text)).toBe("¡Genial! El jueves a las 10 me va bien.\n\nLucía");
    expect(stripQuoted("Perfecto, gracias.\n\nEl jue, 16 oct 2026 a las 10:12, ROWE <a@b.es> escribió:\n> hola")).toBe("Perfecto, gracias.");
  });

  it("corta la cita en inglés, Outlook y la firma del móvil", () => {
    expect(stripQuoted("Sounds good.\n\nOn Thu, Oct 16, 2026 at 10:12 AM ROWE <a@b.es> wrote:\n> hi")).toBe("Sounds good.");
    expect(stripQuoted("Vale.\n\n-----Mensaje original-----\nDe: ROWE")).toBe("Vale.");
    expect(stripQuoted("Ok\n\nEnviado desde mi iPhone")).toBe("Ok");
  });

  it("si todo es cita, devuelve el texto completo (nunca vacío)", () => {
    expect(stripQuoted("> solo cita")).toBe("> solo cita");
  });
});

describe("respuestas de clientes · a qué mensaje pertenecen", () => {
  const replies = [{ message_id: "<ABC@gmail.com>", lead_id: "lead-1" }];
  const leads = [
    { id: "lead-1", email: "lucia@clinica.es", created_at: "2026-10-01T00:00:00Z" },
    { id: "lead-2", email: "Lucia@Clinica.es", created_at: "2026-10-10T00:00:00Z" },
  ];

  it("normaliza Message-ID y lee In-Reply-To + References", () => {
    expect(normalizeMessageId(" abc@Gmail.com ")).toBe("<abc@gmail.com>");
    expect(threadIds("<x@y>", ["<a@b>", "<x@y>"])).toEqual(["<x@y>", "<a@b>"]);
    expect(threadIds(null, "<a@b> <c@d>")).toEqual(["<a@b>", "<c@d>"]);
  });

  it("primero por el hilo (contesta a una respuesta de ROWE), aunque escriba desde otra dirección", () => {
    expect(matchInbound({ from: "otra@gmail.com", threadIds: ["<abc@gmail.com>"] }, replies, leads)).toEqual({ leadId: "lead-1", by: "thread" });
  });

  it("si no, por el remitente: su mensaje más reciente", () => {
    expect(matchInbound({ from: "LUCIA@clinica.es", threadIds: [] }, replies, leads)).toEqual({ leadId: "lead-2", by: "sender" });
  });

  it("ignora los emails que no son de ningún cliente", () => {
    expect(matchInbound({ from: "publicidad@tienda.com", threadIds: ["<otro@x>"] }, replies, leads)).toBeNull();
  });
});
