"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { signOut } from "@/admin/actions/auth";
import { publishSite } from "@/admin/actions/publish";
import type { AdminUser, Role } from "@/admin/auth";
import { EditorProvider, useEditor } from "@/admin/editor";
import { ICONS, navFor, sectionFor } from "@/admin/nav";
import { useFeedback } from "@/admin/ui/feedback";
import { LaunchGuardProvider, useLaunchGuard } from "@/admin/ui/LaunchGuard";
import { LiveFeed } from "./LiveFeed";
import { AButton, mono } from "@/admin/ui/kit";

export interface DraftStatus {
  dirty: boolean;
  version: number | null;
  published_at: string | null;
  published_by: string | null;
  last_change_at: string | null;
  last_change_by: string | null;
  last_change: string | null;
}

interface Props {
  user: AdminUser & { role: Role };
  status: DraftStatus;
  newLeads: number;
  children: ReactNode;
}

export function AdminShell(props: Props) {
  return (
    <EditorProvider>
      <LaunchGuardProvider>
        <Shell {...props} />
      </LaunchGuardProvider>
    </EditorProvider>
  );
}

function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function Shell({ user, status, newLeads, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { undo, unsaved } = useEditor();
  const { toast, confirm } = useFeedback();
  const launchGuard = useLaunchGuard();
  // El cajón móvil queda ligado a la ruta en la que se abrió: al navegar, se cierra solo
  const [drawerAt, setDrawerAt] = useState<string | null>(null);
  const drawer = drawerAt === pathname;
  const setDrawer = (open: boolean) => setDrawerAt(open ? pathname : null);
  const [publishing, startPublish] = useTransition();
  const groups = navFor(user.role);
  const section = sectionFor(pathname);
  const isAdmin = user.role === "admin";

  /** Navegación del panel: si hay cambios sin guardar, se pregunta antes de salir. */
  const go = async (e: React.MouseEvent, href: string) => {
    if (!unsaved || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    const ok = await confirm({
      title: "Tienes cambios sin guardar",
      body: "Si sales ahora se perderán los cambios de esta pantalla. Guárdalos primero como borrador.",
      cta: "Salir sin guardar",
      danger: true,
    });
    if (ok) router.push(href);
  };

  const publish = async () => {
    if (unsaved) return toast("Guarda primero los cambios de esta pantalla.", "error");
    if (!status.dirty) return toast("No hay cambios pendientes de publicar.");
    // Con bloqueantes, su aviso sustituye a la confirmación de siempre
    const decision = await launchGuard();
    if (decision === "review") return;
    if (decision === "clear") {
      const ok = await confirm({
        title: "¿Publicar los cambios?",
        body: "La web se actualizará al momento. Si algo no te convence, podrás restaurar la versión anterior desde el historial.",
        cta: "Publicar",
      });
      if (!ok) return;
    }
    startPublish(async () => {
      const res = await publishSite();
      if (res.ok) toast(`Publicado (versión ${res.data?.version}). La web ya muestra los cambios.`);
      else toast(res.error, "error");
    });
  };

  const navLink = (item: (typeof groups)[number]["items"][number], big = false) => {
    const active = section.id === item.id;
    return (
      <Link
        key={item.id}
        href={item.href}
        onClick={(e) => go(e, item.href)}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-md px-3 transition-colors duration-200 ${big ? "min-h-[54px] border-b border-line-faint text-[18px]" : "h-10 text-[14px]"} ${
          active ? (big ? "text-bone" : "bg-surface-2 text-bone") : "text-muted hover:text-bone"
        }`}
      >
        <Icon d={ICONS[item.id]} size={big ? 18 : 16} />
        <span className="flex-1">{item.label}</span>
        {item.id === "leads" && newLeads > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-bone px-1.5 font-mono text-[10px] text-ink">{newLeads}</span>
        )}
      </Link>
    );
  };

  const brand = (
    <span className="flex items-center gap-2.5">
      <Image src="/brand/rowe-logo-blanco.png" alt="ROWE" width={65} height={16} unoptimized className="h-4 w-auto" />
      <span className="h-[7px] w-[7px] animate-rec rounded-full bg-rec" aria-hidden="true" />
    </span>
  );

  const tabs = [
    { id: "dashboard" as const, label: "Inicio", href: "/admin" },
    { id: "leads" as const, label: "Mensajes", href: "/admin/mensajes" },
    { id: "texts" as const, label: "Contenido", href: "/admin/textos" },
  ];

  return (
    <div className="flex h-screen-safe overflow-hidden bg-ink text-bone">
      {/* Barra lateral (escritorio) */}
      <aside className="hidden w-[248px] flex-none flex-col gap-[22px] overflow-y-auto border-r border-line-soft px-3.5 py-5 min-[820px]:flex">
        <div className="flex items-center justify-between px-2.5 pb-2 pt-1">
          {brand}
          <span className={`${mono} text-[9px] text-muted`}>Panel</span>
        </div>
        {groups.map((g) => (
          <nav key={g.label} aria-label={g.label} className="flex flex-col gap-0.5">
            <span className={`${mono} px-3 pb-2 text-[9px] text-dim`}>{g.label}</span>
            {g.items.map((i) => navLink(i))}
          </nav>
        ))}
        <div className="mt-auto flex flex-col gap-3.5 border-t border-line-soft pt-4">
          <a href="/" target="_blank" rel="noopener" className="flex h-10 items-center justify-between rounded-md border border-line-strong px-3 text-[14px] hover:border-bone">
            Ver web <span aria-hidden="true">↗</span>
          </a>
          <UserBadge user={user} />
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col">
        {/* Barra superior */}
        <header className="flex h-16 flex-none items-center justify-between gap-3 border-b border-line-soft px-4 min-[820px]:px-7">
          <div className="flex min-w-0 items-center gap-3.5">
            <button type="button" onClick={() => setDrawer(true)} className="-ml-2.5 flex h-11 w-11 items-center justify-center min-[820px]:hidden" aria-label="Abrir menú">
              <Icon d="M2 4h12 M2 8h12 M2 12h12" size={18} />
            </button>
            <div className="flex min-w-0 flex-col">
              <span className={`${mono} text-[9px] text-muted`}>Panel / {section.label}</span>
              <span className="truncate text-[15px]">{section.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {status.dirty && (
              <span className={`hidden items-center gap-2 ${mono} text-bone min-[820px]:flex`} title={status.last_change ?? ""}>
                <span className="h-[7px] w-[7px] rounded-full border border-bone" /> Cambios sin publicar
              </span>
            )}
            {undo && (
              <AButton variant="ghost" size="sm" onClick={undo} title="Deshacer">
                ↶ <span className="max-[819px]:hidden">Deshacer</span>
              </AButton>
            )}
            <a href="/vista-previa" target="_blank" rel="noopener" className="hidden h-9 items-center rounded-full border border-line-input px-3.5 text-[13px] hover:border-bone min-[820px]:flex">
              Vista previa
            </a>
            {isAdmin ? (
              <AButton variant="primary" size="sm" onClick={publish} loading={publishing} className={status.dirty ? "" : "opacity-40"}>
                Publicar
              </AButton>
            ) : (
              <span className={`${mono} text-[9px] text-muted max-[819px]:hidden`} title="Los editores guardan borradores; un administrador publica.">
                Publica un admin
              </span>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-24 min-[820px]:p-7 min-[820px]:pb-12">{children}</div>
        <LiveFeed />

        {/* Pestañas (móvil) */}
        <nav aria-label="Secciones" className="absolute inset-x-0 bottom-0 z-20 grid h-[68px] grid-cols-4 border-t border-line-soft bg-[rgb(10_10_10/0.94)] backdrop-blur-md min-[820px]:hidden">
          {tabs.map((t) => (
            <Link key={t.id} href={t.href} onClick={(e) => go(e, t.href)} className={`relative flex flex-col items-center justify-center gap-1 text-[10px] ${section.id === t.id ? "text-bone" : "text-muted"}`}>
              <Icon d={ICONS[t.id]} size={18} />
              {t.label}
              {t.id === "leads" && newLeads > 0 && <span className="absolute left-[calc(50%+6px)] top-2.5 h-[7px] w-[7px] rounded-full bg-bone" />}
            </Link>
          ))}
          <button type="button" onClick={() => setDrawer(true)} className="flex flex-col items-center justify-center gap-1 text-[10px] text-muted">
            <Icon d={ICONS.more} size={18} />
            Más
          </button>
        </nav>
      </main>

      {/* Cajón (móvil) */}
      {drawer && (
        <div role="dialog" aria-modal="true" aria-label="Menú del panel" className="toast-in fixed inset-0 z-[60] flex flex-col bg-ink">
          <div className="flex h-16 items-center justify-between border-b border-line-soft px-4">
            {brand}
            <button type="button" onClick={() => setDrawer(false)} className="min-h-11 text-[14px]">
              Cerrar
            </button>
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-6 pt-3">
            {groups.flatMap((g) => g.items).map((i) => navLink(i, true))}
            {status.dirty && <span className={`mt-4 ${mono} text-bone`}>● Cambios sin publicar</span>}
            <a href="/vista-previa" target="_blank" rel="noopener" className="mt-4 flex min-h-12 items-center text-[15px]">
              Vista previa ↗
            </a>
            <form action={signOut}>
              <button type="submit" className="mt-2 min-h-[54px] text-[15px] text-muted">
                Salir
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function UserBadge({ user }: { user: AdminUser & { role: Role } }) {
  const initials = (user.name || user.email).split(/[\s.@]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return (
    <div className="flex items-center gap-2.5 px-1">
      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-line-strong bg-surface-2 font-mono text-[11px]">{initials}</span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px]">{user.name}</span>
        <span className={`${mono} text-[9px] text-muted`}>{user.role === "admin" ? "Administrador" : "Editor"}</span>
      </div>
      <form action={signOut}>
        <button type="submit" className="min-h-9 text-[13px] text-muted hover:text-bone">
          Salir
        </button>
      </form>
    </div>
  );
}
