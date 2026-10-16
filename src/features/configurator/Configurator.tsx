"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/components/chrome/Toaster";
import { Button } from "@/components/ui/Button";
import { CornerMarks } from "@/components/ui/CornerMarks";
import { RecDot } from "@/components/ui/RecDot";
import { RichText } from "@/components/ui/RichText";
import { hablemos } from "@/features/hablemos/store";
import { track } from "@/lib/analytics/client";
import type { ConfigOption, ConfigSection } from "@/lib/content/types";
import { gsap } from "@/motion/gsap";
import { prefersReducedMotion } from "@/motion/media";
import { useMotionOptional } from "@/motion/MotionProvider";
import { computeQuote, defaultSelection, isAvailable, needFromSelection, normalizeSelection, quoteLabel, requirementMet, type Config, type Quote, type Selection } from "./engine";
import { delta, euros, range } from "./format";
import { PdfPreview } from "./PdfPreview";
import type { ConfiguratorSettings } from "./settings";
import styles from "./Configurator.module.css";

const STORAGE_KEY = "rowe:cfg";

interface Props {
  config: Config;
  settings: ConfiguratorSettings;
  /** Datos para el pie del PDF (contacto y dominio). */
  pdfFooter: string[];
}

/**
 * Configurador de presupuesto (Escena 09) — ROWE Presupuesto.dc.html.
 * El precio se calcula con el mismo motor que usa el servidor (engine.ts).
 */
export function Configurator({ config, settings, pdfFooter }: Props) {
  const [sel, setSel] = useState<Selection>(() => defaultSelection(config));
  const [pdfOpen, setPdfOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [inView, setInView] = useState(false);
  const quote = useMemo(() => computeQuote(config, sel, settings), [config, sel, settings]);
  const motion = useMotionOptional();
  const root = useRef<HTMLDivElement>(null);
  const monitor = useRef<HTMLDivElement>(null);

  // Selección guardada en la sesión (si se navega y se vuelve, sigue igual)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restaurar estado del navegador tras hidratar
      if (saved) setSel(normalizeSelection(config, JSON.parse(saved)));
    } catch {
      /* sin almacenamiento */
    }
  }, [config]);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sel));
    } catch {}
  }, [sel]);

  // Analítica: apertura y primer presupuesto de la sesión
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setInView(e.isIntersecting);
        if (e.isIntersecting) track("config_open", {}, { once: true });
      },
      { rootMargin: "-40% 0px -40% 0px" },
    );
    io.observe(el);
    const mq = window.matchMedia("(max-width: 899px)");
    const onMq = () => setNarrow(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    return () => {
      io.disconnect();
      mq.removeEventListener("change", onMq);
    };
  }, []);
  useEffect(() => {
    if (quote) track("quote", { one_max: quote.one[1] }, { once: true });
  }, [quote]);

  const set = (key: string, value: string | boolean | number) => setSel((s) => ({ ...s, [key]: value }));

  const send = () => {
    if (!quote) return toast(settings.need_first);
    const prefill = {
      id: Date.now(),
      need: needFromSelection(config, sel),
      range: quoteLabel(quote),
      items: quote.items.map((i) => i.label).join(" · "),
      selection: sel,
    };
    hablemos.open(prefill);
  };

  const showMobileBar = narrow && inView && !!quote && !pdfOpen;

  return (
    <div ref={root} id="rw-cfg" className="mt-[12vh] flex flex-wrap items-start gap-[clamp(40px,5vw,96px)]">
      <div className="flex min-w-0 flex-[1_1_560px] flex-col">
        {config.sections.map((section) => (
          <Take key={section.key} section={section} config={config} sel={sel} set={set} />
        ))}
      </div>

      <Monitor ref={monitor} quote={quote} settings={settings} narrow={narrow} onSend={send} onPdf={() => (quote ? setPdfOpen(true) : toast(settings.need_first))} />

      {pdfOpen && quote && (
        <PdfPreview quote={quote} selection={sel} settings={settings} footer={pdfFooter} onClose={() => setPdfOpen(false)} />
      )}

      {showMobileBar && (
        <div className={`${styles.mobileBar} fixed inset-x-0 bottom-0 z-[90] flex items-center justify-between gap-3 border-t border-line bg-[rgb(10_10_10/0.92)] px-5 py-3 backdrop-blur-md`}>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="label-mono text-[9px] text-muted">{settings.mobile_label}</span>
            <span className="headline-serif whitespace-nowrap text-[26px] leading-none">{range(quote!.one[0], quote!.one[1])}</span>
          </div>
          <Button size="sm" magnetic={false} onClick={() => monitor.current && motion?.scrollTo(monitor.current, { offset: -90 })}>
            {settings.mobile_cta}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tomas
// ---------------------------------------------------------------------------

function Take({ section, config, sel, set }: { section: ConfigSection; config: Config; sel: Selection; set: (k: string, v: string | boolean | number) => void }) {
  const options = config.options.filter((o) => o.section_key === section.key).sort((a, b) => a.position - b.position);
  const locked = !requirementMet(section.requires, sel);
  const allCards = options.every((o) => o.control === "card");
  const sets = new Set(options.map((o) => o.set_key).filter(Boolean));
  const allOneSegment = options.every((o) => o.control === "segment") && sets.size === 1;

  return (
    <section data-reveal className="flex flex-col gap-[26px] border-t border-line pb-[46px] pt-[34px]" aria-labelledby={`take-${section.key}`}>
      <div className="flex flex-wrap items-baseline gap-5">
        <span className="label-mono text-muted">{section.take_label}</span>
        <h3 id={`take-${section.key}`} className="text-[clamp(24px,2.2vw,30px)] tracking-[-0.01em]">
          {section.title}
        </h3>
      </div>

      {locked && section.locked_title && (
        <div className="flex flex-wrap items-center justify-between gap-5 border border-dashed border-line-dashed p-6">
          <div className="flex max-w-[440px] flex-col gap-2">
            <RichText as="p" className="headline-serif text-[30px] leading-none" text={section.locked_title} />
            <p className="text-[14px] leading-[1.55] text-muted">{section.locked_body}</p>
          </div>
          {section.locked_select && (
            <Button
              variant="outline"
              size="md"
              arrow="→"
              magnetic={false}
              onClick={() => {
                const target = config.options.find((o) => o.key === section.locked_select);
                if (target?.set_key) set(target.set_key, target.key);
              }}
            >
              {section.locked_cta}
            </Button>
          )}
        </div>
      )}

      <div className={`transition-opacity duration-500 ${locked ? "pointer-events-none opacity-30" : ""}`} aria-disabled={locked || undefined}>
        {allCards ? (
          <Cards options={options} sel={sel} set={set} />
        ) : allOneSegment ? (
          <SegmentGrid options={options} sel={sel} set={set} />
        ) : (
          <Rows options={options} config={config} sel={sel} set={set} locked={locked} />
        )}
      </div>
    </section>
  );
}

const inverted = (on: boolean) =>
  on ? "bg-bone text-ink border-bone" : "bg-transparent text-bone border-line-strong";

function Cards({ options, sel, set }: { options: ConfigOption[]; sel: Selection; set: (k: string, v: string) => void }) {
  return (
    <div role="radiogroup" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
      {options.map((o) => {
        const on = sel[o.set_key!] === o.key;
        const from = o.components?.length ? o.components.reduce((a, c) => a + c.min, 0) : o.price_min;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => set(o.set_key!, o.key)}
            className={`flex min-h-[230px] flex-col justify-between gap-6 border p-[22px] text-left transition-[background-color,color,border-color,scale] duration-500 ease-[var(--ease-cut)] hover:border-bone active:scale-[0.98] ${inverted(on)}`}
          >
            <span className={`flex justify-between label-mono text-[10px] ${on ? "text-[rgb(10_10_10/0.62)]" : "text-muted"}`}>
              <span>{o.badge}</span>
              <span>desde {euros(from)}</span>
            </span>
            <span className="flex flex-col gap-2.5">
              <span className="headline-serif text-[40px] leading-[0.95]">{o.label}</span>
              <span className={`text-[14px] leading-normal ${on ? "text-[rgb(10_10_10/0.62)]" : "text-muted"}`}>{o.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SegmentGrid({ options, sel, set }: { options: ConfigOption[]; sel: Selection; set: (k: string, v: string) => void }) {
  return (
    <div role="radiogroup" className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] border border-line">
      {options.map((o) => {
        const on = sel[o.set_key!] === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => set(o.set_key!, o.key)}
            className={`flex min-h-[84px] flex-col justify-between gap-2 border-r border-line px-[18px] py-4 text-left transition-[background-color,color] duration-[450ms] ease-[var(--ease-cut)] focus-visible:outline-offset-[-2px] ${on ? "bg-bone text-ink" : "text-bone"}`}
          >
            <span className="text-[16px]">{o.label}</span>
            <span className={`font-mono text-[10px] tracking-[0.08em] ${on ? "text-[rgb(10_10_10/0.62)]" : "text-muted"}`}>{delta(o.price_min, o.price_max, o.price_mode, o.unit_label)}</span>
          </button>
        );
      })}
    </div>
  );
}

function Rows({ options, config, sel, set, locked }: { options: ConfigOption[]; config: Config; sel: Selection; set: (k: string, v: string | boolean | number) => void; locked: boolean }) {
  // Agrupa los segmentos por set_key (una fila por grupo) y deja el resto como filas individuales
  const rendered = new Set<string>();
  return (
    <div className="flex flex-col border-t border-line">
      {options.map((o) => {
        if (o.set_key && rendered.has(o.set_key)) return null;
        if (o.control === "segment" && o.set_key) {
          rendered.add(o.set_key);
          const group = options.filter((x) => x.set_key === o.set_key);
          return (
            <div key={o.set_key} className="flex flex-wrap items-center gap-5 border-b border-line px-1 py-[18px]">
              <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
                <span className="text-[18px]">{o.set_label || o.label}</span>
                {o.set_description && <span className="text-[14px] text-muted">{o.set_description}</span>}
              </div>
              <div role="radiogroup" aria-label={o.set_label} className="flex border border-line-input">
                {group.map((g) => {
                  const on = sel[g.set_key!] === g.key;
                  return (
                    <button
                      key={g.key}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      tabIndex={locked ? -1 : undefined}
                      onClick={() => set(g.set_key!, g.key)}
                      className={`flex h-11 min-w-14 items-center justify-center px-3 font-mono text-[12px] transition-[background-color,color] duration-[400ms] ease-[var(--ease-cut)] ${on ? "bg-bone text-ink" : "text-bone"}`}
                      title={g.price_max ? delta(g.price_min, g.price_max, g.price_mode, g.unit_label) : undefined}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }
        if (o.control === "stepper") {
          const n = Number(sel[o.key] ?? o.stepper_included ?? 1);
          const extra = Math.max(0, n - (o.stepper_included ?? o.stepper_min ?? 0));
          return (
            <div key={o.key} className="flex items-center gap-5 border-b border-line px-1 py-[18px]">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[18px]">{o.label}</span>
                <span className="text-[14px] leading-[1.45] text-muted">{o.description}</span>
              </div>
              <span className={`whitespace-nowrap font-mono text-[11px] tracking-[0.06em] ${extra ? "text-bone" : "text-muted"}`}>
                {extra ? delta(o.price_min * extra, o.price_max * extra, o.price_mode) : "Incluido"}
              </span>
              <div className="flex flex-none items-center border border-line-input">
                <button type="button" aria-label={`Menos ${o.label.toLowerCase()}`} tabIndex={locked ? -1 : undefined} onClick={() => set(o.key, Math.max(o.stepper_min ?? 0, n - 1))} className="flex h-11 w-11 items-center justify-center text-[18px] hover:bg-surface-2">
                  −
                </button>
                <span aria-live="polite" className="min-w-7 text-center font-mono text-[13px]">
                  {n}
                </span>
                <button type="button" aria-label={`Más ${o.label.toLowerCase()}`} tabIndex={locked ? -1 : undefined} onClick={() => set(o.key, Math.min(o.stepper_max ?? n, n + 1))} className="flex h-11 w-11 items-center justify-center text-[18px] hover:bg-surface-2">
                  +
                </button>
              </div>
            </div>
          );
        }
        // Interruptor
        const on = sel[o.key] === true && isAvailable(config, o, sel);
        return (
          <button
            key={o.key}
            type="button"
            role="switch"
            aria-checked={on}
            tabIndex={locked ? -1 : undefined}
            onClick={() => set(o.key, !(sel[o.key] === true))}
            className={`${styles.row} flex w-full items-center gap-5 border-b border-line px-1 py-[18px] text-left transition-[padding,background-color] duration-[350ms] ease-[var(--ease-out)] ${on ? "bg-[rgb(237_234_228/0.03)]" : ""}`}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[18px]">{o.label}</span>
              <span className="text-[14px] leading-[1.45] text-muted">{o.description}</span>
            </span>
            <span className={`whitespace-nowrap font-mono text-[11px] tracking-[0.06em] transition-colors duration-300 ${on ? "text-bone" : "text-muted"}`}>
              {delta(o.price_min, o.price_max, o.price_mode, o.unit_label)}
            </span>
            <span className={styles.switch} data-on={on || undefined} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Monitor
// ---------------------------------------------------------------------------

interface MonitorProps {
  quote: Quote | null;
  settings: ConfiguratorSettings;
  narrow: boolean;
  onSend: () => void;
  onPdf: () => void;
  ref?: React.Ref<HTMLDivElement>;
}

function Monitor({ quote, settings, narrow, onSend, onPdf, ref }: MonitorProps) {
  const rangeRef = useRef<HTMLSpanElement>(null);
  const monthlyRef = useRef<HTMLSpanElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const disp = useRef({ a: 0, b: 0, c: 0, d: 0 });
  const last = useRef(0);
  const active = !!quote;

  // El rango se anima (0,8 s) hasta el nuevo valor; color según suba o baje
  useEffect(() => {
    const target = quote ? { a: quote.one[0], b: quote.one[1], c: quote.monthly[0], d: quote.monthly[1] } : { a: 0, b: 0, c: 0, d: 0 };
    const write = () => {
      const v = disp.current;
      if (rangeRef.current) rangeRef.current.textContent = quote ? range(v.a, v.b) : "— €";
      if (monthlyRef.current)
        monthlyRef.current.textContent = !quote ? settings.empty_text : quote.monthly[1] > 0 ? `+ ${range(v.c, v.d)}/mes` : settings.once_text;
    };
    if (quote && shell.current && target.b !== last.current) {
      shell.current.dataset.trend = target.b > last.current ? "up" : "down";
      const el = shell.current;
      window.setTimeout(() => delete el.dataset.trend, 650);
    }
    last.current = target.b;
    if (prefersReducedMotion()) {
      disp.current = target;
      write();
      return;
    }
    const tw = gsap.to(disp.current, { ...target, duration: 0.8, ease: "power3.inOut", onUpdate: write });
    return () => {
      tw.kill();
    };
  }, [quote, settings.empty_text, settings.once_text]);

  // Pistas WE/RO: cada partida es un clip proporcional a su importe
  const clips = useMemo(() => {
    if (!quote) return { we: [], ro: [], scale: 1 };
    const weight = (i: Quote["items"][number]) => Math.max(0, (i.min + i.max) / 2) * (i.monthly ? 6 : 1);
    const total = quote.items.reduce((a, i) => a + weight(i), 0) || 1;
    const build = (t: "WE" | "RO") => quote.items.filter((i) => i.track === t).map((i) => ({ key: i.key, label: i.label, g: Math.max(total * 0.07, weight(i)) }));
    const we = build("WE");
    const ro = build("RO");
    const sum = (xs: { g: number }[]) => xs.reduce((a, x) => a + x.g, 0);
    return { we, ro, scale: Math.max(sum(we), sum(ro), 1) };
  }, [quote]);

  const lit = quote?.lit ?? 0;
  const bars = Array.from({ length: settings.vu_bars }, (_, i) => i);
  const third = settings.vu_bars / 3;

  return (
    <div ref={ref} id="rw-monitor" className={`min-w-0 flex-[1_1_380px] ${narrow ? "relative" : "sticky top-[100px]"}`}>
      <div ref={shell} className="relative flex flex-col gap-[26px] border border-line bg-monitor p-[clamp(22px,2.4vw,32px)]">
        <CornerMarks size={18} inset={-1} color="#EDEAE4" />
        <div className="flex items-center justify-between label-mono text-[10px]">
          <span className="text-muted">{settings.monitor_label}</span>
          <span className={`flex items-center gap-2 ${active ? "text-bone" : "text-ghost"}`}>
            <RecDot off={!active} />
            {active ? settings.rec_label : settings.standby_label}
          </span>
        </div>

        <div className="flex flex-col gap-2.5" aria-live="polite">
          <span ref={rangeRef} className={`${styles.range} headline-serif whitespace-nowrap text-[clamp(40px,4.4vw,76px)] leading-[0.95] tabular-nums`}>
            — €
          </span>
          <span ref={monthlyRef} className="min-h-[22px] text-[16px] text-muted">
            {settings.empty_text}
          </span>
        </div>

        <div className="flex flex-col gap-2" aria-hidden="true">
          <div className="flex h-4 gap-[3px]">
            {bars.map((i) => (
              <span
                key={i}
                className="flex-1 transition-colors duration-500 ease-[var(--ease-cut)]"
                style={{ background: i < lit ? (i < third ? "#4A4844" : i < third * 2 ? "#8A8780" : "#EDEAE4") : "#1A1A1A" }}
              />
            ))}
          </div>
          <div className="flex justify-between label-mono text-[9px] text-muted">
            <span>{settings.level_label}</span>
            <span className="text-bone">{quote?.level ?? "—"}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5" aria-hidden="true">
          {(["WE", "RO"] as const).map((t) => {
            const list = t === "WE" ? clips.we : clips.ro;
            const filled = list.reduce((a, x) => a + x.g, 0);
            return (
              <div key={t} className="flex items-center gap-3">
                <span className="w-[30px] font-mono text-[10px] tracking-[0.12em]">{t}</span>
                <div className="flex h-10 min-w-0 flex-1 gap-[3px] overflow-hidden border border-line-soft p-[3px]">
                  {list.map((c) => (
                    <span
                      key={c.key}
                      className={`${styles.clip} flex min-w-0 items-center overflow-hidden text-ellipsis whitespace-nowrap px-2 font-mono text-[9px] uppercase tracking-[0.08em] ${
                        t === "RO"
                          ? "border border-line-strong bg-canvas bg-[repeating-linear-gradient(135deg,rgb(237_234_228/0.06)_0_1px,transparent_1px_6px)]"
                          : "border border-[rgb(237_234_228/0.35)]"
                      }`}
                      style={{ flexGrow: c.g, flexBasis: 0 }}
                    >
                      {c.label}
                    </span>
                  ))}
                  <span className="flex items-center overflow-hidden whitespace-nowrap pl-1.5 label-mono text-[9px] text-muted" style={{ flexGrow: clips.scale - filled, flexBasis: 0 }}>
                    {list.length ? "" : t === "RO" && quote ? settings.add_content_hint : settings.empty_track}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <dl className="flex flex-col border-t border-line">
          <div className="flex justify-between gap-4 border-b border-line py-3.5">
            <dt className="label-mono text-[10px] text-muted">{settings.weeks_label}</dt>
            <dd className="text-[15px]">{quote ? `${quote.weeks[0]}–${quote.weeks[1]} semanas` : "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-3.5">
            <dt className="flex-none label-mono text-[10px] text-muted">{settings.includes_label}</dt>
            <dd className="text-right font-mono text-[10px] uppercase leading-[1.7] tracking-[0.08em]">{settings.includes}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-3">
          <Button onClick={onSend} dimmed={!active} arrow="→" className="flex-[1_1_200px]">
            {settings.cta_send}
          </Button>
          <Button variant="outline" onClick={onPdf} dimmed={!active} arrow="↓" magnetic={false} className="flex-[1_1_160px]">
            {settings.cta_pdf}
          </Button>
        </div>
        <p className="label-mono text-[9px] leading-[1.7] tracking-[0.1em] text-muted">{settings.disclaimer}</p>
      </div>
    </div>
  );
}
