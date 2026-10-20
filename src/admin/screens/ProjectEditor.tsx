"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { deleteProject, saveProject, type ProjectInput } from "@/admin/actions/projects";
import { publishSite } from "@/admin/actions/publish";
import { clearBackup, readBackup, useUndoable } from "@/admin/editor";
import { slugify } from "@/admin/format";
import { MediaPicker, MediaPickerModal, MediaThumb, useLibrary } from "@/admin/media/library";
import { useFeedback } from "@/admin/ui/feedback";
import { useLaunchGuard } from "@/admin/ui/LaunchGuard";
import { AButton, Card, Field, Segmented, Switch, TextArea, TextInput } from "@/admin/ui/kit";
import { mono } from "@/admin/ui/styles";

const CATEGORIES = ["Web", "Audiovisual", "Web + Audiovisual"] as const;


/** Editor de un proyecto (ROWE Admin · Proyectos → editar). */
export function ProjectEditor({ id, initial, isAdmin, isPlaceholder }: { id: string | null; initial: ProjectInput; isAdmin: boolean; isPlaceholder?: boolean }) {
  const key = `project:${id ?? "nuevo"}`;
  const ed = useUndoable<ProjectInput>(initial, key);
  const p = ed.state;
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const launchGuard = useLaunchGuard();
  const [busy, start] = useTransition();
  const [backup, setBackup] = useState<ProjectInput | null>(null);
  // En un proyecto nuevo la dirección sigue al título hasta que se toca a mano
  const [slugTouched, setSlugTouched] = useState(Boolean(id));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- comprobar una copia local al abrir el proyecto
    setBackup(readBackup(key, initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = <K extends keyof ProjectInput>(k: K, v: ProjectInput[K]) => ed.set((s) => ({ ...s, [k]: v }));
  const setTitle = (title: string) => ed.set((s) => ({ ...s, title, slug: slugTouched ? s.slug : slugify(title) }));

  const save = (publish: boolean) =>
    start(async () => {
      const value: ProjectInput = { ...p, status: publish ? "publicado" : p.status, metrics: p.metrics.filter((m) => m.value.trim() || m.label.trim()) };
      const res = await saveProject(id, value);
      if (!res.ok) return toast(res.error, "error");
      ed.commit({ ...value, metrics: p.metrics });
      clearBackup(key);
      if (publish && (await launchGuard()) === "review") toast("Guardado en el borrador. Sin publicar la web: revisa la lista de lanzamiento.");
      else if (publish) {
        const pub = await publishSite(`Proyecto «${value.title}»`);
        toast(pub.ok ? "Publicado. Ya aparece en la web." : pub.error, pub.ok ? "ok" : "error");
      } else toast(id ? "Borrador guardado" : "Proyecto creado como borrador");
      if (!id && res.data) router.replace(`/admin/proyectos/${res.data.id}`);
    });

  const remove = async () => {
    if (!id) return router.push("/admin/proyectos");
    const ok = await confirm({ title: "¿Eliminar este proyecto?", body: "Desaparecerá del portfolio y de la web al publicar. Podrás recuperarlo desde Historial.", cta: "Eliminar", danger: true });
    if (!ok) return;
    start(async () => {
      const res = await deleteProject(id);
      if (!res.ok) return toast(res.error, "error");
      clearBackup(key);
      ed.commit(p);
      toast("Proyecto eliminado");
      router.push("/admin/proyectos");
    });
  };

  const seoLen = p.seo_title.length;
  const descLen = p.seo_description.length;

  return (
    <div className="toast-in flex max-w-[1240px] flex-col gap-5">
      <Link href="/admin/proyectos" className="flex min-h-8 items-center self-start text-[14px] text-muted hover:text-bone">
        ← Proyectos
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <h1 className="headline-serif text-[40px] leading-none">{p.title || "Nuevo proyecto"}</h1>
        <Segmented
          label="Estado"
          value={p.status}
          onChange={(v) => set("status", v)}
          options={[
            { value: "borrador", label: "Borrador" },
            { value: "publicado", label: "Publicado" },
          ]}
        />
      </div>

      {backup && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line-dashed px-4 py-3 text-[13px]">
          <span>Tienes cambios sin guardar de una sesión anterior en este proyecto.</span>
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
      {isPlaceholder && <p className="rounded-md border border-line-dashed px-4 py-3 text-[13px] text-muted">Es un proyecto de ejemplo. Sustitúyelo por un caso real o elimínalo antes del lanzamiento.</p>}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] items-start gap-4">
        <Card className="flex flex-col gap-[18px]">
          <Field label="Título" htmlFor="pj-title">
            <TextInput id="pj-title" value={p.title} placeholder="Nombre del proyecto" onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Dirección" htmlFor="pj-slug" hint={`Se verá en /proyectos/${p.slug || "…"}`}>
            <TextInput
              id="pj-slug"
              monospace
              value={p.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugify(e.target.value.replace(/\s/g, "-")) + (e.target.value.endsWith("-") ? "-" : ""));
              }}
            />
          </Field>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3.5">
            <Field label="Cliente" htmlFor="pj-client">
              <TextInput id="pj-client" value={p.client} onChange={(e) => set("client", e.target.value)} />
            </Field>
            <Field label="Sector" htmlFor="pj-sector">
              <TextInput id="pj-sector" value={p.sector} onChange={(e) => set("sector", e.target.value)} />
            </Field>
            <Field label="Año" htmlFor="pj-year">
              <TextInput
                id="pj-year"
                monospace
                inputMode="numeric"
                value={p.year ?? ""}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                  set("year", digits ? Number(digits) : null);
                }}
              />
            </Field>
          </div>
          <div className="flex flex-col gap-2">
            <span className={`${mono} text-muted`}>Categoría</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Categoría">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={p.category === c}
                  onClick={() => set("category", c)}
                  className={`flex h-9 items-center rounded-full border px-3.5 text-[13px] transition-colors ${p.category === c ? "border-bone bg-bone text-ink" : "border-line-strong text-muted hover:text-bone"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <Field label="Resumen" htmlFor="pj-summary" count={p.summary.length} max={200} hint="Una frase para la tarjeta del portfolio.">
            <TextArea id="pj-summary" rows={2} value={p.summary} onChange={(e) => set("summary", e.target.value)} invalid={p.summary.length > 200} />
          </Field>
          {(
            [
              ["challenge", "Reto"],
              ["solution", "Solución"],
              ["result", "Resultado"],
            ] as const
          ).map(([k, label]) => (
            <Field key={k} label={label} htmlFor={`pj-${k}`}>
              <TextArea id={`pj-${k}`} rows={3} value={p[k]} onChange={(e) => set(k, e.target.value)} />
            </Field>
          ))}
          <div className="flex flex-col gap-2">
            <span className={`${mono} text-muted`}>Resultado en cifras</span>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2">
              {p.metrics.map((m, i) => (
                <div key={i} className="relative flex flex-col gap-1.5">
                  <input
                    aria-label={`Cifra ${i + 1}`}
                    value={m.value}
                    placeholder="+38 %"
                    onChange={(e) => set("metrics", p.metrics.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                    className="h-11 w-full rounded-md border border-line bg-surface-2 px-3 font-serif text-[22px] text-bone outline-none placeholder:text-dim focus:border-bone"
                  />
                  <input
                    aria-label={`Texto de la cifra ${i + 1}`}
                    value={m.label}
                    placeholder="citas online"
                    onChange={(e) => set("metrics", p.metrics.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                    className="h-[34px] w-full border-b border-line-strong bg-transparent text-[12px] text-muted outline-none placeholder:text-dim focus:border-bone"
                  />
                  {p.metrics.length > 1 && (
                    <button type="button" onClick={() => set("metrics", p.metrics.filter((_, j) => j !== i))} aria-label={`Quitar cifra ${i + 1}`} className="absolute right-1.5 top-1.5 text-[11px] text-dim hover:text-rec">
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {p.metrics.length < 6 && (
              <button type="button" onClick={() => set("metrics", [...p.metrics, { value: "", label: "" }])} className="self-start text-[13px] text-muted hover:text-bone">
                + Añadir cifra
              </button>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3.5">
            <MediaPicker label="Portada · 2.39:1" kind="image" value={p.cover_id} onChange={(v) => set("cover_id", v)} aspect="2.39 / 1" />
            <MediaPicker label="Vídeo del proyecto · opcional" kind="video" value={p.video_id} onChange={(v) => set("video_id", v)} aspect="16 / 9" />
            <Gallery value={p.gallery} onChange={(g) => set("gallery", g)} />
          </Card>
          <Card className="flex flex-col gap-3.5">
            <span className={`${mono} text-muted`}>SEO de este proyecto</span>
            <Field label="Título en Google" htmlFor="pj-seo" count={seoLen} max={60} hint={p.seo_title ? undefined : `Vacío = «${p.title || "Título"} — ROWE»`}>
              <TextInput id="pj-seo" value={p.seo_title} onChange={(e) => set("seo_title", e.target.value)} invalid={seoLen > 60} />
            </Field>
            <Field label="Descripción en Google" htmlFor="pj-seo-d" count={descLen} max={160} hint={p.seo_description ? undefined : "Vacío = el resumen"}>
              <TextArea id="pj-seo-d" rows={2} value={p.seo_description} onChange={(e) => set("seo_description", e.target.value)} invalid={descLen > 160} />
            </Field>
            <Field label="Enlace a la web del cliente" htmlFor="pj-url">
              <TextInput id="pj-url" monospace value={p.client_url} placeholder="https://" onChange={(e) => set("client_url", e.target.value.trim())} />
            </Field>
            <div className="flex items-center justify-between gap-4 pt-1">
              <span className="text-[14px]">Destacado en la home</span>
              <Switch checked={p.featured} onChange={(v) => set("featured", v)} label="Destacado en la home" />
            </div>
          </Card>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <button type="button" onClick={remove} className="min-h-10 text-[14px] text-muted hover:text-rec">
              {id ? "Eliminar proyecto" : "Descartar"}
            </button>
            <div className="flex flex-wrap items-center gap-2.5">
              {ed.dirty && <span className={`${mono} text-bone`}>● Sin guardar</span>}
              <AButton onClick={() => save(false)} loading={busy} disabled={Boolean(id) && !ed.dirty}>
                Guardar borrador
              </AButton>
              {isAdmin && (
                <AButton variant="primary" onClick={() => save(true)} loading={busy}>
                  Publicar
                </AButton>
              )}
            </div>
          </div>
          {!isAdmin && <p className="text-right text-[12px] text-muted">Un administrador publicará los cambios en la web.</p>}
        </div>
      </div>
    </div>
  );
}

function Gallery({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { byId } = useLibrary();
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const drop = (to: number) => {
    if (dragging === null || dragging === to) return setDragging(null);
    const next = value.slice();
    const [item] = next.splice(dragging, 1);
    next.splice(to, 0, item);
    setDragging(null);
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <span className={`${mono} text-muted`}>Galería · {value.length}</span>
        <span className="font-mono text-[10px] tracking-[0.08em] text-muted">Arrastra para reordenar</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {value.map((id, i) => (
          <div
            key={id}
            draggable
            onDragStart={() => setDragging(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => drop(i)}
            onDragEnd={() => setDragging(null)}
            className={`group relative cursor-grab ${dragging === i ? "opacity-40" : ""}`}
          >
            <MediaThumb media={byId(id)} aspect="4 / 5" className="w-full" />
            <span className="absolute left-1.5 top-1.5 font-mono text-[9px] text-muted">{String(i + 1).padStart(2, "0")}</span>
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== id))}
              aria-label={`Quitar imagen ${i + 1}`}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/80 text-[10px] text-bone opacity-0 transition-opacity hover:text-rec focus-visible:opacity-100 group-hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Añadir imagen a la galería"
          className="flex aspect-[4/5] items-center justify-center rounded border border-dashed border-line-dashed text-[20px] text-muted transition-colors hover:border-bone hover:text-bone"
        >
          +
        </button>
      </div>
      {open && (
        <MediaPickerModal
          kind="image"
          aspect="4 / 5"
          onClose={() => setOpen(false)}
          onPick={(id) => {
            if (!value.includes(id)) onChange([...value, id]);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
