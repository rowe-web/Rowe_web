"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { deleteMedia, saveMediaAlt } from "@/admin/actions/media";
import { bytes } from "@/admin/format";
import { MediaThumb, useLibrary } from "@/admin/media/library";
import { ACCEPT, mediaPublicUrl, uploadMedia, UploadError, type MediaRow } from "@/admin/media/upload";
import { useFeedback } from "@/admin/ui/feedback";
import { AButton, Card, PageTitle, Segmented, TextInput } from "@/admin/ui/kit";
import { mono } from "@/admin/ui/styles";

/** Plan gratuito de Supabase: 1 GB de almacenamiento. */
const STORAGE_LIMIT = 1024 * 1024 * 1024;
type Kind = "all" | "image" | "video" | "audio";

function dims(m: MediaRow) {
  return m.width && m.height ? `${m.width} × ${m.height}` : "—";
}
function dur(s: number | null) {
  return s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "";
}

/** Biblioteca de medios (ROWE Admin · Medios). */
export function MediaScreen({ usage }: { usage: Record<string, string[]> }) {
  const { media, add, remove, update } = useLibrary();
  const { toast, confirm } = useFeedback();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [queue, setQueue] = useState<{ name: string; progress: number }[]>([]);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const posterIds = new Set(media.map((m) => m.poster_id).filter(Boolean));
  const visible = media.filter((m) => !posterIds.has(m.id));
  const list = visible.filter((m) => (kind === "all" || m.kind === kind) && (!q || m.file_name.toLowerCase().includes(q.toLowerCase()) || m.alt.toLowerCase().includes(q.toLowerCase())));
  const used = media.reduce((a, m) => a + Number(m.size_bytes), 0);
  const sel = visible.find((m) => m.id === selected) ?? null;
  const usesOf = (m: MediaRow) => usage[m.id] ?? [];

  const uploadAll = async (files: File[]) => {
    if (!files.length) return;
    setQueue(files.map((f) => ({ name: f.name, progress: 0 })));
    let ok = 0;
    for (const [i, file] of files.entries()) {
      try {
        const row = await uploadMedia(file, (p) => setQueue((qq) => qq.map((x, j) => (j === i ? { ...x, progress: p } : x))));
        add(row);
        ok++;
        if (files.length === 1) setSelected(row.id);
      } catch (err) {
        toast(err instanceof UploadError ? err.message : `No se pudo subir «${file.name}».`, "error");
      }
      setQueue((qq) => qq.map((x, j) => (j === i ? { ...x, progress: 1 } : x)));
    }
    setQueue([]);
    if (ok) toast(ok === 1 ? "Archivo subido" : `${ok} archivos subidos`);
  };

  const removeSel = async (m: MediaRow) => {
    const uses = usesOf(m);
    const ok = await confirm({
      title: "¿Eliminar este archivo?",
      body: uses.length ? `Se está usando en: ${uses.join(", ")}. Esos sitios se quedarán sin imagen hasta que elijas otra.` : "No se usa en ningún sitio de la web.",
      cta: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    const res = await deleteMedia(m.id);
    if (!res.ok) return toast(res.error, "error");
    remove(m.id);
    setSelected(null);
    toast(res.data?.deferred ? "Archivo eliminado. Se borrará del todo al publicar." : "Archivo eliminado");
  };

  const current = queue.find((x) => x.progress < 1) ?? queue.at(-1);
  const pct = current ? Math.round(current.progress * 100) : 0;

  return (
    <div className="toast-in flex max-w-[1240px] flex-col gap-[18px]">
      <PageTitle
        title="Biblioteca de medios"
        subtitle={`${visible.length} archivos · ${bytes(used)} de 1 GB`}
        actions={
          <AButton variant="primary" onClick={() => input.current?.click()} className="!h-[42px] !px-5">
            Subir archivos
          </AButton>
        }
      />
      <div className="h-[3px] max-w-[420px] overflow-hidden rounded-sm bg-surface-2" aria-label={`Almacenamiento usado: ${Math.round((used / STORAGE_LIMIT) * 100)} %`}>
        <div className={`h-full ${used / STORAGE_LIMIT > 0.85 ? "bg-rec" : "bg-muted"}`} style={{ width: `${Math.min(100, (used / STORAGE_LIMIT) * 100)}%` }} />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar archivo" aria-label="Buscar archivo" className="!h-[42px] min-w-[200px] flex-1 !rounded-full !px-[18px]" />
        <Segmented
          label="Tipo"
          value={kind}
          onChange={setKind}
          options={[
            { value: "all", label: "Todo" },
            { value: "image", label: "Imágenes" },
            { value: "video", label: "Vídeos" },
            { value: "audio", label: "Audio" },
          ]}
        />
      </div>

      <input ref={input} type="file" multiple hidden accept={Object.keys(ACCEPT).join(",")} onChange={(e) => (uploadAll(Array.from(e.target.files ?? [])), (e.target.value = ""))} />
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          uploadAll(Array.from(e.dataTransfer.files));
        }}
        disabled={queue.length > 0}
        className={`flex flex-col items-center gap-2 rounded-lg border border-dashed p-[22px] text-center transition-colors ${over ? "border-bone bg-surface" : "border-line-dashed hover:border-bone hover:bg-surface"}`}
      >
        <span className="text-[15px]">Arrastra imágenes o vídeos aquí, o haz clic para elegir</span>
        <span className={`${mono} text-muted`}>JPG · PNG · WEBP · MP4 · máx. 20 MB</span>
        {current && (
          <span className="mt-1.5 flex w-[min(420px,100%)] flex-col gap-1.5" aria-live="polite">
            <span className="h-[3px] overflow-hidden rounded-sm bg-surface-2">
              <span className="block h-full bg-bone transition-[width] duration-100 ease-linear" style={{ width: `${pct}%` }} />
            </span>
            <span className="font-mono text-[10px] tracking-[0.08em] text-muted">
              Subiendo {current.name} · {pct} %{queue.length > 1 ? ` · ${queue.filter((x) => x.progress >= 1).length + 1} de ${queue.length}` : ""}
            </span>
          </span>
        )}
      </button>

      <div className={`grid items-start gap-4 ${sel ? "min-[900px]:grid-cols-[minmax(0,1fr)_300px]" : ""}`}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
          {list.map((m) => {
            const uses = usesOf(m);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelected(m.id === selected ? null : m.id)}
                aria-pressed={m.id === selected}
                className={`flex flex-col gap-2 rounded-lg border bg-surface p-2 text-left transition-colors ${m.id === selected ? "border-bone" : "border-line-faint hover:border-[rgb(237_234_228/0.4)]"}`}
              >
                <MediaThumb media={m} aspect="4 / 3" className="w-full" />
                <span className="truncate text-[12px]">{m.file_name}</span>
                <span className="font-mono text-[9px] tracking-[0.06em] text-muted">
                  {bytes(Number(m.size_bytes))} · {uses.length ? `En uso · ${uses.length}` : "Sin uso"}
                </span>
              </button>
            );
          })}
          {list.length === 0 && (
            <div className="col-span-full flex flex-col gap-2 py-10">
              <p className="headline-serif text-[28px]">
                {visible.length ? (
                  <>
                    Sin <em>resultados.</em>
                  </>
                ) : (
                  <>
                    Aún no hay <em>archivos.</em>
                  </>
                )}
              </p>
              <span className="text-[14px] text-muted">{visible.length ? "Prueba con otro nombre o quita el filtro de tipo." : "Sube las imágenes y vídeos de la web: sustituirán a los placeholders del diseño."}</span>
            </div>
          )}
        </div>
        {sel && <Detail key={sel.id} m={sel} uses={usesOf(sel)} onAlt={(alt) => update(sel.id, { alt })} onDelete={() => removeSel(sel)} />}
      </div>
    </div>
  );
}

function Detail({ m, uses, onAlt, onDelete }: { m: MediaRow; uses: string[]; onAlt: (alt: string) => void; onDelete: () => void }) {
  const { toast } = useFeedback();
  const [alt, setAlt] = useState(m.alt);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const url = mediaPublicUrl(m);

  const persist = useEffectEvent(async (value: string) => {
    setState("saving");
    const res = await saveMediaAlt(m.id, value);
    if (res.ok) {
      onAlt(value.trim());
      setState("saved");
    } else {
      setState("error");
      toast(res.error, "error");
    }
  });

  // Guardado automático del texto alternativo (0,8 s después de dejar de escribir)
  useEffect(() => {
    if (alt === m.alt) return;
    const t = setTimeout(() => persist(alt), 800);
    return () => clearTimeout(t);
  }, [alt, m.alt]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast("URL copiada");
    } catch {
      toast("No se pudo copiar. Selecciona y copia la dirección a mano.", "error");
    }
  };

  return (
    <Card className="toast-in flex flex-col gap-4 min-[900px]:sticky min-[900px]:top-4">
      {m.kind === "video" ? (
        <video src={url} controls preload="metadata" className="aspect-[4/3] w-full rounded bg-ph-2 object-contain" />
      ) : m.kind === "audio" ? (
        <audio src={url} controls className="w-full" />
      ) : (
        <MediaThumb media={m} aspect="4 / 3" className="w-full" />
      )}
      <span className="break-all text-[15px]">{m.file_name}</span>
      <dl className="flex flex-col border-t border-line-soft text-[13px]">
        {(
          [
            ["Dimensiones", dims(m)],
            ["Peso", bytes(Number(m.size_bytes))],
            ...(m.kind === "video" ? [["Duración", dur(m.duration_s) || "—"]] : []),
            ["Tipo", m.mime],
          ] as [string, string][]
        ).map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-line-faint py-2.5">
            <dt className="text-muted">{k}</dt>
            <dd className="font-mono text-[12px]">{v}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 border-b border-line-faint py-2.5">
          <dt className="text-muted">Usado en</dt>
          <dd className="text-right">{uses.length ? uses.join(", ") : "Ningún sitio"}</dd>
        </div>
      </dl>
      {m.kind !== "audio" && (
        <label className="flex flex-col gap-2">
          <span className={`${mono} flex justify-between text-muted`}>
            Texto alternativo
            <span className={state === "error" ? "text-rec" : ""}>{state === "saving" ? "Guardando…" : state === "saved" ? "Guardado" : state === "error" ? "Sin guardar" : ""}</span>
          </span>
          <TextInput value={alt} onChange={(e) => (setAlt(e.target.value), setState("idle"))} placeholder="Describe la imagen" maxLength={300} className="!h-[42px]" />
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        <AButton size="sm" onClick={copy}>
          Copiar URL
        </AButton>
        <button type="button" onClick={onDelete} className="flex h-[38px] items-center px-3 text-[13px] text-muted hover:text-rec">
          Eliminar
        </button>
      </div>
    </Card>
  );
}
