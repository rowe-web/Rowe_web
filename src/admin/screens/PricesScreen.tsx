"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { savePricing, type PricingInput } from "@/admin/actions/prices";
import { publishSite } from "@/admin/actions/publish";
import { clearBackup, readBackup, useUndoable } from "@/admin/editor";
import { useFeedback } from "@/admin/ui/feedback";
import { AButton, Card, Field, PageTitle, Segmented, Switch, TextArea, TextInput } from "@/admin/ui/kit";
import { mono } from "@/admin/ui/styles";
import { computeQuote, isAvailable, normalizeSelection, type Config, type EngineSettings, type Selection } from "@/features/configurator/engine";
import { range } from "@/features/configurator/format";
import type { ConfigOption, ConfigSection } from "@/lib/content/types";

export type SectionRow = ConfigSection & { id?: string; visible: boolean };
export type OptionRow = ConfigOption & { id?: string; visible: boolean };
type State = PricingInput;

const KEY = "prices";
const byPos = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

function uniqueKey(base: string, taken: Set<string>) {
  const clean =
    base
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^[^a-z]+|_+$/g, "")
      .slice(0, 30) || "opcion";
  let k = clean;
  for (let i = 2; taken.has(k); i++) k = `${clean}_${i}`;
  return k;
}

function unitOf(o: OptionRow) {
  if (o.price_mode === "percent_once") return "%";
  if (o.unit_label) return o.unit_label;
  if (o.control === "stepper") return o.price_mode === "monthly" ? "c/u /mes" : "c/u";
  return o.price_mode === "monthly" ? "/mes" : "único";
}

/** Precios del configurador (solo administradores). */
export function PricesScreen({ sections, options, engine }: { sections: SectionRow[]; options: OptionRow[]; engine: EngineSettings }) {
  const initial: State = { sections: [...sections].sort(byPos), options: [...options].sort(byPos), deletedSections: [], deletedOptions: [] };
  const ed = useUndoable<State>(initial, KEY);
  const st = ed.state;
  const { toast, confirm } = useFeedback();
  const [busy, start] = useTransition();
  const [open, setOpen] = useState<string | null>(null); // clave de la opción con detalles abiertos
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [backup, setBackup] = useState<State | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- comprobar una copia local al abrir
    setBackup(readBackup(KEY, initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setOption = (key: string, patch: Partial<OptionRow>) => ed.set((s) => ({ ...s, options: s.options.map((o) => (o.key === key ? { ...o, ...patch } : o)) }));
  const setSection = (key: string, patch: Partial<SectionRow>) =>
    ed.set((s) => ({
      ...s,
      sections: s.sections.map((x) => (x.key === key ? { ...x, ...patch } : x)),
    }));

  const moveSection = (key: string, d: number) =>
    ed.set((s) => {
      const list = [...s.sections].sort(byPos);
      const i = list.findIndex((x) => x.key === key);
      const j = i + d;
      if (j < 0 || j >= list.length) return s;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...s, sections: list.map((x, n) => ({ ...x, position: n * 10 })) };
    });

  const moveOption = (key: string, d: number) =>
    ed.set((s) => {
      const o = s.options.find((x) => x.key === key)!;
      const list = s.options.filter((x) => x.section_key === o.section_key).sort(byPos);
      const i = list.findIndex((x) => x.key === key);
      const j = i + d;
      if (j < 0 || j >= list.length) return s;
      [list[i], list[j]] = [list[j], list[i]];
      const pos = new Map(list.map((x, n) => [x.key, n * 10]));
      return { ...s, options: s.options.map((x) => (pos.has(x.key) ? { ...x, position: pos.get(x.key)! } : x)) };
    });

  const addOption = (section: SectionRow) => {
    const taken = new Set(st.options.map((o) => o.key));
    const siblings = st.options.filter((o) => o.section_key === section.key).sort(byPos);
    const last = siblings.at(-1);
    const key = uniqueKey("nueva_opcion", taken);
    const control = last?.control ?? "toggle";
    const row: OptionRow = {
      section_key: section.key,
      key,
      position: (last?.position ?? 0) + 10,
      visible: true,
      control,
      set_key: control === "card" || control === "segment" ? (last?.set_key ?? uniqueKey(section.key, taken)) : null,
      set_label: "",
      set_description: "",
      badge: "",
      label: "Nueva opción",
      description: "",
      line_label: "",
      price_min: 0,
      price_max: 0,
      price_mode: last?.price_mode === "percent_once" ? "once" : (last?.price_mode ?? "once"),
      unit_label: "",
      track: last?.track ?? "WE",
      is_base: false,
      components: null,
      modifies_base: false,
      base_suffix: "",
      weeks_min: 0,
      weeks_max: 0,
      weeks_factor: null,
      stepper_min: control === "stepper" ? 0 : null,
      stepper_max: control === "stepper" ? 5 : null,
      stepper_included: control === "stepper" ? 0 : null,
      is_default: false,
      requires: null,
    };
    ed.set((s) => ({ ...s, options: [...s.options, row] }));
    setOpen(key);
  };

  const removeOption = async (o: OptionRow) => {
    if (!(await confirm({ title: `¿Quitar «${o.label}»?`, body: "Desaparecerá del configurador al publicar. Hasta entonces puedes deshacerlo.", cta: "Quitar", danger: true }))) return;
    ed.set((s) => ({ ...s, options: s.options.filter((x) => x.key !== o.key), deletedOptions: o.id ? [...s.deletedOptions, o.id] : s.deletedOptions }));
    setOpen(null);
  };

  const addSection = () => {
    const key = uniqueKey("nueva_seccion", new Set(st.sections.map((s) => s.key)));
    const last = [...st.sections].sort(byPos).at(-1);
    const n = st.sections.length + 1;
    ed.set((s) => ({
      ...s,
      sections: [
        ...s.sections,
        { key, position: (last?.position ?? 0) + 10, visible: true, take_label: `Take ${String(n).padStart(2, "0")}`, title: "Nueva sección", description: "", requires: null, locked_title: "", locked_body: "", locked_cta: "", locked_select: "" },
      ],
    }));
    setOpenSection(key);
  };

  const removeSection = async (sec: SectionRow) => {
    const n = st.options.filter((o) => o.section_key === sec.key).length;
    if (!(await confirm({ title: `¿Quitar la sección «${sec.title}»?`, body: n ? `También se quitarán sus ${n} opciones al guardar.` : "La sección está vacía.", cta: "Quitar sección", danger: true }))) return;
    ed.set((s) => ({
      ...s,
      sections: s.sections.filter((x) => x.key !== sec.key),
      options: s.options.filter((o) => o.section_key !== sec.key),
      deletedSections: sec.id ? [...s.deletedSections, sec.id] : s.deletedSections,
      deletedOptions: [...s.deletedOptions, ...s.options.filter((o) => o.section_key === sec.key && o.id).map((o) => o.id!)],
    }));
  };

  const save = (publish: boolean) =>
    start(async () => {
      const res = await savePricing(st);
      if (!res.ok) return toast(res.error, "error");
      clearBackup(KEY);
      ed.commit({ sections: res.data!.sections, options: res.data!.options, deletedSections: [], deletedOptions: [] });
      if (!publish) return toast("Precios guardados en el borrador");
      const pub = await publishSite("Precios del configurador");
      toast(pub.ok ? "Publicado. El configurador ya usa los nuevos precios." : pub.error, pub.ok ? "ok" : "error");
    });

  const sets = Array.from(new Set(st.options.filter((o) => o.set_key).map((o) => o.set_key!)));

  return (
    <div className="toast-in flex max-w-[1240px] flex-col gap-5">
      <PageTitle
        title="Precios del configurador"
        subtitle={
          <>
            Estos rangos alimentan la escena «Tu presupuesto». Los cambios se aplican al publicar. Los textos generales del configurador están en{" "}
            <Link href="/admin/ajustes?tab=configurador" className="border-b border-line-cta text-bone">
              Ajustes
            </Link>
            .
          </>
        }
      />
      {backup && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line-dashed px-4 py-3 text-[13px]">
          <span>Tienes cambios de precios sin guardar de una sesión anterior.</span>
          <span className="flex gap-2">
            <AButton size="sm" variant="primary" onClick={() => (ed.set(backup), setBackup(null))}>
              Recuperar
            </AButton>
            <AButton size="sm" variant="ghost" onClick={() => (clearBackup(KEY), setBackup(null))}>
              Descartar
            </AButton>
          </span>
        </div>
      )}
      <div className="grid items-start gap-4 min-[980px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          {[...st.sections].sort(byPos).map((sec, si, all) => {
            const opts = st.options.filter((o) => o.section_key === sec.key).sort(byPos);
            const textsOpen = openSection === sec.key;
            return (
              <Card key={sec.key} padded={false} className={sec.visible ? "" : "opacity-60"}>
                <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-[18px] py-3.5">
                  <span className={`${mono} text-muted`}>{sec.take_label}</span>
                  <span className="mr-auto text-[15px]">{sec.title}</span>
                  <button type="button" onClick={() => setOpenSection(textsOpen ? null : sec.key)} className="text-[12px] text-muted hover:text-bone" aria-expanded={textsOpen}>
                    {textsOpen ? "Cerrar textos" : "Textos"}
                  </button>
                  <IconBtn label={`Subir sección ${sec.title}`} onClick={() => moveSection(sec.key, -1)} disabled={si === 0}>
                    ↑
                  </IconBtn>
                  <IconBtn label={`Bajar sección ${sec.title}`} onClick={() => moveSection(sec.key, 1)} disabled={si === all.length - 1}>
                    ↓
                  </IconBtn>
                  <Switch size="sm" checked={sec.visible} onChange={(v) => setSection(sec.key, { visible: v })} label={`Sección ${sec.title} visible`} />
                </div>
                {textsOpen && <SectionTexts sec={sec} sets={sets} options={st.options} onChange={(p) => setSection(sec.key, p)} onRemove={() => removeSection(sec)} />}
                <div className="flex justify-end px-[18px] pt-2.5">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">Mín · Máx</span>
                </div>
                {opts.map((o, oi) => {
                  const err = o.price_mode !== "percent_once" && Math.abs(o.price_min) > Math.abs(o.price_max);
                  const detailsOpen = open === o.key;
                  const newGroup = o.set_key && o.set_label && opts[oi - 1]?.set_key !== o.set_key;
                  return (
                    <div key={o.key} className={`flex flex-col gap-1.5 border-b border-line-faint px-[18px] py-2.5 ${o.visible ? "" : "opacity-50"}`}>
                      {newGroup && <span className={`${mono} pt-1 text-dim`}>{o.set_label}</span>}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button type="button" onClick={() => setOpen(detailsOpen ? null : o.key)} aria-expanded={detailsOpen} className="flex min-h-9 flex-[1_1_160px] items-center gap-2 text-left text-[14px] max-[560px]:basis-full">
                          <span className={`text-[10px] text-muted transition-transform ${detailsOpen ? "rotate-90" : ""}`}>▸</span>
                          {o.label}
                          {o.is_base && <span className="rounded-full border border-line-cta px-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">Base</span>}
                        </button>
                        {o.components?.length ? (
                          <span className="w-[200px] text-right font-mono text-[11px] text-muted">{o.components.length} partidas ↓</span>
                        ) : (
                          <>
                            <NumInput label={`Mínimo de ${o.label}`} value={o.price_min} onChange={(v) => setOption(o.key, { price_min: v })} invalid={err} />
                            <NumInput label={`Máximo de ${o.label}`} value={o.price_max} onChange={(v) => setOption(o.key, { price_max: v })} invalid={err} />
                          </>
                        )}
                        <span className="w-[52px] font-mono text-[10px] text-muted">{unitOf(o)}</span>
                        <Switch size="sm" checked={o.visible} onChange={(v) => setOption(o.key, { visible: v })} label={`${o.label} visible`} />
                      </div>
                      {err && <span className="text-[12px] text-rec">El mínimo no puede ser mayor que el máximo.</span>}
                      {detailsOpen && (
                        <OptionDetails
                          o={o}
                          sections={st.sections}
                          sets={sets}
                          options={st.options}
                          isFirst={oi === 0}
                          isLast={oi === opts.length - 1}
                          onChange={(p) => setOption(o.key, p)}
                          onMove={(d) => moveOption(o.key, d)}
                          onRemove={() => removeOption(o)}
                        />
                      )}
                    </div>
                  );
                })}
                <button type="button" onClick={() => addOption(sec)} className="flex min-h-11 w-full items-center px-[18px] text-left text-[13px] text-muted hover:text-bone">
                  + Añadir opción
                </button>
              </Card>
            );
          })}
          <AButton onClick={addSection} className="self-start">
            + Añadir sección
          </AButton>
        </div>
        <div className="flex flex-col gap-4 min-[980px]:sticky min-[980px]:top-4">
          <Simulation state={st} engine={engine} />
          <Card className="flex flex-col gap-2.5">
            {ed.dirty && <span className={`${mono} text-bone`}>● Cambios sin guardar</span>}
            <AButton onClick={() => save(false)} loading={busy} disabled={!ed.dirty}>
              Guardar borrador
            </AButton>
            <AButton variant="primary" onClick={() => save(true)} loading={busy}>
              {ed.dirty ? "Guardar y publicar" : "Publicar"}
            </AButton>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className="flex h-7 w-7 items-center justify-center rounded text-[12px] text-muted hover:bg-[#1F1F1F] hover:text-bone disabled:opacity-30">
      {children}
    </button>
  );
}

/** Campo numérico que deja escribir «-» o vaciar sin saltar a 0 mientras se teclea. */
function NumInput({ value, onChange, label, invalid, decimals = false, nullable = false, width = "w-24" }: { value: number | null; onChange: (v: number) => void; label: string; invalid?: boolean; decimals?: boolean; nullable?: boolean; width?: string }) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    const parsed = draft === "" || draft === "-" ? null : Number(draft.replace(",", "."));
    if (parsed !== value) setDraft(value === null ? "" : String(value));
  }
  const re = decimals ? /^-?\d*([.,]\d{0,2})?$/ : /^-?\d*$/;
  return (
    <input
      aria-label={label}
      inputMode={decimals ? "decimal" : "numeric"}
      value={draft}
      onChange={(e) => {
        const t = e.target.value.replace(decimals ? /\s/g : /[\s.]/g, "");
        if (!re.test(t)) return;
        setDraft(t);
        if (t === "" || t === "-") return nullable ? onChange(NaN) : undefined;
        onChange(Number(t.replace(",", ".")));
      }}
      onBlur={() => {
        if ((draft === "" || draft === "-") && !nullable) setDraft(String(value ?? 0));
      }}
      className={`h-[38px] ${width} rounded-md border bg-surface-2 px-2.5 text-right font-mono text-[13px] text-bone outline-none focus:border-bone ${invalid ? "border-rec" : "border-line"}`}
    />
  );
}

function SectionTexts({ sec, sets, options, onChange, onRemove }: { sec: SectionRow; sets: string[]; options: OptionRow[]; onChange: (p: Partial<SectionRow>) => void; onRemove: () => void }) {
  return (
    <div className="flex flex-col gap-4 border-b border-line-soft bg-deep px-[18px] py-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
        <Field label="Rótulo">
          <TextInput value={sec.take_label} onChange={(e) => onChange({ take_label: e.target.value })} />
        </Field>
        <Field label="Título">
          <TextInput value={sec.title} onChange={(e) => onChange({ title: e.target.value })} />
        </Field>
      </div>
      <Field label="Descripción">
        <TextArea rows={2} value={sec.description} onChange={(e) => onChange({ description: e.target.value })} />
      </Field>
      <RequiresEditor value={sec.requires} sets={sets} options={options} onChange={(requires) => onChange({ requires })} what="Esta sección" />
      {sec.requires && (
        <fieldset className="flex flex-col gap-3 rounded-md border border-line-soft p-3.5">
          <legend className={`${mono} px-1 text-muted`}>Aviso cuando está bloqueada</legend>
          <Field label="Titular">
            <TextInput value={sec.locked_title} onChange={(e) => onChange({ locked_title: e.target.value })} />
          </Field>
          <Field label="Texto">
            <TextArea rows={2} value={sec.locked_body} onChange={(e) => onChange({ locked_body: e.target.value })} />
          </Field>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
            <Field label="Botón">
              <TextInput value={sec.locked_cta} onChange={(e) => onChange({ locked_cta: e.target.value })} />
            </Field>
            <Field label="El botón elige">
              <select value={sec.locked_select} onChange={(e) => onChange({ locked_select: e.target.value })} className="h-11 rounded-md border border-line bg-surface-2 px-3 text-[14px] text-bone">
                <option value="">—</option>
                {options
                  .filter((o) => o.set_key === sec.requires?.set)
                  .map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
              </select>
            </Field>
          </div>
        </fieldset>
      )}
      <button type="button" onClick={onRemove} className="self-start text-[13px] text-muted hover:text-rec">
        Quitar sección
      </button>
    </div>
  );
}

/** «Solo si …»: requisito de una opción o sección (otra elección única debe valer X o Y). */
function RequiresEditor({ value, sets, options, onChange, what }: { value: { set: string; in: string[] } | null; sets: string[]; options: OptionRow[]; onChange: (v: { set: string; in: string[] } | null) => void; what: string }) {
  const choices = value ? options.filter((o) => o.set_key === value.set) : [];
  return (
    <div className="flex flex-col gap-2">
      <span className={`${mono} text-muted`}>Condición</span>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="text-muted">{what} se ofrece</span>
        <select
          aria-label="Condición"
          value={value?.set ?? ""}
          onChange={(e) => onChange(e.target.value ? { set: e.target.value, in: options.filter((o) => o.set_key === e.target.value).slice(0, 1).map((o) => o.key) } : null)}
          className="h-9 rounded-md border border-line bg-surface-2 px-2 text-[13px] text-bone"
        >
          <option value="">siempre</option>
          {sets.map((s) => (
            <option key={s} value={s}>
              solo si «{options.find((o) => o.set_key === s)?.set_label || s}» es…
            </option>
          ))}
        </select>
      </div>
      {value && (
        <div className="flex flex-wrap gap-1.5">
          {choices.map((o) => {
            const on = value.in.includes(o.key);
            return (
              <button
                key={o.key}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  const next = on ? value.in.filter((k) => k !== o.key) : [...value.in, o.key];
                  if (next.length) onChange({ ...value, in: next });
                }}
                className={`h-8 rounded-full border px-3 text-[12px] transition-colors ${on ? "border-bone bg-bone text-ink" : "border-line-strong text-muted hover:text-bone"}`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OptionDetails({
  o,
  sections,
  sets,
  options,
  isFirst,
  isLast,
  onChange,
  onMove,
  onRemove,
}: {
  o: OptionRow;
  sections: SectionRow[];
  sets: string[];
  options: OptionRow[];
  isFirst: boolean;
  isLast: boolean;
  onChange: (p: Partial<OptionRow>) => void;
  onMove: (d: number) => void;
  onRemove: () => void;
}) {
  const choice = o.control === "card" || o.control === "segment";
  const isNew = !o.id;
  return (
    <div className="mt-1.5 flex flex-col gap-4 rounded-md border border-line-soft bg-deep p-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <Field label="Nombre">
          <TextInput value={o.label} onChange={(e) => onChange({ label: e.target.value })} />
        </Field>
        <Field label="Texto en el resumen y el PDF" hint={o.control === "stepper" ? "{n} = cantidad" : "Vacío = el nombre"}>
          <TextInput value={o.line_label} onChange={(e) => onChange({ line_label: e.target.value })} />
        </Field>
        <Field label="Etiqueta destacada" hint="Ej.: «Popular»">
          <TextInput value={o.badge} onChange={(e) => onChange({ badge: e.target.value })} />
        </Field>
      </div>
      <Field label="Descripción">
        <TextArea rows={2} value={o.description} onChange={(e) => onChange({ description: e.target.value })} />
      </Field>

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <div className="flex flex-col gap-2">
          <span className={`${mono} text-muted`}>Cómo se cobra</span>
          <Segmented
            size="sm"
            value={o.price_mode}
            onChange={(v) => onChange({ price_mode: v })}
            options={[
              { value: "once", label: "Pago único" },
              { value: "monthly", label: "Al mes" },
              { value: "percent_once", label: "% del total" },
            ]}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className={`${mono} text-muted`}>Pista</span>
          <Segmented
            size="sm"
            value={o.track}
            onChange={(v) => onChange({ track: v })}
            options={[
              { value: "WE", label: "Web" },
              { value: "RO", label: "Audiovisual" },
            ]}
          />
        </div>
        <Field label="Unidad" hint="Vacío = automática">
          <TextInput value={o.unit_label} onChange={(e) => onChange({ unit_label: e.target.value })} className="!w-28" />
        </Field>
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex flex-col gap-2">
          <span className={`${mono} text-muted`}>{o.is_base ? "Plazo (semanas)" : "Semanas que suma"}</span>
          <span className="flex items-center gap-2">
            <NumInput label="Semanas mínimas" value={o.weeks_min} onChange={(v) => onChange({ weeks_min: v })} width="w-16" invalid={o.weeks_min > o.weeks_max} />
            <span className="text-muted">–</span>
            <NumInput label="Semanas máximas" value={o.weeks_max} onChange={(v) => onChange({ weeks_max: v })} width="w-16" invalid={o.weeks_min > o.weeks_max} />
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <span className={`${mono} text-muted`}>Multiplica el plazo</span>
          <NumInput label="Factor de plazo" decimals nullable value={o.weeks_factor} onChange={(v) => onChange({ weeks_factor: Number.isNaN(v) ? null : v })} width="w-20" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={`${mono} text-muted`}>Tipo de control</span>
        <Segmented
          size="sm"
          value={o.control}
          onChange={(v) =>
            onChange({
              control: v,
              set_key: v === "card" || v === "segment" ? (o.set_key ?? sets[0] ?? "grupo") : null,
              stepper_min: v === "stepper" ? (o.stepper_min ?? 0) : null,
              stepper_max: v === "stepper" ? (o.stepper_max ?? 5) : null,
              stepper_included: v === "stepper" ? (o.stepper_included ?? 0) : null,
            })
          }
          options={[
            { value: "card", label: "Tarjeta" },
            { value: "segment", label: "Botón de grupo" },
            { value: "toggle", label: "Interruptor" },
            { value: "stepper", label: "Contador" },
          ]}
        />
      </div>

      {choice && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
          <Field label="Grupo (elección única)" hint="Las opciones del mismo grupo se excluyen">
            <TextInput monospace value={o.set_key ?? ""} list={`sets-${o.key}`} onChange={(e) => onChange({ set_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") || null })} />
          </Field>
          <datalist id={`sets-${o.key}`}>
            {sets.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <Field label="Título del grupo">
            <TextInput value={o.set_label} onChange={(e) => onChange({ set_label: e.target.value })} />
          </Field>
          <Field label="Descripción del grupo">
            <TextInput value={o.set_description} onChange={(e) => onChange({ set_description: e.target.value })} />
          </Field>
        </div>
      )}
      {o.control === "stepper" && (
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {(
            [
              ["stepper_min", "Mínimo"],
              ["stepper_max", "Máximo"],
              ["stepper_included", "Incluidos sin coste"],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="flex flex-col gap-2">
              <span className={`${mono} text-muted`}>{label}</span>
              <NumInput label={label} value={o[k]} onChange={(v) => onChange({ [k]: Math.max(0, v) })} width="w-16" />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Toggle label={choice ? "Elegida por defecto" : "Activada por defecto"} checked={o.is_default} onChange={(v) => onChange({ is_default: v })} />
        <Toggle
          label="Es un tipo de proyecto (opción base: sin ella no hay presupuesto)"
          checked={o.is_base}
          onChange={(v) => onChange({ is_base: v, modifies_base: v ? false : o.modifies_base })}
        />
        {!o.is_base && <Toggle label="Modifica la línea base en vez de sumar una línea propia (p. ej. Landing)" checked={o.modifies_base} onChange={(v) => onChange({ modifies_base: v })} />}
        {o.modifies_base && (
          <Field label="Texto que añade a la línea base" hint="Ej.: « (landing)»">
            <TextInput value={o.base_suffix} onChange={(e) => onChange({ base_suffix: e.target.value })} />
          </Field>
        )}
      </div>

      {o.is_base && <Components value={o.components} onChange={(components) => onChange({ components })} />}

      <RequiresEditor value={o.requires} sets={sets.filter((s) => s !== o.set_key)} options={options} onChange={(requires) => onChange({ requires })} what="Esta opción" />

      <div className="flex flex-wrap items-center gap-3 border-t border-line-soft pt-3">
        <span className="font-mono text-[10px] text-dim">clave: {o.key}</span>
        <select
          aria-label="Mover a la sección"
          value={o.section_key}
          onChange={(e) => onChange({ section_key: e.target.value, position: 9999 })}
          className="h-8 rounded-md border border-line bg-surface-2 px-2 text-[12px] text-bone"
        >
          {sections.map((s) => (
            <option key={s.key} value={s.key}>
              {s.title}
            </option>
          ))}
        </select>
        <span className="mr-auto flex">
          <IconBtn label="Subir opción" onClick={() => onMove(-1)} disabled={isFirst}>
            ↑
          </IconBtn>
          <IconBtn label="Bajar opción" onClick={() => onMove(1)} disabled={isLast}>
            ↓
          </IconBtn>
        </span>
        {isNew && <span className={`${mono} text-muted`}>Nueva</span>}
        <button type="button" onClick={onRemove} className="text-[13px] text-muted hover:text-rec">
          Quitar opción
        </button>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px]">{label}</span>
      <Switch size="sm" checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function Components({ value, onChange }: { value: OptionRow["components"]; onChange: (v: OptionRow["components"]) => void }) {
  const list = value ?? [];
  const set = (i: number, p: Partial<NonNullable<OptionRow["components"]>[number]>) => onChange(list.map((c, j) => (j === i ? { ...c, ...p } : c)));
  return (
    <fieldset className="flex flex-col gap-2.5 rounded-md border border-line-soft p-3.5">
      <legend className={`${mono} px-1 text-muted`}>Desglose en partidas · opcional</legend>
      <p className="text-[12px] leading-relaxed text-muted">Si lo rellenas, este tipo se muestra como varias líneas (p. ej. «Web a medida» + «Jornada de rodaje»). La partida «base» recibe los modificadores.</p>
      {list.map((c, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <TextInput aria-label={`Partida ${i + 1}`} value={c.label} onChange={(e) => set(i, { label: e.target.value })} className="!h-[38px] min-w-[160px] flex-1" />
          <select aria-label="Pista" value={c.track} onChange={(e) => set(i, { track: e.target.value as "WE" | "RO" })} className="h-[38px] rounded-md border border-line bg-surface-2 px-2 text-[13px] text-bone">
            <option value="WE">Web</option>
            <option value="RO">Audiovisual</option>
          </select>
          <NumInput label={`Mínimo de ${c.label}`} value={c.min} onChange={(v) => set(i, { min: v })} invalid={Math.abs(c.min) > Math.abs(c.max)} />
          <NumInput label={`Máximo de ${c.label}`} value={c.max} onChange={(v) => set(i, { max: v })} invalid={Math.abs(c.min) > Math.abs(c.max)} />
          <label className="flex items-center gap-1.5 text-[12px] text-muted">
            <input type="checkbox" checked={!!c.base} onChange={(e) => onChange(list.map((x, j) => ({ ...x, base: j === i ? e.target.checked : false })))} />
            base
          </label>
          <button type="button" aria-label={`Quitar partida ${i + 1}`} onClick={() => onChange(list.length > 1 ? list.filter((_, j) => j !== i) : null)} className="px-1 text-[12px] text-muted hover:text-rec">
            ✕
          </button>
        </div>
      ))}
      {list.length < 6 && (
        <button type="button" onClick={() => onChange([...list, { label: "Nueva partida", track: "WE", min: 0, max: 0, ...(list.length ? {} : { base: true }) }])} className="self-start text-[13px] text-muted hover:text-bone">
          + Añadir partida
        </button>
      )}
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// Simulación en vivo (el mismo motor que la web)
// ---------------------------------------------------------------------------
function Simulation({ state, engine }: { state: State; engine: EngineSettings }) {
  const visibleSections = state.sections.filter((s) => s.visible);
  const keys = new Set(visibleSections.map((s) => s.key));
  const config: Config = { sections: visibleSections, options: state.options.filter((o) => o.visible && keys.has(o.section_key)) };
  const [raw, setRaw] = useState<Selection>({});
  const sel = normalizeSelection(config, raw);
  let quote = null;
  try {
    quote = computeQuote(config, sel, engine);
  } catch {
    quote = null;
  }
  const put = (k: string, v: string | boolean | number) => setRaw({ ...sel, [k]: v });

  return (
    <Card className="flex flex-col gap-4">
      <span className={`${mono} text-muted`}>Simulación en vivo</span>
      <div className="flex max-h-[42vh] flex-col gap-3 overflow-y-auto pr-1">
        {[...visibleSections].sort(byPos).map((sec) => {
          const opts = config.options.filter((o) => o.section_key === sec.key).sort(byPos);
          const groups = Array.from(new Set(opts.filter((o) => o.set_key).map((o) => o.set_key!)));
          const singles = opts.filter((o) => !o.set_key);
          return (
            <div key={sec.key} className="flex flex-col gap-1.5">
              <span className="text-[12px] text-muted">{sec.title}</span>
              {groups.map((g) => (
                <select key={g} aria-label={g} value={String(sel[g] ?? "")} onChange={(e) => put(g, e.target.value)} className="h-9 rounded-md border border-line bg-surface-2 px-2 text-[13px] text-bone">
                  {!opts.some((o) => o.set_key === g && o.is_default) && <option value="">—</option>}
                  {opts
                    .filter((o) => o.set_key === g)
                    .map((o) => (
                      <option key={o.key} value={o.key} disabled={!isAvailable(config, o, sel)}>
                        {o.label}
                      </option>
                    ))}
                </select>
              ))}
              {singles.map((o) =>
                o.control === "stepper" ? (
                  <label key={o.key} className={`flex items-center justify-between gap-2 text-[13px] ${isAvailable(config, o, sel) ? "" : "opacity-40"}`}>
                    {o.label}
                    <input
                      type="number"
                      min={o.stepper_min ?? 0}
                      max={o.stepper_max ?? 0}
                      value={Number(sel[o.key] ?? 0)}
                      onChange={(e) => put(o.key, Number(e.target.value))}
                      className="h-8 w-16 rounded-md border border-line bg-surface-2 px-2 text-right font-mono text-[12px] text-bone"
                    />
                  </label>
                ) : (
                  <label key={o.key} className={`flex items-center gap-2 text-[13px] ${isAvailable(config, o, sel) ? "" : "opacity-40"}`}>
                    <input type="checkbox" checked={sel[o.key] === true} onChange={(e) => put(o.key, e.target.checked)} />
                    {o.label}
                  </label>
                ),
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-1.5 border-t border-line-soft pt-4" aria-live="polite">
        {quote ? (
          <>
            <span className="text-[13px] leading-snug text-muted">{quote.items.map((i) => i.label).join(" · ")}</span>
            <span className="headline-serif text-[34px] leading-none">{range(quote.one[0], quote.one[1])}</span>
            <span className="text-[13px] text-muted">{quote.monthly[1] > 0 ? `+ ${range(quote.monthly[0], quote.monthly[1])}/mes` : "Pago único"}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
              {quote.level} · {quote.weeks[0]}–{quote.weeks[1]} semanas
            </span>
          </>
        ) : (
          <span className="text-[13px] text-muted">Elige un tipo de proyecto para ver el presupuesto.</span>
        )}
      </div>
      <span className="text-[13px] leading-normal text-muted">Así lo verá un cliente en la web con esas opciones marcadas (incluye lo que aún no has guardado).</span>
    </Card>
  );
}
