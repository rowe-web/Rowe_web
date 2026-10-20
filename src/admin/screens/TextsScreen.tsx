"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { reorderScenes, saveScene, setSceneVisible, type SceneInput } from "@/admin/actions/content";
import { publishSite } from "@/admin/actions/publish";
import { clearBackup, readBackup, useEditor, useUndoable } from "@/admin/editor";
import { MediaPicker } from "@/admin/media/library";
import { useFeedback } from "@/admin/ui/feedback";
import { useLaunchGuard } from "@/admin/ui/LaunchGuard";
import { JsonFields, type Json } from "@/admin/ui/JsonFields";
import { AButton, Card, Field, PageTitle, Segmented, Switch, TextArea, TextInput } from "@/admin/ui/kit";
import { mono, visibleLength } from "@/admin/ui/styles";
import { RichText } from "@/components/ui/RichText";

export interface SceneRow extends SceneInput {
  id: string;
  key: string;
  position: number;
  visible: boolean;
}

/** Escenas cuyos textos principales se editan en Ajustes (configurador y formulario). */
const SETTINGS_OWNED: Record<string, string> = { presupuesto: "configurador", hablemos: "formulario" };

/** Textos y escenas (ROWE Admin · Textos). */
export function TextsScreen({ scenes: initial, initialKey, isAdmin }: { scenes: SceneRow[]; initialKey: string | null; isAdmin: boolean }) {
  const [scenes, setScenes] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setScenes(initial);
  }
  const [selected, setSelected] = useState(() => initial.find((s) => s.key === initialKey)?.id ?? initial[0]?.id);
  const [dragging, setDragging] = useState<string | null>(null);
  const { toast, confirm } = useFeedback();
  const { unsaved } = useEditor();
  const [, start] = useTransition();
  const current = scenes.find((s) => s.id === selected) ?? scenes[0];

  const select = async (id: string) => {
    if (id === selected) return;
    if (unsaved && !(await confirm({ title: "Tienes cambios sin guardar", body: "Guarda la escena actual como borrador antes de cambiar, o se perderán los cambios.", cta: "Cambiar sin guardar", danger: true }))) return;
    setSelected(id);
  };

  const persistOrder = (next: SceneRow[]) => {
    const prev = scenes;
    setScenes(next);
    start(async () => {
      const res = await reorderScenes(next.map((s) => s.id));
      if (res.ok) toast("Orden guardado en el borrador");
      else {
        setScenes(prev);
        toast(res.error, "error");
      }
    });
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= scenes.length) return;
    const next = scenes.slice();
    [next[i], next[j]] = [next[j], next[i]];
    persistOrder(next);
  };
  const drop = (targetId: string) => {
    if (!dragging || dragging === targetId) return;
    const next = scenes.filter((s) => s.id !== dragging);
    const idx = next.findIndex((s) => s.id === targetId);
    next.splice(idx, 0, scenes.find((s) => s.id === dragging)!);
    setDragging(null);
    persistOrder(next);
  };
  const toggle = (s: SceneRow) =>
    start(async () => {
      setScenes((list) => list.map((x) => (x.id === s.id ? { ...x, visible: !s.visible } : x)));
      const res = await setSceneVisible(s.id, !s.visible);
      if (res.ok) toast(`Escena ${s.visible ? "oculta" : "visible"} en el borrador`);
      else {
        setScenes((list) => list.map((x) => (x.id === s.id ? { ...x, visible: s.visible } : x)));
        toast(res.error, "error");
      }
    });

  return (
    <div className="toast-in flex max-w-[1240px] flex-col gap-5">
      <PageTitle title="Textos y escenas" subtitle="Muestra, oculta, reordena y edita cada escena de la home. Los cambios quedan en borrador hasta publicar." />
      <div className="grid items-start gap-4 min-[820px]:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <Card padded={false}>
          <ol aria-label="Escenas de la home">
            {scenes.map((s, i) => (
              <li
                key={s.id}
                draggable
                onDragStart={() => setDragging(s.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => drop(s.id)}
                onDragEnd={() => setDragging(null)}
                className={`flex items-center gap-2 border-b border-line-faint py-1.5 pl-3 pr-2 transition-colors ${s.id === current?.id ? "bg-surface-2" : ""} ${dragging === s.id ? "opacity-40" : ""}`}
              >
                <span className="cursor-grab font-mono text-[11px] tracking-[-0.1em] text-dim" aria-hidden="true">
                  ⋮⋮
                </span>
                <button type="button" onClick={() => select(s.id)} className={`flex min-h-10 min-w-0 flex-1 items-center gap-2.5 text-left ${s.visible ? "" : "opacity-40"}`}>
                  <span className="font-mono text-[10px] text-muted">{String(i).padStart(2, "0")}</span>
                  <span className="truncate text-[14px]">{s.name}</span>
                </button>
                <button type="button" onClick={() => move(i, -1)} aria-label={`Subir ${s.name}`} className="flex h-7 w-7 items-center justify-center rounded text-[12px] text-muted hover:bg-[#1F1F1F] hover:text-bone">
                  ↑
                </button>
                <button type="button" onClick={() => move(i, 1)} aria-label={`Bajar ${s.name}`} className="flex h-7 w-7 items-center justify-center rounded text-[12px] text-muted hover:bg-[#1F1F1F] hover:text-bone">
                  ↓
                </button>
                <Switch size="sm" checked={s.visible} onChange={() => toggle(s)} label={`${s.visible ? "Ocultar" : "Mostrar"} ${s.name}`} />
              </li>
            ))}
          </ol>
        </Card>
        {current && <SceneEditor key={current.id} scene={current} index={scenes.indexOf(current)} isAdmin={isAdmin} onSaved={(v) => setScenes((l) => l.map((s) => (s.id === current.id ? { ...s, ...v } : s)))} />}
      </div>
    </div>
  );
}

const editable = (s: SceneRow): SceneInput => ({
  name: s.name,
  kicker: s.kicker,
  title: s.title,
  body: s.body,
  cta_label: s.cta_label,
  cta_href: s.cta_href,
  media_id: s.media_id,
  poster_id: s.poster_id,
  data: s.data ?? {},
});

function SceneEditor({ scene, index, isAdmin, onSaved }: { scene: SceneRow; index: number; isAdmin: boolean; onSaved: (v: SceneInput) => void }) {
  const key = `scene:${scene.id}`;
  const ed = useUndoable<SceneInput>(editable(scene), key);
  const v = ed.state;
  const { toast } = useFeedback();
  const launchGuard = useLaunchGuard();
  const [pv, setPv] = useState<"desk" | "mob">("desk");
  const [saving, startSave] = useTransition();
  const [backup, setBackup] = useState<SceneInput | null>(null);
  const num = String(index).padStart(2, "0");
  const ownedBy = SETTINGS_OWNED[scene.key];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- comprobar una copia local al abrir la escena
    setBackup(readBackup(key, editable(scene)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = <K extends keyof SceneInput>(k: K, val: SceneInput[K]) => ed.set((s) => ({ ...s, [k]: val }));

  const save = (thenPublish = false) =>
    startSave(async () => {
      const res = await saveScene(scene.id, v);
      if (!res.ok) return toast(res.error, "error");
      ed.commit(v);
      onSaved(v);
      clearBackup(key);
      if (!thenPublish) return toast("Borrador guardado");
      if ((await launchGuard()) === "review") return toast("Guardado en el borrador. Sin publicar: revisa la lista de lanzamiento.");
      const pub = await publishSite(`Escena «${v.name}»`);
      toast(pub.ok ? "Publicado. La web ya muestra los cambios." : pub.error, pub.ok ? "ok" : "error");
    });

  const tCount = visibleLength(v.title);
  const bCount = visibleLength(v.body);

  return (
    <Card className="flex flex-col gap-[22px]">
      {backup && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line-dashed px-4 py-3 text-[13px]">
          <span>Tienes cambios sin guardar de una sesión anterior en esta escena.</span>
          <span className="flex gap-2">
            <AButton size="sm" variant="primary" onClick={() => (ed.set(backup), setBackup(null))}>
              Recuperar
            </AButton>
            <AButton size="sm" variant="ghost" onClick={() => (clearBackup(key), setBackup(null))}>
              Descartar
            </AButton>
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className={`${mono} text-muted`}>Escena {num}</span>
          <h2 className="headline-serif text-[32px] leading-none">{v.name}</h2>
        </div>
        <span className={`${mono} ${scene.visible ? "text-bone" : "text-muted"}`}>{scene.visible ? "Visible" : "Oculta"}</span>
      </div>

      {ownedBy && (
        <p className="rounded-md border border-line-strong px-4 py-3 text-[13px] leading-relaxed text-muted">
          En la web, el titular y los textos de esta escena salen de{" "}
          <Link href={`/admin/ajustes?tab=${ownedBy}`} className="border-b border-line-cta text-bone">
            Ajustes → {ownedBy === "configurador" ? "Configurador" : "Formulario «Hablemos»"}
          </Link>
          {ownedBy === "configurador" && " y los precios, de Precios"}. Aquí se gestiona su posición y visibilidad.
        </p>
      )}

      <Field label="Titular" count={tCount} max={60} hint="Recomendado: menos de 60 caracteres. *texto* = cursiva serif · salto de línea = nueva línea." htmlFor="sc-title">
        <TextArea id="sc-title" rows={2} value={v.title} onChange={(e) => set("title", e.target.value)} invalid={tCount > 60} />
      </Field>
      <Field label="Texto" count={bCount} max={220} htmlFor="sc-body">
        <TextArea id="sc-body" rows={3} value={v.body} onChange={(e) => set("body", e.target.value)} invalid={bCount > 220} />
      </Field>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        <Field label="Texto del botón" htmlFor="sc-cta">
          <TextInput id="sc-cta" value={v.cta_label} placeholder="Sin botón" onChange={(e) => set("cta_label", e.target.value)} />
        </Field>
        <Field label="Enlace" htmlFor="sc-href" hint="#presupuesto, #hablemos, /web, /proyectos…">
          <TextInput id="sc-href" monospace value={v.cta_href} placeholder="#contacto" onChange={(e) => set("cta_href", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        <MediaPicker label="Vídeo de fondo" kind="video" value={v.media_id} onChange={(id) => set("media_id", id)} aspect="16 / 9" />
        <MediaPicker label="Imagen de reserva · se ve mientras carga el vídeo" kind="image" value={v.poster_id} onChange={(id) => set("poster_id", id)} aspect="16 / 9" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={`${mono} text-muted`}>Vista previa en vivo</span>
          <Segmented
            size="sm"
            label="Vista previa"
            value={pv}
            onChange={setPv}
            options={[
              { value: "desk", label: "Escritorio" },
              { value: "mob", label: "Móvil" },
            ]}
          />
        </div>
        <div className="flex justify-center rounded-md border border-line-soft bg-deep p-5">
          <div
            className="flex max-w-full flex-col justify-center gap-3 overflow-hidden border border-line bg-ink transition-[width] duration-500 ease-[var(--ease-cut)]"
            style={{ width: pv === "desk" ? "100%" : 220, aspectRatio: pv === "desk" ? "16 / 9" : "9 / 16", padding: pv === "desk" ? "6%" : 18 }}
          >
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted">
              Escena {num} — {v.name}
            </span>
            <RichText as="p" className="headline-serif leading-[0.95] [text-wrap:balance]" style={{ fontSize: pv === "desk" ? "clamp(22px,3vw,40px)" : 26 }} text={v.title} />
            <RichText as="p" className="line-clamp-3 max-w-[46ch] text-[11px] leading-normal text-muted" text={v.body} />
            {v.cta_label && <span className="flex h-[26px] items-center self-start rounded-full bg-bone px-3 text-[11px] text-ink">{v.cta_label}</span>}
          </div>
        </div>
      </div>

      {Object.keys(v.data).length > 0 && (
        <details className="group rounded-md border border-line-soft">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[14px]">
            Contenido avanzado de la escena
            <span className="text-muted transition-transform group-open:rotate-45">+</span>
          </summary>
          <div className="border-t border-line-soft p-4">
            <JsonFields value={v.data as Json} onChange={(d) => set("data", d as Record<string, unknown>)} />
          </div>
        </details>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line-soft pt-[18px]">
        {ed.dirty && <span className={`${mono} mr-auto text-bone`}>● Sin guardar</span>}
        <AButton onClick={() => save(false)} loading={saving} disabled={!ed.dirty}>
          Guardar borrador
        </AButton>
        <a href={`/vista-previa#${scene.key}`} target="_blank" rel="noopener" className="flex h-10 items-center px-3.5 text-[14px] text-muted hover:text-bone">
          Vista previa
        </a>
        {isAdmin && (
          <AButton variant="primary" onClick={() => save(true)} loading={saving}>
            {ed.dirty ? "Guardar y publicar" : "Publicar"}
          </AButton>
        )}
      </div>
    </Card>
  );
}
