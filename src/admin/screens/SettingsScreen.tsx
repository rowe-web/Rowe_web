"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { savePage, saveSetting } from "@/admin/actions/content";
import { publishSite } from "@/admin/actions/publish";
import { clearBackup, readBackup, useEditor, useUndoable } from "@/admin/editor";
import { when } from "@/admin/format";
import { MediaPicker } from "@/admin/media/library";
import { useFeedback } from "@/admin/ui/feedback";
import { JsonFields, type Json } from "@/admin/ui/JsonFields";
import { AButton, Card, Field, PageTitle, Segmented, Switch, TextArea, TextInput } from "@/admin/ui/kit";
import { mono } from "@/admin/ui/styles";
import { SectionsEditor } from "./SectionsEditor";

export interface SettingRow {
  key: string;
  label: string;
  value: Record<string, unknown>;
  is_public: boolean;
  editor_can_edit: boolean;
}

export interface PageRow {
  id: string;
  slug: string;
  kind: string;
  title: string;
  intro: string;
  /** Legales: apartados { title, body }. Resto: secciones con «type» (src/lib/content/blocks.ts). */
  blocks: Record<string, Json>[];
  seo_title: string;
  seo_description: string;
  og_media_id: string | null;
  updated_at: string;
}

/** Pestañas → ajuste que editan. */
const TABS = [
  { id: "contacto", label: "Contacto", setting: "contact" },
  { id: "seo", label: "SEO", setting: "seo" },
  { id: "paginas", label: "Páginas y legal", setting: null },
  { id: "legal", label: "Datos legales", setting: "legal" },
  { id: "cookies", label: "Cookies", setting: "cookies" },
  { id: "marca", label: "Marca", setting: "brand" },
  { id: "navegacion", label: "Menú y pie", setting: "navigation" },
  { id: "configurador", label: "Configurador", setting: "configurator" },
  { id: "formulario", label: "Formulario «Hablemos»", setting: "hablemos" },
  { id: "avisos", label: "Avisos por email", setting: "notifications" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const HINTS: Partial<Record<string, string>> = {
  contact: "Aparecen en el pie, en «Hablemos», en el PDF del presupuesto y en los textos legales.",
  brand: "Textos generales de la web: lema, pie, pestaña al salir, sonido ambiente y página 404.",
  navigation: "Enlaces del menú (con su pie de foto), botón «Hablemos», pie de página y preloader.",
  configurator: "Textos de la escena «Tu presupuesto», del PDF, niveles del medidor y redondeos. Los precios están en Precios.",
  hablemos: "Pasos, opciones, textos y mensajes de error del formulario.",
  legal: "Titular de la web para el aviso legal y la privacidad. En los textos legales, {titular}, {nif}, {domicilio}, {email}, {alojamiento} y {actualizado} se sustituyen por estos datos, y {web} y {dominio} por la dirección real de la web. Lo que va entre corchetes es provisional.",
  notifications: "A quién se envía el aviso de cada mensaje nuevo. No se publica: se aplica al guardar.",
};

/** Ajustes (ROWE Admin · Ajustes). Cada editor ve solo lo que puede cambiar. */
export function SettingsScreen({ settings, pages, isAdmin, host, initialTab }: { settings: SettingRow[]; pages: PageRow[]; isAdmin: boolean; host: string; initialTab: string | null }) {
  const available = TABS.filter((t) => (t.setting ? settings.some((s) => s.key === t.setting) : true));
  const [tab, setTab] = useState<TabId>(() => available.find((t) => t.id === initialTab)?.id ?? available[0].id);
  const router = useRouter();
  const pathname = usePathname();
  const { unsaved } = useEditor();
  const { confirm } = useFeedback();
  const current = available.find((t) => t.id === tab)!;
  const setting = current.setting ? settings.find((s) => s.key === current.setting)! : null;

  const go = async (id: TabId) => {
    if (id === tab) return;
    if (unsaved && !(await confirm({ title: "Tienes cambios sin guardar", body: "Guárdalos antes de cambiar de pestaña o se perderán.", cta: "Cambiar sin guardar", danger: true }))) return;
    setTab(id);
    router.replace(`${pathname}?tab=${id}`, { scroll: false });
  };

  return (
    <div className="toast-in flex max-w-[1040px] flex-col gap-5">
      <PageTitle title="Ajustes" subtitle="Datos de contacto, SEO general, textos legales y textos generales de la web." />
      <Segmented label="Sección" value={tab} onChange={go} options={available.map((t) => ({ value: t.id, label: t.label }))} />
      {setting ? <SettingEditor key={setting.key} setting={setting} isAdmin={isAdmin} host={host} /> : <PagesEditor pages={pages} isAdmin={isAdmin} host={host} />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function useSaver(isAdmin: boolean) {
  const { toast } = useFeedback();
  const [busy, start] = useTransition();
  const run = (save: () => Promise<{ ok: boolean; error?: string }>, onSaved: () => void, opts: { publish: boolean; note: string; live?: boolean }) =>
    start(async () => {
      const res = await save();
      if (!res.ok) return toast((res as { error: string }).error, "error");
      onSaved();
      if (!opts.publish) return toast(opts.live ? "Guardado. Ya está en uso." : "Borrador guardado");
      const pub = await publishSite(opts.note);
      toast(pub.ok ? "Publicado. La web ya muestra los cambios." : pub.error, pub.ok ? "ok" : "error");
    });
  return { busy, run, canPublish: isAdmin };
}

function Backup<T>({ storageKey, saved, onRecover }: { storageKey: string; saved: T; onRecover: (v: T) => void }) {
  const [backup, setBackup] = useState<T | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- comprobar una copia local al abrir
    setBackup(readBackup(storageKey, saved));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  if (!backup) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line-dashed px-4 py-3 text-[13px]">
      <span>Tienes cambios sin guardar de una sesión anterior.</span>
      <span className="flex gap-2">
        <AButton size="sm" variant="primary" onClick={() => (onRecover(backup), setBackup(null))}>
          Recuperar
        </AButton>
        <AButton size="sm" variant="ghost" onClick={() => (clearBackup(storageKey), setBackup(null))}>
          Descartar
        </AButton>
      </span>
    </div>
  );
}

function SaveBar({ dirty, busy, onSave, onPublish, publishLabel = "Publicar", note }: { dirty: boolean; busy: boolean; onSave: () => void; onPublish?: () => void; publishLabel?: string; note?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2.5">
      {note && <span className="mr-auto text-[12px] text-muted">{note}</span>}
      {dirty && <span className={`${mono} ${note ? "" : "mr-auto"} text-bone`}>● Sin guardar</span>}
      <AButton onClick={onSave} loading={busy} disabled={!dirty}>
        Guardar{onPublish ? " borrador" : ""}
      </AButton>
      {onPublish && (
        <AButton variant="primary" onClick={onPublish} loading={busy}>
          {dirty ? `Guardar y ${publishLabel.toLowerCase()}` : publishLabel}
        </AButton>
      )}
    </div>
  );
}

function SettingEditor({ setting, isAdmin, host }: { setting: SettingRow; isAdmin: boolean; host: string }) {
  const storageKey = `setting:${setting.key}`;
  const ed = useUndoable<Record<string, unknown>>(setting.value, storageKey);
  const v = ed.state;
  const { busy, run, canPublish } = useSaver(isAdmin);
  const save = (publish: boolean) =>
    run(() => saveSetting(setting.key, v), () => (ed.commit(v), clearBackup(storageKey)), { publish, note: setting.label, live: !setting.is_public });
  const set = (k: string, val: unknown) => ed.set((s) => ({ ...s, [k]: val }));

  let body: ReactNode;
  if (setting.key === "seo") {
    const title = String(v.title ?? "");
    const desc = String(v.description ?? "");
    body = (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] items-start gap-4">
        <Card className="flex flex-col gap-4">
          <Field label="Título de la home" count={title.length} max={60} htmlFor="seo-t">
            <TextInput id="seo-t" value={title} onChange={(e) => set("title", e.target.value)} invalid={title.length > 60} />
          </Field>
          <Field label="Descripción" count={desc.length} max={160} hint="Recomendado: entre 120 y 160 caracteres." htmlFor="seo-d">
            <TextArea id="seo-d" rows={3} value={desc} onChange={(e) => set("description", e.target.value)} invalid={desc.length > 160} />
          </Field>
          <div className="grid grid-cols-2 gap-2.5">
            <MediaPicker label="Imagen para compartir · 1200 × 630" kind="image" value={(v.og_media_id as string) ?? null} onChange={(id) => set("og_media_id", id)} aspect="1200 / 630" />
            <MediaPicker label="Favicon · 512 × 512" kind="image" value={(v.favicon_media_id as string) ?? null} onChange={(id) => set("favicon_media_id", id)} aspect="1 / 1" />
          </div>
        </Card>
        <Card className="flex flex-col gap-3">
          <span className={`${mono} text-muted`}>Así se verá en Google</span>
          <GooglePreview host={host} title={title} description={desc} />
        </Card>
      </div>
    );
  } else if (setting.key === "cookies") {
    const enabled = v.enabled !== false;
    body = (
      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3.5">
          <div className="flex flex-col gap-1">
            <span className="text-[15px]">Banner de cookies</span>
            <span className="text-[13px] text-muted">Se muestra en la primera visita. Sin aceptar, no se mide nada.</span>
          </div>
          <Switch checked={enabled} onChange={(on) => set("enabled", on)} label="Banner de cookies" />
        </div>
        {enabled && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-ink px-[18px] py-4">
            <span className="max-w-[46ch] text-[13px] leading-normal text-muted">{String(v.text ?? "")}</span>
            <div className="flex gap-2">
              <span className="flex h-8 items-center rounded-full border border-line-input px-3.5 text-[12px]">{String(v.configure ?? "")}</span>
              <span className="flex h-8 items-center rounded-full border border-line-input px-3.5 text-[12px]">{String(v.reject ?? "")}</span>
              <span className="flex h-8 items-center rounded-full bg-bone px-3.5 text-[12px] text-ink">{String(v.accept ?? "")}</span>
            </div>
          </div>
        )}
        <JsonFields value={v as Json} onChange={(n) => ed.set(n as Record<string, unknown>)} hide={["enabled"]} />
      </Card>
    );
  } else {
    body = (
      <Card className="flex flex-col gap-4">
        {HINTS[setting.key] && <p className="text-[13px] leading-relaxed text-muted">{HINTS[setting.key]}</p>}
        <JsonFields value={v as Json} onChange={(n) => ed.set(n as Record<string, unknown>)} grid={setting.key === "contact"} />
      </Card>
    );
  }

  return (
    <div className="toast-in flex flex-col gap-4">
      <Backup storageKey={storageKey} saved={setting.value} onRecover={(b) => ed.set(b)} />
      {!setting.editor_can_edit && isAdmin && <p className={`${mono} text-dim`}>Solo administradores</p>}
      {body}
      <SaveBar
        dirty={ed.dirty}
        busy={busy}
        onSave={() => save(false)}
        onPublish={setting.is_public && canPublish ? () => save(true) : undefined}
        note={setting.is_public ? (canPublish ? undefined : "Un administrador publicará los cambios.") : "Ajuste interno: no se publica en la web."}
      />
    </div>
  );
}

function GooglePreview({ host, title, description, path = "" }: { host: string; title: string; description: string; path?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md bg-bone px-[18px] py-4 text-[#1A1A1A]">
      <span className="text-[12px] text-ghost">
        {host}
        {path && <span> › {path.replace(/^\//, "")}</span>}
      </span>
      <span className="line-clamp-1 text-[18px] leading-[1.3] text-[#1F3A8A]">{title || "Sin título"}</span>
      <span className="line-clamp-2 text-[13px] leading-normal text-ghost">{description || "Sin descripción: Google elegirá un fragmento de la página."}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Páginas (servicios, proyectos, contacto y legales)
// ---------------------------------------------------------------------------
const KIND_LABEL: Record<string, string> = { legal: "Legal", service: "Servicio", projects: "Portfolio", contact: "Contacto", system: "Sistema" };

function PagesEditor({ pages, isAdmin, host }: { pages: PageRow[]; isAdmin: boolean; host: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const { unsaved } = useEditor();
  const { confirm } = useFeedback();
  const page = pages.find((p) => p.id === open);
  const sorted = [...pages].sort((a, b) => Number(b.kind === "legal") - Number(a.kind === "legal") || a.title.localeCompare(b.title));

  const choose = async (id: string | null) => {
    if (unsaved && !(await confirm({ title: "Tienes cambios sin guardar", body: "Guárdalos antes de salir de esta página o se perderán.", cta: "Salir sin guardar", danger: true }))) return;
    setOpen(id);
  };

  if (page) return <PageEditor key={page.id} page={page} isAdmin={isAdmin} host={host} onBack={() => choose(null)} />;
  return (
    <Card padded={false} className="toast-in">
      {sorted.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center gap-3.5 border-b border-line-faint px-[18px] py-3.5">
          <span className="flex-1 text-[15px]">{p.title.replace(/\*/g, "")}</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-dim">{KIND_LABEL[p.kind] ?? p.kind}</span>
          <span className="w-28 font-mono text-[10px] text-muted">{when(p.updated_at)}</span>
          <button type="button" onClick={() => choose(p.id)} className="min-h-9 text-[13px] text-muted hover:text-bone">
            Editar →
          </button>
        </div>
      ))}
    </Card>
  );
}

type PageInput = Omit<PageRow, "id" | "slug" | "kind" | "updated_at">;

function PageEditor({ page, isAdmin, host, onBack }: { page: PageRow; isAdmin: boolean; host: string; onBack: () => void }) {
  const storageKey = `page:${page.id}`;
  const initial: PageInput = { title: page.title, intro: page.intro, blocks: Array.isArray(page.blocks) ? page.blocks : [], seo_title: page.seo_title, seo_description: page.seo_description, og_media_id: page.og_media_id };
  const ed = useUndoable<PageInput>(initial, storageKey);
  const v = ed.state;
  const { busy, run, canPublish } = useSaver(isAdmin);
  const set = <K extends keyof PageInput>(k: K, val: PageInput[K]) => ed.set((s) => ({ ...s, [k]: val }));
  const save = (publish: boolean) => run(() => savePage(page.id, v), () => (ed.commit(v), clearBackup(storageKey)), { publish, note: `Página «${v.title.replace(/\*/g, "")}»` });
  const legal = page.kind === "legal";

  return (
    <div className="toast-in flex flex-col gap-4">
      <button type="button" onClick={onBack} className="flex min-h-8 items-center self-start text-[14px] text-muted hover:text-bone">
        ← Páginas
      </button>
      <Backup storageKey={storageKey} saved={initial} onRecover={(b) => ed.set(b)} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] items-start gap-4">
        <Card className="flex flex-col gap-4">
          <span className={`${mono} text-muted`}>/{page.slug}</span>
          <Field label="Título" hint="*texto* = cursiva serif" htmlFor="pg-title">
            <TextInput id="pg-title" value={v.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label={legal ? "Introducción" : "Entradilla"} htmlFor="pg-intro" count={v.intro.length}>
            <TextArea id="pg-intro" rows={legal ? 4 : 3} value={v.intro} onChange={(e) => set("intro", e.target.value)} />
          </Field>
          {legal && (
            <fieldset className="flex flex-col gap-3">
              <legend className={`${mono} mb-1 text-muted`}>Apartados · {v.blocks.length}</legend>
              <p className="text-[12px] leading-relaxed text-muted">Marcas que se rellenan solas: {"{titular} {nif} {domicilio} {email} {alojamiento} {actualizado}"} (Ajustes → Datos legales) y {"{web} {dominio}"} (la dirección de la web).</p>
              {(v.blocks as { title: string; body: string }[]).map((b, i) => (
                <div key={i} className="flex flex-col gap-2.5 rounded-md border border-line-soft p-3.5">
                  <div className="flex items-center justify-between">
                    <span className={`${mono} text-muted`}>{String(i + 1).padStart(2, "0")}</span>
                    <span className="flex">
                      <BlockBtn label="Subir" disabled={i === 0} onClick={() => set("blocks", swap(v.blocks, i, i - 1))}>
                        ↑
                      </BlockBtn>
                      <BlockBtn label="Bajar" disabled={i === v.blocks.length - 1} onClick={() => set("blocks", swap(v.blocks, i, i + 1))}>
                        ↓
                      </BlockBtn>
                      <BlockBtn label="Quitar apartado" onClick={() => set("blocks", v.blocks.filter((_, j) => j !== i))}>
                        ✕
                      </BlockBtn>
                    </span>
                  </div>
                  <TextInput aria-label={`Título del apartado ${i + 1}`} value={b.title} placeholder="1. Responsable del tratamiento" onChange={(e) => set("blocks", v.blocks.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                  <TextArea aria-label={`Texto del apartado ${i + 1}`} rows={5} value={b.body} onChange={(e) => set("blocks", v.blocks.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))} />
                </div>
              ))}
              <AButton size="sm" onClick={() => set("blocks", [...v.blocks, { title: "", body: "" }])} className="self-start">
                + Añadir apartado
              </AButton>
            </fieldset>
          )}
          {!legal && <SectionsEditor blocks={v.blocks} onChange={(b) => set("blocks", b)} />}
        </Card>
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4">
            <span className={`${mono} text-muted`}>SEO de esta página</span>
            <Field label="Título en Google" count={v.seo_title.length} max={60} htmlFor="pg-seo">
              <TextInput id="pg-seo" value={v.seo_title} onChange={(e) => set("seo_title", e.target.value)} invalid={v.seo_title.length > 60} />
            </Field>
            <Field label="Descripción en Google" count={v.seo_description.length} max={160} htmlFor="pg-seod">
              <TextArea id="pg-seod" rows={2} value={v.seo_description} onChange={(e) => set("seo_description", e.target.value)} invalid={v.seo_description.length > 160} />
            </Field>
            <GooglePreview host={host} path={`/${page.slug}`} title={v.seo_title || v.title.replace(/\*/g, "")} description={v.seo_description || v.intro} />
            <MediaPicker label="Imagen para compartir · opcional" kind="image" value={v.og_media_id} onChange={(id) => set("og_media_id", id)} aspect="1200 / 630" />
          </Card>
          <SaveBar dirty={ed.dirty} busy={busy} onSave={() => save(false)} onPublish={canPublish ? () => save(true) : undefined} note={canPublish ? undefined : "Un administrador publicará los cambios."} />
        </div>
      </div>
    </div>
  );
}

function swap<T>(list: T[], i: number, j: number) {
  const next = list.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function BlockBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className="flex h-8 w-8 items-center justify-center rounded text-[12px] text-muted hover:bg-[#1F1F1F] hover:text-bone disabled:opacity-30">
      {children}
    </button>
  );
}
