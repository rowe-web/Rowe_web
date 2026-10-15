import Image from "next/image";
import type { MediaItem } from "@/lib/content/types";
import { mediaUrl } from "@/lib/content/settings";
import { supabaseConfig } from "@/lib/site";
import { CornerMarks } from "@/components/ui/CornerMarks";

interface MediaFrameProps {
  media?: MediaItem | null;
  poster?: MediaItem | null;
  /** Relación de aspecto CSS: "2.39 / 1", "4 / 5", "9 / 16"… Omitir para llenar el contenedor. */
  aspect?: string;
  /** Texto del placeholder mientras no haya medio: «[ Vídeo · Showreel · 2.39:1 · sustituir ]». */
  placeholder?: string;
  marks?: boolean | number;
  /** Cursor personalizado al pasar por encima (data-cursor): «▶ Ver», «Ver proyecto»… */
  cursor?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Imagen o vídeo con el tratamiento del diseño (velo oscuro, marcas de encuadre).
 * Sin medio subido muestra el placeholder rayado del diseño, sustituible desde el panel.
 * Los vídeos llevan siempre póster, van en silencio y no se descargan hasta verse.
 */
export function MediaFrame({
  media,
  poster,
  aspect,
  placeholder = "[ Imagen · sustituir ]",
  marks = false,
  cursor,
  sizes = "100vw",
  priority = false,
  className = "",
  children,
}: MediaFrameProps) {
  const url = (m: MediaItem) => mediaUrl(supabaseConfig.url, m.bucket, m.path);
  const markSize = typeof marks === "number" ? marks : 22;

  return (
    <div
      className={`relative overflow-hidden ${media ? "bg-ph" : "media-placeholder"} ${className}`}
      style={aspect ? { aspectRatio: aspect } : undefined}
      data-cursor={cursor}
    >
      {media?.kind === "video" ? (
        <video
          data-autoplay
          className="absolute inset-0 h-full w-full object-cover"
          muted
          loop
          playsInline
          preload="none"
          poster={poster ? url(poster) : undefined}
          aria-label={media.alt || undefined}
        >
          <source src={url(media)} type={media.mime} />
        </video>
      ) : media?.kind === "image" ? (
        <Image
          src={url(media)}
          alt={media.alt}
          fill
          sizes={sizes}
          priority={priority}
          placeholder={media.blur_data_url ? "blur" : "empty"}
          blurDataURL={media.blur_data_url ?? undefined}
          className="object-cover"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center p-4 text-center label-mono text-[10px] text-muted">
          {placeholder}
        </span>
      )}
      {marks && <CornerMarks size={markSize} inset={Math.max(10, Math.round(markSize * 0.8))} />}
      {children}
    </div>
  );
}
