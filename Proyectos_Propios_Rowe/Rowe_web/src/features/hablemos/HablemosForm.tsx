"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { RichText } from "@/components/ui/RichText";
import { track } from "@/lib/analytics/client";
import type { ContactSettings } from "@/lib/content/settings";
import { hasRealValue, instagramHref, whatsappHref } from "@/lib/content/settings";
import { fieldErrors } from "./schema";
import type { HablemosSettings } from "./settings";
import { useHablemos } from "./store";
import styles from "./HablemosForm.module.css";

type Status = "idle" | "loading" | "error" | "success";
type Field = "name" | "email" | "city" | "privacy";

interface Props {
  settings: HablemosSettings;
  contact: ContactSettings;
  variant?: "section" | "overlay";
}

const CFG = "cfg";
const p2 = (n: number) => String(n).padStart(2, "0");
/** Reloj fuera del componente: solo se usa en manejadores de eventos (anti-spam: tiempo de relleno). */
const clock = () => Date.now();

/**
 * Formulario «Hablemos» en 5 tomas (HablemosForm.dc.html). Se usa en la Escena 10 y
 * en el overlay. Si viene del configurador, se precarga necesidad y presupuesto.
 */
export function HablemosForm({ settings, contact, variant = "section" }: Props) {
  const { prefill } = useHablemos();
  const [step, setStep] = useState(0);
  const [need, setNeed] = useState<string | null>(null);
  const [sector, setSector] = useState<string | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, true>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [errorText, setErrorText] = useState("");
  const [copied, setCopied] = useState(false);
  const [prefillId, setPrefillId] = useState<number | null>(null);
  const started = useRef<number>(0);
  const trap = useRef<HTMLInputElement>(null);
  const stepHeading = useRef<HTMLDivElement>(null);
  const advance = useRef(0);

  // Precarga desde el configurador (cada vez que llega una configuración nueva)
  if (prefill && prefill.id !== prefillId) {
    setPrefillId(prefill.id);
    setNeed(prefill.need);
    setBudget(CFG);
    setStep(0);
    setStatus("idle");
  }

  useEffect(() => () => window.clearTimeout(advance.current), []);

  const startClock = () => {
    if (!started.current) started.current = clock();
  };

  const go = (n: number) => {
    setStep(n);
    requestAnimationFrame(() => stepHeading.current?.focus({ preventScroll: true }));
  };

  /** Respuesta de un clic: se marca y avanza sola (340 ms, como en el diseño). */
  const pick = (setter: (v: string) => void, value: string, next: number) => {
    startClock();
    setter(value);
    window.clearTimeout(advance.current);
    advance.current = window.setTimeout(() => go(next), 340);
  };

  const canNext = [!!need, !!sector, !!budget, true, true][step];
  const loading = status === "loading";
  const success = status === "success";

  const submit = async () => {
    const e = fieldErrors({ name, email, city, privacy });
    setErrors(e);
    if (Object.keys(e).length) return;
    setStatus("loading");
    setErrorText("");
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    params.forEach((v, k) => k.startsWith("utm_") && (utm[k] = v.slice(0, 120)));
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          need,
          sector: sector ?? "",
          budget: budget ?? "",
          message: msg,
          name,
          company,
          email,
          phone,
          city,
          privacy,
          selection: budget === CFG ? prefill?.selection : undefined,
          website: trap.current?.value ?? "",
          elapsed: started.current ? clock() - started.current : 0,
          source: { path: window.location.pathname, referrer: document.referrer.slice(0, 500), utm, variant },
        }),
      });
      if (res.ok) {
        setStatus("success");
        track("lead", { origin: budget === CFG ? "configurador" : "formulario" });
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { fields?: Field[]; message?: string };
      if (res.status === 400 && body.fields?.length) {
        setErrors(Object.fromEntries(body.fields.map((f) => [f, true])) as Partial<Record<Field, true>>);
        setStatus("idle");
        return;
      }
      setErrorText(body.message ?? "");
      setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  const next = () => {
    if (!canNext || loading) return;
    if (step < 4) go(step + 1);
    else submit();
  };

  const reset = () => {
    setStep(0);
    setNeed(null);
    setSector(null);
    setBudget(null);
    setMsg("");
    setStatus("idle");
    setErrors({});
    started.current = 0;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(contact.email_contact);
    } catch {}
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const s = settings.steps[step] ?? settings.steps[0];
  const budgets = [...(prefill?.range ? [{ key: CFG, label: prefill.range, tag: settings.budget_from_configurator }] : []), ...settings.budgets.map((b) => ({ key: b, label: b, tag: "" }))];
  const choice = (on: boolean) => (on ? "bg-bone text-ink border-bone" : "bg-transparent text-bone border-line-input");
  const nextLabel = step < 4 ? settings.next : status === "error" ? settings.retry : settings.submit;
  const firstName = name.trim().split(/\s+/)[0];

  return (
    <div className="flex w-full flex-col gap-[18px] font-sans text-bone">
      <div className="relative border border-line bg-surface">
        <div className="relative h-3.5 border-b border-line" aria-hidden="true">
          <span key={`${step}-${status}`} className={styles.clap} />
        </div>

        <div className="flex min-h-[470px] flex-col gap-[30px] p-[clamp(22px,3.5vw,44px)]">
          {/* Campo trampa (bots) */}
          <div className={styles.trap} aria-hidden="true">
            <label>
              Web
              <input ref={trap} type="text" name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          {!success && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between label-mono text-muted">
                <span>
                  Toma <span className="text-bone">{p2(step + 1)}</span> / 05
                </span>
                <span className="tabular-nums">{`00:00:${p2(step + 1)}:${p2(step * 5)}`}</span>
              </div>
              <div className="grid grid-cols-5 gap-1" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className={`h-[2px] transition-colors duration-[600ms] ease-[var(--ease-cut)] ${i <= step ? "bg-bone" : "bg-[rgb(237_234_228/0.12)]"}`} />
                ))}
              </div>
            </div>
          )}

          {!success && (
            <div key={step} className={`${styles.stepIn} flex flex-col gap-[26px]`}>
              <div ref={stepHeading} tabIndex={-1} className="flex flex-col gap-2.5 outline-none" aria-live="polite">
                <span className="label-mono text-muted">{s.kicker}</span>
                <RichText as="p" className="headline-serif text-[clamp(34px,3.6vw,54px)] leading-none" text={s.title} />
              </div>

              {step === 0 && (
                <div role="radiogroup" aria-label={s.kicker} className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
                  {settings.needs.map((o) => (
                    <button
                      key={o.key}
                      type="button"
                      role="radio"
                      aria-checked={need === o.label}
                      onClick={() => pick(setNeed, o.label, 1)}
                      className={`flex min-h-[112px] flex-col justify-between gap-4 border px-5 py-[18px] text-left transition-[background-color,color,border-color] duration-[400ms] ease-[var(--ease-cut)] hover:border-bone ${choice(need === o.label)}`}
                    >
                      <span aria-hidden="true" className="font-mono text-[10px] tracking-[0.12em] opacity-60">{o.key}</span>
                      <span className="text-[21px]">{o.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {step === 1 && (
                <div role="radiogroup" aria-label={s.kicker} className="flex flex-wrap gap-2">
                  {settings.sectors.map((v) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={sector === v}
                      onClick={() => pick(setSector, v, 2)}
                      className={`flex min-h-12 items-center rounded-full border px-5 text-[16px] transition-[background-color,color,border-color] duration-[400ms] ease-[var(--ease-cut)] hover:border-bone ${choice(sector === v)}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div role="radiogroup" aria-label={s.kicker} className="flex flex-col">
                  {budgets.map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      role="radio"
                      aria-checked={budget === b.key}
                      onClick={() => pick(setBudget, b.key, 3)}
                      className={`${styles.budget} flex min-h-[54px] items-center justify-between gap-4 border-b border-line px-[18px] text-left text-[17px] transition-[background-color,color,padding] duration-[400ms] ease-[var(--ease-out)] ${budget === b.key ? "bg-bone text-ink" : "text-bone"}`}
                    >
                      <span>{b.label}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-60">{b.tag}</span>
                    </button>
                  ))}
                </div>
              )}

              {step === 3 && (
                <div className="flex flex-col gap-3">
                  <label className="sr-only" htmlFor={`msg-${variant}`}>
                    {s.kicker}
                  </label>
                  <textarea
                    id={`msg-${variant}`}
                    value={msg}
                    onChange={(e) => {
                      startClock();
                      setMsg(e.target.value.slice(0, settings.message_max));
                    }}
                    rows={5}
                    maxLength={settings.message_max}
                    placeholder={settings.message_placeholder}
                    className="w-full resize-y border border-line bg-surface-2 px-[18px] py-4 text-[16px] leading-relaxed outline-none focus:border-bone"
                  />
                  <div className="flex justify-between label-mono text-[10px] text-muted">
                    <span>{settings.optional}</span>
                    <span>
                      {msg.length} / {settings.message_max}
                    </span>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="flex flex-col gap-[26px]">
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-7 gap-y-[22px]">
                    <TextField id="name" label={settings.fields.name} placeholder={settings.fields.name_placeholder} value={name} autoComplete="name" error={errors.name ? settings.errors.name : ""} onChange={(v) => { startClock(); setName(v); setErrors((e) => ({ ...e, name: undefined })); }} variant={variant} />
                    <TextField id="company" label={settings.fields.company} placeholder={settings.fields.company_placeholder} value={company} autoComplete="organization" onChange={setCompany} variant={variant} />
                    <TextField id="email" type="email" label={settings.fields.email} placeholder={settings.fields.email_placeholder} value={email} autoComplete="email" error={errors.email ? settings.errors.email : ""} onChange={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: undefined })); }} variant={variant} />
                    <TextField id="phone" type="tel" label={settings.fields.phone} placeholder={hasRealValue(settings.fields.phone_placeholder) ? settings.fields.phone_placeholder : ""} value={phone} autoComplete="tel" onChange={setPhone} variant={variant} />
                    <TextField id="city" label={settings.fields.city} placeholder={settings.fields.city_placeholder} value={city} autoComplete="address-level2" error={errors.city ? settings.errors.city : ""} onChange={(v) => { setCity(v); setErrors((e) => ({ ...e, city: undefined })); }} variant={variant} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={privacy}
                      aria-invalid={errors.privacy || undefined}
                      onClick={() => {
                        setPrivacy((p) => !p);
                        setErrors((e) => ({ ...e, privacy: undefined }));
                      }}
                      className="flex min-h-11 items-center gap-3.5 text-left text-[15px] text-muted"
                    >
                      <span className={`flex h-5 w-5 flex-none items-center justify-center border text-[13px] text-ink transition-colors ${privacy ? "border-bone bg-bone" : errors.privacy ? "border-rec" : "border-[rgb(237_234_228/0.4)]"}`}>
                        {privacy ? "✓" : ""}
                      </span>
                      <span>{settings.fields.privacy}</span>
                    </button>
                    <Link href="/privacidad" className="ml-[34px] w-fit border-b border-line-cta text-[13px] text-bone">
                      {settings.fields.privacy_link || "Política de privacidad"}
                    </Link>
                    {errors.privacy && <span className="font-mono text-[10px] tracking-[0.08em] text-rec">{settings.errors.privacy}</span>}
                  </div>
                </div>
              )}
            </div>
          )}

          {status === "error" && step === 4 && (
            <div role="alert" className={`${styles.stepIn} flex items-start gap-3.5 border border-[rgb(255_59_31/0.5)] px-[18px] py-4`}>
              <span className="mt-[7px] h-2 w-2 flex-none rounded-full bg-rec" />
              <div className="flex flex-col gap-1">
                <span className="text-[16px]">{settings.errors.send_title}</span>
                <span className="text-[14px] leading-normal text-muted">{errorText || settings.errors.send_body.replace("{email}", hasRealValue(contact.email_contact) ? contact.email_contact : "")}</span>
              </div>
            </div>
          )}

          {!success && (
            <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-line-soft pt-5">
              <button
                type="button"
                onClick={() => {
                  setStatus("idle");
                  go(Math.max(0, step - 1));
                }}
                className={`flex min-h-11 items-center gap-2 text-[15px] text-muted transition-colors hover:text-bone ${step === 0 ? "invisible" : ""}`}
              >
                {settings.back}
              </button>
              <div className="flex flex-wrap items-center gap-[18px]">
                <span className="label-mono text-[10px] text-muted">{s.hint}</span>
                <Button size="md" onClick={next} dimmed={!canNext} loading={loading} loadingLabel={settings.loading}>
                  {nextLabel}
                </Button>
              </div>
            </div>
          )}

          {success && (
            <div className={`${styles.stepIn} flex flex-1 flex-col justify-center gap-6`} role="status">
              <div className="relative h-14 w-14" aria-hidden="true">
                <span className="absolute inset-0 rounded-full border border-line-dashed" />
                <span className={`${styles.recOff} absolute inset-0 rounded-full bg-rec`} />
              </div>
              <span className="label-mono text-muted">{settings.success_meta}</span>
              <RichText as="p" className="headline-serif text-[clamp(48px,5.5vw,84px)] leading-[0.95]" text={settings.success_title} />
              <p className="max-w-[44ch] text-[17px] leading-relaxed text-muted">
                {settings.success_body.split("{email}")[0].replace("{name}", firstName ? `, ${firstName}` : "")}
                <span className="text-bone">{email}</span>
                {settings.success_body.split("{email}")[1] ?? ""}
              </p>
              <Button variant="link" onClick={reset} arrow="→" className="self-start">
                {settings.success_reset}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {hasRealValue(contact.email_contact) && (
          <button type="button" onClick={copy} data-cursor={settings.copy} className="flex min-h-12 items-center gap-3.5 border border-line-strong px-[18px] text-[15px] transition-colors hover:border-[rgb(237_234_228/0.5)]">
            <span>{contact.email_contact}</span>
            <span className={`label-mono text-[10px] ${copied ? "text-bone" : "text-muted"}`}>{copied ? settings.copied : settings.copy}</span>
          </button>
        )}
        {whatsappHref(contact.whatsapp) && (
          <a href={whatsappHref(contact.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center gap-2.5 border border-line-strong px-[18px] text-[15px] transition-colors hover:border-[rgb(237_234_228/0.5)]">
            WhatsApp <span className="label-mono text-[10px] text-muted">{contact.whatsapp}</span>
          </a>
        )}
        {instagramHref(contact.instagram) && (
          <a href={instagramHref(contact.instagram)} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center border border-line-strong px-[18px] text-[15px] transition-colors hover:border-[rgb(237_234_228/0.5)]">
            {contact.instagram}
          </a>
        )}
      </div>
    </div>
  );
}

function TextField(props: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  variant: string;
}) {
  const id = `${props.id}-${props.variant}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label-mono text-[10px] text-muted">
        {props.label}
      </label>
      <input
        id={id}
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        autoComplete={props.autoComplete}
        aria-invalid={!!props.error || undefined}
        aria-describedby={props.error ? `${id}-err` : undefined}
        className={`border-0 border-b bg-transparent py-3 text-[17px] text-bone outline-none transition-colors focus:border-bone ${props.error ? "border-rec" : "border-line-dashed"}`}
      />
      {props.error && (
        <span id={`${id}-err`} className="font-mono text-[10px] tracking-[0.08em] text-rec">
          {props.error}
        </span>
      )}
    </div>
  );
}
