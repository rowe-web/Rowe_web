"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { requestPasswordReset, signIn } from "@/admin/actions/auth";
import { AButton, Field, mono, TextInput } from "@/admin/ui/kit";

/** Login del panel (ROWE Admin.dc.html). */
export function LoginForm({ next, linkError, host }: { next: string; linkError: boolean; host: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState(linkError ? "El enlace ha caducado o ya se usó. Pide uno nuevo." : "");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const [resetting, startReset] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await signIn({ email, password, remember, next });
      if (res?.error) setError(res.error);
    });
  };

  const forgot = () => {
    setError("");
    startReset(async () => {
      const res = await requestPasswordReset(email);
      if ("error" in res) setError(res.error);
      else setSent(true);
    });
  };

  return (
    <form onSubmit={submit} className="toast-in flex w-[min(380px,100%)] flex-col gap-7" noValidate>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-3">
          <Image src="/brand/rowe-logo-blanco.png" alt="ROWE" width={81} height={20} unoptimized priority className="h-5 w-auto" />
          <span className="h-2 w-2 animate-rec rounded-full bg-rec" aria-hidden="true" />
        </span>
        <span className={`${mono} text-muted`}>Panel</span>
      </div>
      <h1 className="headline-serif text-[46px] leading-[0.95]">
        Bienvenido <em>de nuevo.</em>
      </h1>

      {sent && (
        <p role="status" className="rounded-lg border border-[rgb(237_234_228/0.2)] px-4 py-3.5 text-[14px] leading-normal">
          Si ese email tiene acceso, te hemos enviado un enlace para crear una contraseña nueva. Revisa tu bandeja de entrada.
        </p>
      )}

      <div className="flex flex-col gap-4">
        <Field label="Email" htmlFor="login-email">
          <TextInput id="login-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!error} required />
        </Field>
        <Field label="Contraseña" htmlFor="login-password">
          <TextInput id="login-password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!error} required />
        </Field>
        {error && (
          <p role="alert" className="text-[13px] text-rec">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" role="checkbox" aria-checked={remember} onClick={() => setRemember((r) => !r)} className="flex min-h-11 items-center gap-2.5 text-[14px] text-muted">
            <span className={`flex h-[18px] w-[18px] items-center justify-center rounded border text-[12px] text-ink ${remember ? "border-bone bg-bone" : "border-[rgb(237_234_228/0.4)]"}`}>{remember ? "✓" : ""}</span>
            Recordarme
          </button>
          <button type="button" onClick={forgot} disabled={resetting} className="border-b border-line-cta text-[14px] disabled:opacity-50">
            {resetting ? "Enviando…" : "¿Has olvidado tu contraseña?"}
          </button>
        </div>
      </div>

      <AButton type="submit" variant="primary" loading={pending} className="h-[50px] text-[15px]">
        {pending ? "Entrando…" : "Entrar"}
      </AButton>
      <p className={`${mono} text-dim`}>{host} · Acceso restringido</p>
    </form>
  );
}
