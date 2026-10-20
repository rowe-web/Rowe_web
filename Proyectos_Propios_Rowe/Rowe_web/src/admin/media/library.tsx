"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { useFeedback } from "@/admin/ui/feedback";
import { AButton, TextInput } from "@/admin/ui/kit";
import { mono } from "@/admin/ui/styles";
import { mediaPublicUrl, uploadMedia, UploadError, type MediaRow } from "./upload";

interface Library {
  media: MediaRow[];
  byId: (id: string | null | undefined) => MediaRow | null;
  add: (row: MediaRow & { posterRow?: MediaRow }) => void;
  remove: (id: string) => void;
  update: (id: string, patch: Partial<MediaRow>) => void;
}

const Ctx = createContext<Library | null>(null);

/** Biblioteca de medios compartida por los editores de una pantalla. */
export function MediaLibraryProvider({ initial, children }: { initial: MediaRow[]; children: ReactNode }) {
  const [media, setMedia] = useState(initial);
  const byId = (id: string | null | undefined) => (id ? (media.find((m) => m.id === id) ?? null) : null);
  const add = ({ posterRow, ...row }: MediaRow & { posterRow?: MediaRow }) => setMedia((m) => [row, ...(posterRow ? [posterRow] : []), ...m]);
  const remove = (id: string) => setMedia((m) => m.filter((x) => x.id !== id && !(m.find((y) => y.id === id)?.poster_id === x.id)));
  const update = (id: string, patch: Partial<MediaRow>) => setMedia((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  return <Ctx.Provider value={{ media, byId, add, remove, update }}>{children}</Ctx.Provider>;
}

export function useLibrary(): Library {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLibrary fuera de <MediaLibraryProvider>");
  return ctx;
}

/** Miniatura: imagen, póster del vídeo o el rayado del diseño. */
export function MediaThumb({ media, className = "", aspect }: { media: MediaRow | null; className?: string; aspect?: string }) {
  const lib = useContext(Ctx);
  const poster = media?.kind === "video" ? lib?.byId(media.poster_id) : null;
  const src = media?.kind === "image" ? mediaPublicUrl(media) : poster ? mediaPublicUrl(poster) : null;
  return (
    <span className={`relative block overflow-hidden rounded bg-ph-2 ${src ? "" : "media-placeholder"} ${className}`} style={aspect ? { aspectRatio: aspect } : undefined}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- miniatura del panel, sin optimizar a propósito
        <img src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {media?.kind === "video" && <span className="absolute bottom-1.5 left-2 font-mono text-[9px] text-bone">▶ {media.duration_s ? `${Math.floor(media.duration_s / 60)}:${String(Math.round(media.duration_s % 60)).padStart(2, "0")}` : ""}</span>}
      {media?.kind === "audio" && <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-muted">♪ Audio</span>}
    </span>
  );
}

/** Campo para elegir un medio de la biblioteca (o subir uno nuevo). */
export function MediaPicker({
  value,
  onChange,
  kind,
  label,
  hint,
  aspect = "16 / 10",
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  kind?: MediaRow["kind"];
  label: string;
  hint?: string;
  aspect?: string;
}) {
  const { byId } = useLibrary();
  const [open, setOpen] = useState(false);
  const current = byId(value);
  return (
    <div className="flex flex-col gap-2">
      <span className={`${mono} text-muted`}>{label}</span>
      <button type="button" onClick={() => setOpen(true)} className="group flex flex-col gap-2 rounded-md border border-dashed border-line-dashed p-2 text-left transition-colors hover:border-bone hover:bg-surface-3">
        <MediaThumb media={current} className="w-full" aspect={aspect} />
        <span className="flex items-center justify-between gap-2 px-1 pb-0.5">
          <span className="truncate font-mono text-[10px] tracking-[0.06em] text-muted">{current ? current.file_name : hint ?? "Sin elegir · placeholder del diseño"}</span>
          <span className="text-[12px] text-bone">{current ? "Cambiar" : "Elegir"}</span>
        </span>
      </button>
      {current && (
        <button type="button" onClick={() => onChange(null)} className="self-start text-[12px] text-muted hover:text-rec">
          Quitar
        </button>
      )}
      {open && <MediaPickerModal kind={kind} aspect={aspect} onClose={() => setOpen(false)} onPick={(id) => (onChange(id), setOpen(false))} />}
    </div>
  );
}

export function MediaPickerModal({ kind, onClose, onPick }: { kind?: MediaRow["kind"]; aspect: string; onClose: () => void; onPick: (id: string) => void }) {
  const { media, add } = useLibrary();
  const { toast } = useFeedback();
  const [q, setQ] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const posters = new Set(media.map((m) => m.poster_id).filter(Boolean));
  const list = media.filter((m) => (!kind || m.kind === kind) && !posters.has(m.id) && (!q || m.file_name.toLowerCase().includes(q.toLowerCase())));

  const upload = async (file: File) => {
    setProgress(0);
    try {
      const row = await uploadMedia(file, setProgress);
      add(row);
      toast("Archivo subido");
      onPick(row.id);
    } catch (err) {
      toast(err instanceof UploadError ? err.message : "No se pudo subir el archivo.", "error");
    } finally {
      setProgress(null);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Elegir archivo" onClick={onClose} className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgb(10_10_10/0.8)] p-4 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="toast-in flex max-h-[86vh] w-[min(860px,100%)] flex-col gap-4 overflow-hidden rounded-[10px] border border-line-strong bg-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="headline-serif mr-auto text-[28px] leading-none">
            Elegir <em>{kind === "video" ? "vídeo" : kind === "audio" ? "audio" : "imagen"}</em>
          </p>
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" aria-label="Buscar archivo" className="!h-10 max-w-[220px] !rounded-full" />
          <AButton variant="primary" size="sm" onClick={() => input.current?.click()} loading={progress !== null}>
            {progress !== null ? `Subiendo ${Math.round(progress * 100)} %` : "Subir nuevo"}
          </AButton>
          <input ref={input} type="file" hidden accept={kind === "video" ? "video/mp4,video/webm" : kind === "audio" ? "audio/mpeg,audio/mp4" : "image/jpeg,image/png,image/webp,image/avif"} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <button type="button" onClick={onClose} className="text-[14px] text-muted hover:text-bone">
            Cerrar
          </button>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5 overflow-y-auto pr-1">
          {list.length === 0 && <p className="col-span-full py-10 text-[14px] text-muted">No hay archivos de este tipo todavía. Sube el primero.</p>}
          {list.map((m) => (
            <button key={m.id} type="button" onClick={() => onPick(m.id)} className="flex flex-col gap-2 rounded-lg border border-line-soft p-2 text-left transition-colors hover:border-bone">
              <MediaThumb media={m} className="aspect-[4/3] w-full" />
              <span className="truncate text-[12px]">{m.file_name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
