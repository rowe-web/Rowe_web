"use client";

import { useState, useTransition } from "react";
import { inviteUser, revokeUser, setUserRole } from "@/admin/actions/users";
import { when } from "@/admin/format";
import { useFeedback } from "@/admin/ui/feedback";
import { AButton, Card, Field, PageTitle, Segmented, TextInput } from "@/admin/ui/kit";
import { mono } from "@/admin/ui/styles";

export interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "editor" | null;
  last_sign_in_at: string | null;
  invited_at: string | null;
  confirmed: boolean;
}

const ROLE_LABEL = { admin: "Administrador", editor: "Editor" } as const;
const ROLE_DESC = {
  admin: "Todo: textos, proyectos, medios, precios, usuarios y publicación.",
  editor: "Textos, proyectos y medios. Guarda borradores; un administrador publica. No ve precios ni usuarios.",
};

function initials(u: UserRow) {
  const base = u.full_name || u.email;
  const parts = base.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase();
}

/** Usuarios (ROWE Admin · Usuarios). Solo administradores. */
export function UsersScreen({ users, meId }: { users: UserRow[]; meId: string }) {
  const { toast, confirm } = useFeedback();
  const [invite, setInvite] = useState<{ email: string; name: string; role: "admin" | "editor" } | null>(null);
  const [link, setLink] = useState<{ email: string; url: string; emailed: boolean } | null>(null);
  const [busy, start] = useTransition();
  const active = users.filter((u) => u.role);
  const revoked = users.filter((u) => !u.role);

  const changeRole = async (u: UserRow) => {
    const next = u.role === "admin" ? "editor" : "admin";
    const ok = await confirm({ title: `¿Hacer ${ROLE_LABEL[next].toLowerCase()} a ${u.full_name || u.email}?`, body: ROLE_DESC[next], cta: "Cambiar rol" });
    if (!ok) return;
    start(async () => {
      const res = await setUserRole(u.id, next);
      toast(res.ok ? `${u.full_name || u.email} ahora es ${ROLE_LABEL[next].toLowerCase()}` : res.error, res.ok ? "ok" : "error");
    });
  };

  const revoke = async (u: UserRow) => {
    const ok = await confirm({ title: `¿Quitar el acceso a ${u.full_name || u.email}?`, body: "No podrá volver a entrar al panel. Sus cambios siguen en el historial. Puedes volver a invitarle cuando quieras.", cta: "Quitar acceso", danger: true });
    if (!ok) return;
    start(async () => {
      const res = await revokeUser(u.id);
      toast(res.ok ? "Acceso retirado" : res.error, res.ok ? "ok" : "error");
    });
  };

  const send = () => {
    if (!invite) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(invite.email.trim())) return toast("Escribe un email válido.", "error");
    start(async () => {
      const res = await inviteUser(invite);
      if (!res.ok) return toast(res.error, "error");
      setInvite(null);
      setLink({ email: invite.email.trim(), url: res.data!.link, emailed: res.data!.emailed });
    });
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast("Enlace copiado");
    } catch {
      toast("No se pudo copiar: selecciona el enlace y cópialo a mano.", "error");
    }
  };

  const row = (u: UserRow) => {
    const me = u.id === meId;
    const pending = !u.confirmed || !u.last_sign_in_at;
    return (
      <div key={u.id} className={`flex flex-wrap items-center gap-3.5 border-b border-line-faint px-[18px] py-3.5 ${u.role ? "" : "opacity-60"}`}>
        <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full border border-line-strong bg-surface-2 font-mono text-[11px]">{initials(u)}</span>
        <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-[3px]">
          <span className="text-[15px]">
            {u.full_name || u.email.split("@")[0]}
            {me && <span className="text-muted"> · tú</span>}
          </span>
          <span className="truncate text-[13px] text-muted">{u.email}</span>
        </div>
        <span className="rounded-full border border-line-cta px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em]">{u.role ? ROLE_LABEL[u.role] : "Sin acceso"}</span>
        <span className="w-24 font-mono text-[10px] text-muted">{u.role ? (pending ? "Pendiente" : when(u.last_sign_in_at)) : ""}</span>
        {u.role ? (
          <span className="flex gap-3">
            {!me && (
              <>
                <button type="button" onClick={() => changeRole(u)} disabled={busy} className="min-h-9 text-[13px] text-muted hover:text-bone">
                  Cambiar rol
                </button>
                {pending && (
                  <button type="button" onClick={() => setInvite({ email: u.email, name: u.full_name, role: u.role! })} className="min-h-9 text-[13px] text-muted hover:text-bone">
                    Reenviar
                  </button>
                )}
                <button type="button" onClick={() => revoke(u)} disabled={busy} className="min-h-9 text-[13px] text-muted hover:text-rec">
                  Quitar acceso
                </button>
              </>
            )}
          </span>
        ) : (
          <button type="button" onClick={() => setInvite({ email: u.email, name: u.full_name, role: "editor" })} className="min-h-9 text-[13px] text-muted hover:text-bone">
            Volver a invitar
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="toast-in flex max-w-[1040px] flex-col gap-5">
      <PageTitle
        title="Usuarios"
        subtitle="Quién puede entrar al panel y qué puede tocar."
        actions={
          <AButton variant="primary" onClick={() => setInvite({ email: "", name: "", role: "editor" })} className="!h-[42px] !px-5">
            Invitar usuario
          </AButton>
        }
      />
      {link && (
        <Card className="flex flex-col gap-3 !border-line-cta">
          <span className={`${mono} text-muted`}>{link.emailed ? `Invitación enviada a ${link.email}` : `Invitación creada para ${link.email}`}</span>
          <p className="text-[14px] leading-relaxed">
            {link.emailed ? "Le ha llegado un email con el enlace. Si no lo encuentra, puedes mandarle este mismo enlace por WhatsApp o email:" : "El envío de emails aún no está configurado: copia este enlace y mándaselo tú por WhatsApp o email."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <TextInput readOnly monospace value={link.url} onFocus={(e) => e.target.select()} aria-label="Enlace de invitación" className="min-w-0 flex-1 !text-[12px]" />
            <AButton size="sm" variant="primary" onClick={() => copy(link.url)}>
              Copiar enlace
            </AButton>
            <AButton size="sm" variant="ghost" onClick={() => setLink(null)}>
              Cerrar
            </AButton>
          </div>
          <p className="text-[12px] text-muted">Solo sirve una vez y caduca (por defecto en 24 horas). Si caduca, pulsa «Reenviar».</p>
        </Card>
      )}
      <Card padded={false}>{active.map(row)}</Card>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
        {(["admin", "editor"] as const).map((r) => (
          <div key={r} className="flex flex-col gap-2 rounded-lg border border-line px-5 py-[18px]">
            <span className="text-[15px]">{ROLE_LABEL[r]}</span>
            <span className="text-[13px] leading-[1.55] text-muted">{ROLE_DESC[r]}</span>
          </div>
        ))}
      </div>
      {revoked.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className={`${mono} text-muted`}>Sin acceso · {revoked.length}</span>
          <Card padded={false}>{revoked.map(row)}</Card>
        </div>
      )}

      {invite && (
        <div role="dialog" aria-modal="true" aria-label="Invitar usuario" onClick={() => setInvite(null)} className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgb(10_10_10/0.75)] p-5 backdrop-blur-[6px]">
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => (e.preventDefault(), send())}
            className="toast-in flex w-[min(460px,100%)] flex-col gap-[18px] rounded-[10px] border border-line-strong bg-surface p-[26px]"
          >
            <p className="headline-serif text-[30px] leading-none">
              Invitar <em>usuario</em>
            </p>
            <Field label="Email" htmlFor="inv-email">
              <TextInput id="inv-email" type="email" autoFocus value={invite.email} placeholder="persona@negocio.es" onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
            </Field>
            <Field label="Nombre · opcional" htmlFor="inv-name">
              <TextInput id="inv-name" value={invite.name} placeholder="Cómo aparecerá en el historial" onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
            </Field>
            <div className="flex flex-col gap-2">
              <span className={`${mono} text-muted`}>Rol</span>
              <Segmented
                label="Rol"
                value={invite.role}
                onChange={(role) => setInvite({ ...invite, role })}
                options={[
                  { value: "editor", label: "Editor" },
                  { value: "admin", label: "Administrador" },
                ]}
              />
              <span className="text-[13px] leading-normal text-muted">{invite.role === "editor" ? "Puede editar textos, proyectos y medios. Un administrador publica." : "Acceso completo, incluidos precios, usuarios y publicación."}</span>
            </div>
            <div className="flex justify-end gap-2.5">
              <AButton variant="ghost" onClick={() => setInvite(null)}>
                Cancelar
              </AButton>
              <AButton variant="primary" type="submit" loading={busy}>
                Enviar invitación
              </AButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
