"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { deleteLead, replyToLead, retryLeadEmail, saveLeadNotes, setLeadStatus } from "@/admin/actions/leads";
import { LEAD_STATUS, when } from "@/admin/format";
import { useFeedback } from "@/admin/ui/feedback";
import { AButton, Card, EmptyState, Field, PageTitle, Segmented, StatusDot, TextArea, TextInput } from "@/admin/ui/kit";
import { mono } from "@/admin/ui/styles";
import { whatsappHref } from "@/lib/content/settings";

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
  status: Status;
  notes: string;
  quote_id: string | null;
  source: { items?: string; path?: string; variant?: string; utm?: Record<string, string> } | null;
  quote: { number: string; items: { label: string }[] } | null;
  mail: { status: string; attempts: number; last_error: string | null; sent_at: string | null } | null;
  /** Respuestas enviadas desde el panel (más antigua primero). */
  replies: { id: number; created_at: string; sent_by_name: string; from_email: string; subject: string; body: string; status: "sent" | "failed"; error: string | null }[];
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
      <PageTitle title="Mensajes" subtitle="Solicitudes del formulario y del configurador de presupuesto." />
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

      <div className="grid items-start gap-4 min-[820px]:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
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
    <Card className="toast-in flex flex-col gap-[22px]">
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
          ["Recibido", when(lead.created_at)],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1.5 bg-surface p-3.5">
            <dt className={`${mono} text-[9px] text-muted`}>{k}</dt>
            <dd className="text-[14px]">{v}</dd>
          </div>
        ))}
      </dl>

      {items && (
        <div className="flex flex-col gap-2">
          <span className={`${mono} text-[9px] text-muted`}>Configuración elegida</span>
          <span className="font-mono text-[11px] leading-[1.8] tracking-[0.04em]">{items}</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className={`${mono} text-[9px] text-muted`}>Mensaje</span>
        <p className="max-w-[62ch] whitespace-pre-wrap text-[15px] leading-relaxed">{lead.message || "Sin mensaje. Esta solicitud llegó sin texto adicional."}</p>
      </div>

      <div className="flex flex-col border-t border-line-soft">
        <div className="flex items-center justify-between gap-3 border-b border-line-soft py-3">
          <a href={`mailto:${lead.email}`} className="truncate text-[14px]">{lead.email}</a>
          <button type="button" onClick={copy} className={`${mono} min-h-8 text-muted hover:text-bone`}>
            Copiar
          </button>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-line-soft py-3">
          <span className="text-[14px]">{lead.phone || "Sin teléfono"}</span>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className={`${mono} text-muted hover:text-bone`}>
              WhatsApp ↗
            </a>
          )}
        </div>
        {mailLabel && (
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
        )}
      </div>

      {lead.replies.length > 0 && <ReplyHistory replies={lead.replies} />}

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

/** Respuestas ya enviadas (o fallidas) desde el panel para este mensaje. */
function ReplyHistory({ replies }: { replies: LeadRow["replies"] }) {
  return (
    <div className="flex flex-col gap-2">
      <span className={`${mono} text-[9px] text-muted`}>Respuestas desde el panel · {replies.length}</span>
      <ol className="flex flex-col border-t border-line-soft">
        {replies.map((r) => (
          <li key={r.id} className="flex flex-col gap-1.5 border-b border-line-soft py-3">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <StatusDot tone={r.status === "sent" ? "half" : "alert"} label={`${r.status === "sent" ? "Enviada" : "No enviada"} · ${when(r.created_at)}`} />
              <span className="text-[12px] text-muted">
                {r.sent_by_name} · desde {r.from_email}
              </span>
            </span>
            <span className="text-[14px] font-medium">{r.subject}</span>
            <details className="text-[14px] text-muted">
              <summary className="cursor-pointer select-none">Ver texto</summary>
              <p className="mt-2 max-w-[62ch] whitespace-pre-wrap leading-relaxed text-bone">{r.body}</p>
            </details>
            {r.status === "failed" && r.error && <span className="text-[12px] text-rec">{r.error}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
