"use client";

import { supabaseBrowser } from "@/lib/supabase/browser";
import { supabaseConfig } from "@/lib/site";

export interface MediaRow {
  id: string;
  bucket: string;
  path: string;
  file_name: string;
  mime: string;
  kind: "image" | "video" | "audio" | "other";
  size_bytes: number;
  width: number | null;
  height: number | null;
  duration_s: number | null;
  alt: string;
  blur_data_url: string | null;
  poster_id: string | null;
  created_at: string;
}

/** Tipos admitidos (los mismos que acepta el bucket «media»). */
export const ACCEPT: Record<string, MediaRow["kind"]> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/avif": "image",
  "video/mp4": "video",
  "video/webm": "video",
  "audio/mpeg": "audio",
  "audio/mp4": "audio",
};
export const MAX_BYTES = 20 * 1024 * 1024;
const MAX_SIDE = 2560;

export class UploadError extends Error {}

export function mediaPublicUrl(m: Pick<MediaRow, "bucket" | "path">) {
  return `${supabaseConfig.url}/storage/v1/object/public/${m.bucket}/${m.path}`;
}

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "archivo";

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new UploadError("No se pudo procesar la imagen"))), type, quality));
}

/** Imagen: reduce a 2560 px como máximo y pasa a WebP (se queda con el original si ya era más ligero). */
async function optimizeImage(file: File) {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new UploadError(`No se puede leer «${file.name}». ¿Está dañada?`);
  });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  let blob: Blob = file;
  let mime = file.type;
  if (file.type !== "image/avif") {
    const webp = await canvasBlob(canvas, "image/webp", 0.82);
    if (webp.type === "image/webp" && (webp.size < file.size || scale < 1)) {
      blob = webp;
      mime = "image/webp";
    }
  }
  // Miniatura difuminada (placeholder mientras carga)
  const tiny = document.createElement("canvas");
  tiny.width = 16;
  tiny.height = Math.max(1, Math.round((16 * h) / w));
  tiny.getContext("2d")!.drawImage(bitmap, 0, 0, tiny.width, tiny.height);
  const blur = tiny.toDataURL("image/webp", 0.5);
  bitmap.close();
  return { blob, mime, width: w, height: h, blur };
}

/** Vídeo: dimensiones, duración y un fotograma como póster. */
async function inspectVideo(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new UploadError(`No se puede leer el vídeo «${file.name}». Usa MP4 (H.264) o WebM.`));
    });
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    video.currentTime = Math.min(1, duration / 3);
    await new Promise<void>((resolve) => (video.onseeked = () => resolve()));
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    const poster = await canvasBlob(canvas, "image/webp", 0.8);
    return { width: video.videoWidth, height: video.videoHeight, duration, poster };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Subida a Storage con progreso real (XMLHttpRequest). */
async function putObject(path: string, body: Blob, mime: string, onProgress?: (p: number) => void) {
  const { data } = await supabaseBrowser().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new UploadError("Tu sesión ha caducado. Vuelve a entrar.");
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${supabaseConfig.url}/storage/v1/object/media/${path}`);
    xhr.setRequestHeader("authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", supabaseConfig.publishableKey);
    xhr.setRequestHeader("content-type", mime);
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () =>
      xhr.status < 300 ? resolve() : reject(new UploadError(xhr.status === 413 ? "El archivo es demasiado grande." : `No se pudo subir (error ${xhr.status}).`));
    xhr.onerror = () => reject(new UploadError("Se ha cortado la conexión al subir. Inténtalo de nuevo."));
    xhr.send(body);
  });
}

async function insertRow(row: Omit<MediaRow, "id" | "created_at" | "bucket">): Promise<MediaRow> {
  const { data, error } = await supabaseBrowser().from("media").insert(row).select("*").single();
  if (error) {
    await supabaseBrowser().storage.from("media").remove([row.path]);
    throw new UploadError(/permission|row-level/i.test(error.message) ? "No tienes permiso para subir archivos." : "No se pudo registrar el archivo.");
  }
  return data as MediaRow;
}

/** Valida, optimiza y sube un archivo. Devuelve el registro creado en la biblioteca. */
export async function uploadMedia(file: File, onProgress?: (p: number) => void): Promise<MediaRow & { posterRow?: MediaRow }> {
  const kind = ACCEPT[file.type];
  if (!kind) throw new UploadError(`«${file.name}»: formato no admitido. Usa JPG, PNG, WEBP, AVIF, MP4, WEBM o MP3.`);
  if (file.size > MAX_BYTES && kind !== "image") throw new UploadError(`«${file.name}» pesa más de 20 MB. Comprímelo antes de subirlo.`);

  const base = slug(file.name.replace(/\.[^.]+$/, ""));
  const now = new Date();
  const folder = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 8);

  if (kind === "image") {
    const img = await optimizeImage(file);
    if (img.blob.size > MAX_BYTES) throw new UploadError(`«${file.name}» sigue pesando más de 20 MB tras optimizarla.`);
    const ext = img.mime === "image/webp" ? "webp" : file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${folder}/${base}-${rand}.${ext}`;
    await putObject(path, img.blob, img.mime, onProgress);
    return insertRow({ path, file_name: `${base}.${ext}`, mime: img.mime, kind, size_bytes: img.blob.size, width: img.width, height: img.height, duration_s: null, alt: "", blur_data_url: img.blur, poster_id: null });
  }

  if (kind === "video") {
    const info = await inspectVideo(file);
    const ext = file.type === "video/webm" ? "webm" : "mp4";
    const path = `${folder}/${base}-${rand}.${ext}`;
    // Póster primero (pequeño), luego el vídeo con su progreso
    const posterPath = `${folder}/${base}-${rand}-poster.webp`;
    await putObject(posterPath, info.poster, "image/webp");
    const poster = await insertRow({ path: posterPath, file_name: `${base}-poster.webp`, mime: "image/webp", kind: "image", size_bytes: info.poster.size, width: null, height: null, duration_s: null, alt: "", blur_data_url: null, poster_id: null });
    await putObject(path, file, file.type, onProgress);
    const row = await insertRow({ path, file_name: `${base}.${ext}`, mime: file.type, kind, size_bytes: file.size, width: info.width || null, height: info.height || null, duration_s: info.duration ? Math.round(info.duration * 100) / 100 : null, alt: "", blur_data_url: null, poster_id: poster.id });
    return { ...row, posterRow: poster };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${folder}/${base}-${rand}.${ext}`;
  await putObject(path, file, file.type, onProgress);
  return insertRow({ path, file_name: `${base}.${ext}`, mime: file.type, kind, size_bytes: file.size, width: null, height: null, duration_s: null, alt: "", blur_data_url: null, poster_id: null });
}
