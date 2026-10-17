"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { checkInbox, deleteLead, markInboundSeen, replyToLead, retryLeadEmail, saveLeadNotes, setLeadStatus } from "@/admin/actions/leads";
import { LEAD_STATUS, when } from "@/admin/format";
import { useFeedback } from "@/admin/ui/feedback";
import { AButton, Card, EmptyState, Field, PageTitle, Segmented, StatusDot, TextArea, TextInput } from "@/admin/ui/kit";
import { mono } from "@/admin/ui/styles";
import { whatsappHref } from "@/lib/content/settings";
import { stripQuoted } from "@/lib/email/inbound";
import { spamHints } from "@/lib/email/spam";
import { ArrowUpRight } from "@/components/ui/ArrowUpRight";

/** Fecha y hora exactas en que llegó el formulario (hora de Madrid). */
const sentAt = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

type Status = keyof typeof LEAD_STATUS;

export interface LeadRow {
  id: string;
  created_at: string;
  origin: "formulario" | "configurador";
  need: string;
  sector: string;
  budget_label: string;
  message: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  status: Status;
  notes: string;
  quote_id: string | null;
  source: { items?: string; path?: string; variant?: string; utm?: Record<string, string> } | null;
  quote: { number: string; items: { label: string }[] } | null;
  mail: { status: string; attempts: number; last_error: string | null; sent_at: string | null } | null;
  /** Respuestas enviadas desde el panel (más antigua primero). */
  replies: { id: number; created_at: string; sent_by_name: string; from_email: string; subject: string; body: string; status: "sent" | "failed"; error: string | null }[];
  /** Respuestas del cliente por email (más antigua primero). */
  inbound: { id: number; received_at: string; from_email: string; from_name: string; subject: string; body: string; full_text: string; attachments: number; matched_by: "thread" | "sender"; seen_at: string | null }[];
}

interface Props {
  leads: LeadRow[];
  needs: string[];
  isAdmin: boolean;
  /** Cuenta desde la que salen las respuestas ("" si el envío no está configurado). */
  mailFrom: string;
  initialLead: string | null;
  initialStatus: string;
  loadError: string | null;
}

/** Bandeja de mensajes (ROWE Admin · Mensajes). */
export function LeadsScreen({ leads: initial, needs, isAdmin, mailFrom, initialLead, initialStatus, loadError }: Props) {
  const [leads, setLeads] = useState(initial);
  const [statusF, setStatusF] = useState<"todos" | Status>(initialStatus in LEAD_STATUS ? (initialStatus as Status) : "todos");
  const [serviceF, setServiceF] = useState("Todos");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(initialLead ?? null);

  // Los datos del servidor mandan (p. ej. tras refrescar)
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setLeads(initial);
  }
  // Un enlace a otro mensaje estando ya en Mensajes (p. ej. un aviso en tiempo real) lo abre
  const [prevLead, setPrevLead] = useState(initialLead);
  if (initialLead !== prevLead) {
    setPrevLead(initialLead);
    if (initialLead) setSelected(initialLead);
  }

  // La URL refleja el mensaje abierto (se puede compartir o volver con «atrás»)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selected) url.searchParams.set("lead", selected);
    else url.searchParams.delete("lead");
    window.history.replaceState(window.history.state, "", url);
  }, [selected]);

  const counts = useMemo(() => {
    const c = { todos: leads.length, nuevo: 0, contactado: 0, cerrado: 0 };
    leads.forEach((l) => c[l.status]++);
    return c;
  }, [leads]);

  const filtered = leads.filter(
    (l) =>
      (statusF === "todos" || l.status === statusF) &&
      (serviceF === "Todos" || l.need === serviceF) &&
      (!q || `${l.name} ${l.company} ${l.email}`.toLowerCase().includes(q.toLowerCase())),
  );
  const lead = leads.find((l) => l.id === selected) ?? null;
  const patch = (id: string, p: Partial<LeadRow>) => setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)));

  return (
    <div className="toast-in flex max-w-[1240px] flex-col gap-5">
      <PageTitle title="Mensajes" subtitle="Solicitudes del formulario y del configurador, y las respuestas de los clientes por email." actions={mailFrom ? <CheckMailButton /> : undefined} />
      {loadError && <p role="alert" className="rounded-lg border border-rec px-4 py-3 text-[14px] text-rec">{loadError}</p>}

      <div className="flex flex-wrap items-center gap-2.5">
        <Segmented
          label="Estado"
          value={statusF}
          onChange={setStatusF}
          options={[
            { value: "todos", label: "Todos", count: counts.todos },
            { value: "nuevo", label: "Nuevos", count: counts.nuevo },
            { value: "contactado", label: "Contactados", count: counts.contactado },
            { value: "cerrado", label: "Cerrados", count: counts.cerrado },
          ]}
        />
        <Segmented label="Servicio" value={serviceF} onChange={setServiceF} options={["Todos", ...needs].map((n) => ({ value: n, label: n }))} />
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o negocio" aria-label="Buscar mensajes" className="!h-[42px] min-w-[200px] flex-1 !rounded-full !px-[18px] !text-[14px]" />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 min-[820px]:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Card padded={false} className={selected ? "max-[819px]:hidden" : ""}>
          {filtered.length === 0 ? (
            <EmptyState
              kicker="0 resultados"
              title={
                <>
                  Nada por <em>aquí.</em>
                </>
              }
              body={leads.length ? "No hay solicitudes con estos filtros." : "Cuando alguien rellene el formulario o envíe su presupuesto, aparecerá en esta bandeja."}
              action={
                leads.length ? (
                  <AButton size="sm" onClick={() => (setStatusF("todos"), setServiceF("Todos"), setQ(""))}>
                    Quitar filtros
                  </AButton>
                ) : undefined
              }
            />
          ) : (
            <ul>
              {filtered.map((l) => {
                const st = LEAD_STATUS[l.status];
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(l.id)}
                      aria-current={l.id === selected || undefined}
                      className={`flex w-full items-start gap-3.5 border-b border-line-faint px-[18px] py-4 text-left transition-colors hover:bg-[#181818] ${l.id === selected ? "min-[820px]:bg-surface-2" : ""}`}
                    >
                      <span className={`mt-[7px] h-[7px] w-[7px] flex-none rounded-full border ${st.tone === "on" ? "border-bone bg-bone" : st.tone === "half" ? "border-muted" : "border-ghost bg-ghost"}`} aria-label={st.label} />
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex justify-between gap-2.5">
                          <span className={`text-[15px] ${l.status === "nuevo" ? "font-medium" : ""}`}>{l.name}</span>
                          <span className="whitespace-nowrap font-mono text-[10px] text-muted">{when(l.created_at)}</span>
                        </span>
                        <span className="text-[13px] text-muted">
                          {l.company || "—"} · {l.sector || "Sin sector"}
                        </span>
                        <span className="truncate font-mono text-[10px] tracking-[0.06em] text-muted">
                          {l.need} · {l.budget_label || "Sin presupuesto"}
                        </span>
                        {l.inbound.some((r) => !r.seen_at) && (
                          <span data-unseen-reply className="mt-0.5 flex w-fit items-center gap-1.5 rounded-full border border-rec px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-bone">
                            <span className="h-[6px] w-[6px] animate-rec rounded-full bg-rec" aria-hidden="true" />
                            Respuesta nueva por email
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {lead ? (
          <LeadDetail key={lead.id} lead={lead} isAdmin={isAdmin} mailFrom={mailFrom} onBack={() => setSelected(null)} onPatch={(p) => patch(lead.id, p)} onDeleted={() => (setLeads((ls) => ls.filter((l) => l.id !== lead.id)), setSelected(null))} />
        ) : (
          <Card className="hidden min-h-[240px] items-center justify-center text-[14px] text-muted min-[820px]:flex">Elige un mensaje para verlo.</Card>
        )}
      </div>
    </div>
  );
}

function LeadDetail({
  lead,
  isAdmin,
  mailFrom,
  onBack,
  onPatch,
  onDeleted,
}: {
  lead: LeadRow;
  isAdmin: boolean;
  mailFrom: string;
  onBack: () => void;
  onPatch: (p: Partial<LeadRow>) => void;
  onDeleted: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const { toast, confirm } = useFeedback();
  const [notes, setNotes] = useState(lead.notes);
  const [notesState, setNotesState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [busy, start] = useTransition();
  const timer = useRef(0);
  const items = lead.quote?.items?.map((i) => i.label).join(" · ") || lead.source?.items || "";
  const wa = whatsappHref(lead.phone);

  // Notas: guardado automático 0,8 s después de dejar de escribir (y reintento si falla)
  const saveNotes = (value: string) => {
    window.clearTimeout(timer.current);
    setNotesState("saving");
    timer.current = window.setTimeout(async () => {
      const res = await saveLeadNotes(lead.id, value);
      setNotesState(res.ok ? "saved" : "error");
      if (res.ok) onPatch({ notes: value });
    }, 800);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Respuestas del cliente: las que no se habían visto al abrir el mensaje, y las que llegan
  // con él abierto, se señalan como «Nueva» mientras sigue abierto y se marcan como vistas.
  const [known] = useState(() => ({ ids: new Set(lead.inbound.map((r) => r.id)), unseen: new Set(lead.inbound.filter((r) => !r.seen_at).map((r) => r.id)) }));
  const unseen = new Set(lead.inbound.filter((r) => known.unseen.has(r.id) || !known.ids.has(r.id)).map((r) => r.id));
  const pendingSeen = lead.inbound.some((r) => !r.seen_at);
  useEffect(() => {
    if (!pendingSeen) return;
    markInboundSeen(lead.id).then((res) => res.ok && onPatch({ inbound: lead.inbound.map((r) => (r.seen_at ? r : { ...r, seen_at: new Date().toISOString() })) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cada vez que llega una sin ver
  }, [pendingSeen, lead.inbound.length]);

  const changeStatus = (s: Status) =>
    start(async () => {
      const prev = lead.status;
      onPatch({ status: s }); // optimista
      const res = await setLeadStatus(lead.id, s);
      if (res.ok) toast(`Marcado como ${LEAD_STATUS[s].label.toLowerCase()}`);
      else {
        onPatch({ status: prev });
        toast(res.error, "error");
      }
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lead.email);
      toast("Email copiado");
    } catch {
      toast("No se ha podido copiar", "error");
    }
  };

  const remove = async () => {
    const ok = await confirm({ title: "¿Eliminar este mensaje?", body: "Se borrará de la bandeja para siempre. Esta acción no se puede deshacer.", cta: "Eliminar", danger: true });
    if (!ok) return;
    start(async () => {
      const res = await deleteLead(lead.id);
      if (res.ok) {
        toast("Mensaje eliminado");
        onDeleted();
      } else toast(res.error, "error");
    });
  };

  const retry = () =>
    start(async () => {
      const res = await retryLeadEmail(lead.id);
      toast(res.ok ? "Aviso enviado" : res.error, res.ok ? "ok" : "error");
    });

  const mailLabel = !lead.mail
    ? null
    : lead.mail.status === "sent"
      ? { tone: "half" as const, text: `Aviso por email enviado · ${when(lead.mail.sent_at)}` }
      : { tone: "alert" as const, text: lead.mail.status === "pending" ? "Aviso por email pendiente" : `Aviso por email no enviado (${lead.mail.attempts} intento${lead.mail.attempts === 1 ? "" : "s"})` };

  return (
    <Card className="toast-in flex min-w-0 flex-col gap-[22px]">
      <button type="button" onClick={onBack} className="min-h-9 self-start text-[14px] text-muted min-[820px]:hidden">
        ← Mensajes
      </button>
      <div className="flex flex-wrap items-start justify-between gap-3.5">
        <div className="flex flex-col gap-1.5">
          <h2 className="headline-serif text-[34px] leading-none">{lead.name}</h2>
          <span className="text-[14px] text-muted">
            {lead.company || "Sin empresa"} · {lead.sector || "Sin sector"}
          </span>
        </div>
        <Segmented label="Estado del mensaje" size="sm" value={lead.status} onChange={changeStatus} options={(Object.keys(LEAD_STATUS) as Status[]).map((s) => ({ value: s, label: LEAD_STATUS[s].label }))} />
      </div>

      <dl className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-px border border-line-soft bg-line-soft">
        {[
          ["Servicio", lead.need],
          ["Presupuesto", lead.budget_label || "Sin indicar"],
          ["Origen", lead.origin === "configurador" ? `Configurador${lead.quote ? ` · ${lead.quote.number}` : ""}` : "Formulario"],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1.5 bg-surface p-3.5">
            <dt className={`${mono} text-[9px] text-muted`}>{k}</dt>
            <dd className="text-[14px]">{v}</dd>
          </div>
        ))}
      </dl>

      {/* Contacto arriba del todo: siempre a mano aunque la conversación sea larga */}
      <div data-lead-contact className="grid gap-px overflow-hidden rounded-md border border-line-soft bg-line-soft min-[1100px]:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 flex-col gap-1.5 bg-surface p-3.5">
          <span className={`${mono} text-[9px] text-muted`}>Email</span>
          <span className="flex min-w-0 items-center justify-between gap-3">
            <a href={`mailto:${lead.email}`} className="truncate text-[14px] underline-offset-4 hover:underline">
              {lead.email}
            </a>
            <button type="button" onClick={copy} className={`${mono} min-h-8 flex-none text-muted hover:text-bone`}>
              Copiar
            </button>
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5 bg-surface p-3.5">
          <span className={`${mono} text-[9px] text-muted`}>Teléfono</span>
          {/* El número completo abre WhatsApp; el icono discreto llama */}
          <span className="flex min-w-0 items-center gap-3">
            {lead.phone && wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" data-lead-phone title="Abrir en WhatsApp" className="flex min-h-8 items-center gap-1.5 whitespace-nowrap text-[14px] tabular-nums underline-offset-4 hover:underline">
                {lead.phone}
                <ArrowUpRight className="h-3 w-3 flex-none text-muted" strokeWidth={2} />
              </a>
            ) : (
              <span className="text-[14px] text-muted">{lead.phone || "Sin teléfono"}</span>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`} aria-label={`Llamar al ${lead.phone}`} title="Llamar" className="ml-auto flex h-8 w-8 flex-none items-center justify-center rounded-full border border-line text-muted hover:border-bone hover:text-bone">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
                  <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" strokeLinejoin="round" />
                </svg>
              </a>
            )}
          </span>
        </div>
        {/* Dónde está: clave para valorar la logística de un rodaje */}
        <div data-lead-city className="flex min-w-0 flex-col gap-1.5 bg-surface p-3.5">
          <span className={`${mono} text-[9px] text-muted`}>Ubicación</span>
          {lead.city ? (
            <span className="flex min-w-0 items-center gap-1.5 text-[14px]">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-none text-muted" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
                <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2.2" />
              </svg>
              <span className="min-w-0 [overflow-wrap:anywhere]">{lead.city}</span>
            </span>
          ) : (
            <span className="text-[14px] text-muted">Sin indicar</span>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5 bg-surface p-3.5">
          <span className={`${mono} text-[9px] text-muted`}>Enviado</span>
          <span className="text-[14px]">{sentAt(lead.created_at)}</span>
        </div>
      </div>

      {items && (
        <div className="flex flex-col gap-2">
          <span className={`${mono} text-[9px] text-muted`}>Configuración elegida</span>
          <span className="font-mono text-[11px] leading-[1.8] tracking-[0.04em]">{items}</span>
        </div>
      )}

      <Conversation lead={lead} unseen={unseen} />

      {mailLabel && (
        <div className="flex flex-col border-t border-line-soft">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft py-3">
            <span className="flex flex-col gap-1">
              <StatusDot tone={mailLabel.tone} label={mailLabel.text} />
              {lead.mail?.status !== "sent" && lead.mail?.last_error && <span className="text-[12px] text-muted">{lead.mail.last_error}</span>}
            </span>
            {lead.mail?.status !== "sent" && (
              <AButton size="sm" onClick={retry} loading={busy}>
                Reintentar envío
              </AButton>
            )}
          </div>
        </div>
      )}

      {replying && <ReplyBox lead={lead} from={mailFrom} onClose={() => setReplying(false)} onSent={() => lead.status === "nuevo" && onPatch({ status: "contactado" })} />}

      <div className="flex flex-wrap gap-2.5">
        {/* Con el envío configurado, la respuesta sale de la cuenta de ROWE; si no, del correo propio */}
        {!replying &&
          (mailFrom ? (
            <AButton variant="primary" onClick={() => setReplying(true)} className="!h-[42px] !px-5">
              Responder
            </AButton>
          ) : (
            <a href={`mailto:${lead.email}?subject=${encodeURIComponent("Tu proyecto con ROWE")}`} className="flex h-[42px] items-center rounded-full bg-bone px-5 text-[14px] font-medium text-ink hover:bg-white">
              Responder por email
            </a>
          ))}
        {lead.status !== "contactado" && (
          <AButton onClick={() => changeStatus("contactado")} disabled={busy}>
            Marcar como contactado
          </AButton>
        )}
        {isAdmin && (
          <AButton variant="ghost" onClick={remove} disabled={busy} className="hover:!text-rec">
            Eliminar
          </AButton>
        )}
      </div>

      <label className="flex flex-col gap-2">
        <span className={`flex justify-between ${mono} text-[9px] text-muted`}>
          <span>Notas internas · solo las ve el equipo</span>
          <span className={notesState === "error" ? "text-rec" : ""}>
            {notesState === "saving" ? "Guardando…" : notesState === "saved" ? "Guardado ✓" : notesState === "error" ? "No se pudo guardar" : ""}
          </span>
        </span>
        <TextArea
          rows={3}
          value={notes}
          maxLength={5000}
          placeholder="Ej. Llamar el lunes por la mañana."
          onChange={(e) => {
            setNotes(e.target.value);
            saveNotes(e.target.value);
          }}
        />
        {notesState === "error" && (
          <button type="button" onClick={() => saveNotes(notes)} className="self-start text-[13px] text-rec underline">
            Reintentar
          </button>
        )}
      </label>
    </Card>
  );
}

const DEFAULT_SUBJECT = "Tu proyecto con ROWE";
const draftKey = (id: string) => `rowe:reply:${id}`;

/**
 * Respuesta desde el panel: sale de la cuenta de ROWE (`from`), no del correo de quien
 * la escribe. El borrador se guarda en este navegador mientras se escribe, así que cerrar
 * la pestaña o un fallo de envío no pierde el texto; se borra al enviarse.
 */
function ReplyBox({ lead, from, onClose, onSent }: { lead: LeadRow; from: string; onClose: () => void; onSent: () => void }) {
  const { toast } = useFeedback();
  const [busy, start] = useTransition();
  const first = lead.name.trim().split(/\s+/)[0] ?? "";
  const [draft, setDraft] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey(lead.id)) ?? "null") as { subject: string; body: string } | null;
      if (saved?.body) return saved;
    } catch {
      /* sin almacenamiento: se empieza de cero */
    }
    return { subject: DEFAULT_SUBJECT, body: `Hola${first ? ` ${first}` : ""}:\n\n\n\nUn saludo,\nEl equipo de ROWE` };
  });

  const hints = spamHints(draft.subject, draft.body);
  const update = (patch: Partial<typeof draft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    try {
      localStorage.setItem(draftKey(lead.id), JSON.stringify(next));
    } catch {
      /* no crítico */
    }
  };
  const discard = () => {
    try {
      localStorage.removeItem(draftKey(lead.id));
    } catch {
      /* no crítico */
    }
    onClose();
  };

  const send = () =>
    start(async () => {
      const res = await replyToLead(lead.id, draft.subject, draft.body);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast(`Respuesta enviada a ${lead.email}`);
      onSent();
      discard();
    });

  return (
    <div data-reply-box className="flex flex-col gap-4 rounded-md border border-line p-4">
      <div className={`flex flex-col gap-1 ${mono} text-[10px] text-muted`}>
        <span>
          De · <span className="text-bone">{from}</span>
        </span>
        <span>
          Para · <span className="text-bone">{lead.email}</span>
        </span>
      </div>
      <Field label="Asunto" count={draft.subject.length} max={200}>
        <TextInput value={draft.subject} maxLength={200} onChange={(e) => update({ subject: e.target.value })} />
      </Field>
      <Field label="Respuesta" count={draft.body.length} max={10000}>
        <TextArea rows={9} value={draft.body} maxLength={10000} onChange={(e) => update({ body: e.target.value })} />
      </Field>
      {/* Lo que suele mandar un email a spam: se avisa mientras se escribe (se puede enviar igual) */}
      {hints.length > 0 && (
        <ul data-spam-hints className="flex flex-col gap-1.5 rounded border border-line-soft bg-surface-3 px-3.5 py-3">
          <li className={`${mono} text-[9px] text-muted`}>Para que no acabe en spam</li>
          {hints.map((h) => (
            <li key={h} className="text-[13px] leading-snug text-bone">
              · {h}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2.5">
        <AButton variant="primary" onClick={send} loading={busy} disabled={!draft.subject.trim() || !draft.body.trim()}>
          Enviar respuesta
        </AButton>
        <AButton variant="ghost" onClick={discard} disabled={busy}>
          Descartar
        </AButton>
        <span className="ml-auto text-[12px] text-muted">El borrador se guarda mientras escribes.</span>
      </div>
    </div>
  );
}

type ThreadItem =
  | { kind: "form"; at: string }
  | { kind: "rowe"; at: string; reply: LeadRow["replies"][number] }
  | { kind: "client"; at: string; msg: LeadRow["inbound"][number] };

/** Etiqueta de cada tipo de mensaje (la leyenda usa las mismas marcas que los bloques). */
const KIND = {
  form: { label: "Formulario de la web", mark: <span aria-hidden="true" className="h-[9px] w-[9px] rounded-[2px] border border-dashed border-bone" /> },
  rowe: { label: "Respuesta de ROWE", mark: <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-rec" /> },
  client: { label: "Respuesta del cliente", mark: <span aria-hidden="true" className="text-[11px] leading-none">✉</span> },
} as const;

/**
 * Conversación de un mensaje, en orden cronológico, con tres tipos de bloque que no se
 * pueden confundir:
 *  a) Formulario inicial: ancho completo, borde discontinuo, sin fondo.
 *  b) Respuesta de ROWE: a la derecha, fondo gris, filete claro y cabecera con el punto REC.
 *  c) Respuesta del cliente por email: a la izquierda, fondo cálido, filete y cabecera con ✉.
 */
function Conversation({ lead, unseen }: { lead: LeadRow; unseen: Set<number> }) {
  const items: ThreadItem[] = [
    { kind: "form" as const, at: lead.created_at },
    ...lead.replies.map((reply) => ({ kind: "rowe" as const, at: reply.created_at, reply })),
    ...lead.inbound.map((msg) => ({ kind: "client" as const, at: msg.received_at, msg })),
  ].sort((a, b) => (a.kind === "form" ? -1 : b.kind === "form" ? 1 : a.at.localeCompare(b.at)));

  return (
    <section aria-label="Conversación" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`${mono} text-[9px] text-muted`}>Conversación · {items.length}</span>
        <span className="flex flex-wrap gap-3">
          {(Object.keys(KIND) as (keyof typeof KIND)[]).map((k) => (
            <span key={k} className={`flex items-center gap-1.5 ${mono} text-[9px] text-muted`}>
              {KIND[k].mark}
              {KIND[k].label}
            </span>
          ))}
        </span>
      </div>
      <ol className="flex min-w-0 flex-col gap-3">
        {items.map((it) =>
          it.kind === "form" ? (
            <li key="form" data-thread="form" className="flex min-w-0 max-w-full flex-col gap-2.5 rounded-md border border-dashed border-line-strong px-4 py-3.5 [overflow-wrap:anywhere]">
              <ThreadHeader mark={KIND.form.mark} title={lead.origin === "configurador" ? `Configurador de presupuesto${lead.quote ? ` · ${lead.quote.number}` : ""}` : KIND.form.label} meta={when(lead.created_at)} />
              <Fold>
                <p className="max-w-[62ch] whitespace-pre-wrap text-[14px] leading-relaxed text-bone">{lead.message || "Sin mensaje. Esta solicitud llegó sin texto adicional."}</p>
              </Fold>
            </li>
          ) : it.kind === "rowe" ? (
            <RoweReply key={`r${it.reply.id}`} reply={it.reply} />
          ) : (
            <ClientReply key={`c${it.msg.id}`} msg={it.msg} isNew={unseen.has(it.msg.id)} />
          ),
        )}
      </ol>
    </section>
  );
}

function ThreadHeader({ mark, title, meta }: { mark: ReactNode; title: string; meta: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className={`flex items-center gap-2 ${mono} text-[10px] text-bone`}>
        {mark}
        {title}
      </span>
      <span className="font-mono text-[10px] text-muted">{meta}</span>
    </div>
  );
}

/** Texto de un mensaje del hilo: replegado por defecto tras «Ver texto» (los tres tipos igual). */
function Fold({ children }: { children: ReactNode }) {
  return (
    <details data-fold className="group/fold min-w-0 max-w-full">
      <summary className={`flex min-h-8 w-fit cursor-pointer select-none list-none items-center gap-2 rounded-full border border-line px-3 ${mono} text-[10px] text-muted transition-colors hover:border-bone hover:text-bone [&::-webkit-details-marker]:hidden`}>
        <span className="group-open/fold:hidden">Ver texto</span>
        <span className="hidden group-open/fold:inline">Ocultar texto</span>
        <span aria-hidden="true" className="transition-transform group-open/fold:rotate-180">↓</span>
      </summary>
      {/* Textos largos o sin espacios (enlaces, cadenas pegadas) parten la línea dentro de la caja: nunca empujan la pantalla */}
      <div className="mt-3 min-w-0 max-w-full overflow-hidden break-words rounded border border-line-soft bg-surface px-4 py-3.5 [overflow-wrap:anywhere]">{children}</div>
    </details>
  );
}

/** b) Lo que respondió ROWE desde el panel. */
function RoweReply({ reply: r }: { reply: LeadRow["replies"][number] }) {
  const sent = r.status === "sent";
  return (
    <li data-thread="rowe" data-reply className={`ml-auto w-full min-w-0 max-w-full overflow-hidden [overflow-wrap:anywhere] rounded-md border border-l-2 border-line-soft bg-surface-2 min-[1100px]:w-[90%] ${sent ? "border-l-bone" : "border-l-rec"}`}>
      <div className="border-b border-line-soft bg-surface-3 px-3.5 py-2.5">
        <ThreadHeader mark={KIND.rowe.mark} title={KIND.rowe.label} meta={<StatusDot tone={sent ? "half" : "alert"} label={`${sent ? "Enviada" : "No enviada"} · ${when(r.created_at)}`} />} />
      </div>
      <div className="flex flex-col gap-2 px-3.5 py-3">
        <span className="text-[12px] text-muted">
          {r.sent_by_name} · desde {r.from_email}
        </span>
        <span className="text-[15px] font-medium">{r.subject}</span>
        <Fold>
          <p className="max-w-[62ch] whitespace-pre-wrap text-[14px] leading-relaxed text-bone">{r.body}</p>
        </Fold>
        {!sent && r.error && <span className="text-[12px] text-rec">{r.error}</span>}
      </div>
    </li>
  );
}

/** c) Lo que contestó el cliente por email (leído del buzón de ROWE). */
function ClientReply({ msg: m, isNew }: { msg: LeadRow["inbound"][number]; isNew: boolean }) {
  // Solo el mensaje nuevo (sin la cita del email anterior ni la firma). Se recalcula aquí para que
  // las respuestas guardadas antes de mejorar la limpieza también se vean limpias.
  const text = stripQuoted(m.full_text || m.body, { sender: m.from_name });
  const quoted = m.full_text.trim() !== text.trim();
  return (
    <li data-thread="client" className="mr-auto w-full min-w-0 max-w-full overflow-hidden [overflow-wrap:anywhere] rounded-md border border-l-2 border-line-strong border-l-muted bg-ph-2 min-[1100px]:w-[90%]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft bg-ph px-3.5 py-2.5">
        <span className={`flex items-center gap-2 ${mono} text-[10px] text-bone`}>
          {KIND.client.mark}
          {KIND.client.label} · email
          {isNew && <span data-new-badge className="inline-flex items-center rounded-full bg-rec px-2 py-[3px] text-[9px] font-bold uppercase leading-none tracking-wider text-[#ffffff]">Nueva</span>}
        </span>
        <span className="font-mono text-[10px] text-muted">{when(m.received_at)}</span>
      </div>
      <div className="flex flex-col gap-2 px-3.5 py-3">
        <span className="text-[12px] text-muted">
          {m.from_name ? `${m.from_name} · ` : ""}
          {m.from_email}
          {m.matched_by === "sender" && " · asociada por remitente"}
        </span>
        {m.subject && <span className="text-[15px] font-medium">{m.subject}</span>}
        {m.attachments > 0 && <span className="text-[12px] text-muted">📎 {m.attachments === 1 ? "1 adjunto" : `${m.attachments} adjuntos`} · ábrelos en Gmail</span>}
        <Fold>
          <p data-client-text className="max-w-[62ch] whitespace-pre-wrap text-[14px] leading-relaxed text-bone">{text}</p>
          {quoted && (
            <details data-full-email className="group/full mt-4 border-t border-line-soft pt-3">
              <summary className={`flex min-h-8 w-fit cursor-pointer select-none list-none items-center gap-1.5 ${mono} text-[9px] text-muted transition-colors hover:text-bone [&::-webkit-details-marker]:hidden`}>
                <span className="group-open/full:hidden">Ver email completo</span>
                <span className="hidden group-open/full:inline">Ocultar email completo</span>
                <span aria-hidden="true" className="transition-transform group-open/full:rotate-180">↓</span>
              </summary>
              <p className="mt-2 max-w-[62ch] whitespace-pre-wrap border-l border-line pl-3 text-[13px] leading-relaxed text-muted">{m.full_text}</p>
            </details>
          )}
        </Fold>
      </div>
    </li>
  );
}

/** Lee ya el buzón de ROWE (el panel también lo hace solo cada minuto). */
function CheckMailButton() {
  const { toast } = useFeedback();
  const [busy, start] = useTransition();
  const run = () =>
    start(async () => {
      const res = await checkInbox();
      if (!res.ok) return toast(res.error, "error");
      const n = res.data?.imported ?? 0;
      toast(n ? `${n === 1 ? "1 respuesta nueva" : `${n} respuestas nuevas`} por email` : "Correo al día · sin respuestas nuevas");
    });
  return (
    <AButton size="sm" onClick={run} loading={busy}>
      Comprobar correo
    </AButton>
  );
}
