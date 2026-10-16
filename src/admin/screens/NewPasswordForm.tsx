"use client";

import { useState, useTransition } from "react";
import { updatePassword } from "@/admin/actions/auth";
import { AButton, Field, mono, TextInput } from "@/admin/ui/kit";

export function NewPasswordForm() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (a !== b) return setError("Las contraseñas no coinciden.");
    start(async () => {
      const res = await updatePassword(a);
      if (res?.error) setError(res.error);
    });
  };

  return (
    <form onSubmit={submit} className="toast-in flex w-[min(380px,100%)] flex-col gap-6">
      <span className={`${mono} text-muted`}>Panel · Acceso</span>
      <h1 className="headline-serif text-[42px] leading-[0.95]">
        Crea tu <em>contraseña.</em>
      </h1>
      <Field label="Contraseña nueva" htmlFor="pw-a" hint="Mínimo 12 caracteres.">
        <TextInput id="pw-a" type="password" autoComplete="new-password" value={a} onChange={(e) => setA(e.target.value)} />
      </Field>
      <Field label="Repítela" htmlFor="pw-b">
        <TextInput id="pw-b" type="password" autoComplete="new-password" value={b} onChange={(e) => setB(e.target.value)} invalid={!!error} />
      </Field>
      {error && (
        <p role="alert" className="text-[13px] text-rec">
          {error}
        </p>
      )}
      <AButton type="submit" variant="primary" loading={pending} className="h-[50px]">
        Guardar y entrar
      </AButton>
    </form>
  );
}
