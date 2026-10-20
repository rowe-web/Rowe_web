import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { RichText } from "@/components/ui/RichText";
import { MediaFrame } from "@/components/scene/MediaFrame";
import { ProcessLoop, type ProcessStep } from "@/components/scene/ProcessLoop";
import { Timecode } from "@/components/scene/Timecode";
import { getSetting, emptyBrand, type BrandSettings } from "@/lib/content/settings";
import { SceneMotion } from "@/motion/SceneMotion";
import { getMedia, type SceneProps } from "./types";

interface HeroData {
  secondary_cta?: { label: string; href: string };
  reel_label?: string;
  sound_label?: string;
  scroll_hint?: string;
  photo_caption?: string;
  video_caption?: string;
  program_label?: string;
  format_label?: string;
  sequence_label?: string;
  /** Póster del vídeo del proceso (4:5). */
  photo_media_id?: string | null;
  /** Vídeo del proceso integral (web → contenido → tráfico), 4:5. Sin él, animación en bucle. */
  process_video_media_id?: string | null;
  process_steps?: ProcessStep[];
  tracks?: { key: string; label: string; clips: { label: string; href: string; size: number }[] }[];
}

/**
 * Escena 00 · Hero — mezcla (d):
 *  1c titular editorial + «Fig. 01» (vídeo del proceso ROWE: web → contenido → tráfico)
 *     + showreel pequeño «Fig. 02»
 *  1a el showreel crece con el scroll hasta el letterbox 2.39:1 a pantalla completa
 *  1b timecode del programa y pistas RO/WE con cabezal ligado al scroll
 */
export function HeroScene({ scene, site }: SceneProps<HeroData>) {
  const d = scene.data;
  const brand = getSetting<BrandSettings>(site, "brand", emptyBrand);
  const lines = scene.title.split("\n");
  const video = getMedia(site, scene.media_id);
  const poster = getMedia(site, scene.poster_id);
  const photo = getMedia(site, d.photo_media_id);
  const processVideo = getMedia(site, d.process_video_media_id);
  // Fig. 01: el vídeo del proceso si está subido (la foto hace de póster); si no, la animación
  const fig01 = (sizes: string, className = "", priority = false) =>
    processVideo ? (
      <MediaFrame media={processVideo} poster={photo} aspect="4 / 5" sizes={sizes} className={className} priority={priority} />
    ) : (
      <ProcessLoop steps={d.process_steps ?? []} className={className} />
    );
  const tracks = d.tracks ?? [];

  return (
    <section id="hero" data-scene="hero" className="relative">
      <SceneMotion name="hero" />
      {/* --- Plano 1 · Editorial (1c) --------------------------------------- */}
      <div data-hero-editorial className="relative flex min-h-screen-safe flex-col gutter-x pb-8 pt-[92px] md:pb-10 md:pt-[104px]">
        <div data-hero-intro className="flex justify-between gap-4 border-b border-line pb-3 label-mono text-[9px] text-muted md:text-[11px]">
          <span>{scene.kicker}</span>
          <span>{brand.tagline}</span>
          <span className="hidden md:inline">{brand.city}</span>
          <span className="hidden md:inline">{brand.year}</span>
        </div>

        <div className="relative mt-8 md:mt-12 md:flex-1">
          <h1 data-hero-title className="headline relative z-10 text-[clamp(44px,14.2vw,80px)] md:text-[clamp(72px,11.67vw,168px)]">
            {lines.map((line, i) => (
              <span key={i} className={`block whitespace-nowrap ${i === 1 ? "pl-[9vw] md:pl-[18.75vw]" : ""}`} style={{ clipPath: "inset(-40% -12% -0.16em -12%)" }} data-line>
                <span className="block" data-line-inner>
                  <RichText text={line} />
                </span>
              </span>
            ))}
          </h1>

          {/* Fig. 01 — proceso ROWE 4:5 (escritorio) */}
          <figure data-parallax="0.12" className="absolute right-0 top-[-8px] hidden w-[17.9vw] md:block">
            <figcaption data-hero-intro className="mb-2.5 text-right label-mono text-[10px] text-muted">{d.photo_caption}</figcaption>
            <div data-hero-intro>
              {fig01("18vw", "", true)}
            </div>
          </figure>
        </div>

        <div className="mt-8 grid gap-8 md:mt-10 md:grid-cols-[minmax(0,440px)_1fr_27.4vw] md:items-end md:gap-10">
          {/* Texto + CTAs */}
          <div data-hero-intro className="flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <p className="max-w-[44ch] text-[14px] leading-[1.55] text-muted md:text-[17px]">{scene.body}</p>
              {/* Fig. 01 en móvil, junto al texto */}
              {fig01("40vw", "w-[36%] shrink-0 md:hidden")}
            </div>
            <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:gap-7">
              {scene.cta_label && (
                <Button href={scene.cta_href || "#presupuesto"} size="md" className="sm:w-auto">
                  {scene.cta_label}
                </Button>
              )}
              {d.secondary_cta && (
                <Button variant="link" href={d.secondary_cta.href} arrow="→" className="self-start sm:self-auto">
                  {d.secondary_cta.label}
                </Button>
              )}
            </div>
          </div>

          {/* Leyenda + Desliza */}
          <div data-hero-intro className="flex items-end justify-between gap-6 md:h-full md:flex-col md:items-start md:justify-between md:pl-[4vw]">
            <p className="label-mono text-[10px] leading-[1.8] text-muted md:text-[11px]">
              {brand.legend.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </p>
            <div className="flex items-end gap-3" aria-hidden="true">
              <span className="block h-8 w-px bg-bone animate-drawy md:h-10" />
              <span className="label-mono text-[10px] text-muted md:text-[11px]">{d.scroll_hint}</span>
            </div>
          </div>

          {/* Fig. 02 — showreel pequeño: crecerá hasta el plano 2 */}
          <figure data-hero-intro className="hidden md:block">
            <a href="#hero-reel" data-hero-reel-source aria-label={`${d.reel_label} — ir a la proyección`} className="block">
              <MediaFrame media={video} poster={poster} aspect="2.39 / 1" marks={16} placeholder="" sizes="28vw" cursor="▶ Ver">
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bone px-4 py-2 label-mono text-[10px] text-ink">
                  ▶ {d.reel_label}
                </span>
              </MediaFrame>
            </a>
            <figcaption className="mt-2.5 label-mono text-[10px] text-muted">{d.video_caption}</figcaption>
          </figure>
        </div>
      </div>

      {/* --- Plano 2 · Proyección (1a) + mesa de montaje (1b) ----------------- */}
      <div id="hero-reel" data-hero-screening className="relative flex flex-col justify-center bg-black py-14 md:min-h-screen-safe md:py-0">
        <div className="relative w-full" data-hero-reel-target>
          <MediaFrame media={video} poster={poster} aspect="2.39 / 1" marks={24} placeholder="[ Vídeo · Showreel en loop · 2.39:1 · sustituir ]" sizes="100vw" cursor="▶ Ver">
            <div className="absolute inset-0 bg-ink/30" aria-hidden="true" />
            <span className="absolute left-[6vw] top-[7%] label-mono text-[9px] text-bone md:text-[11px]">{d.program_label}</span>
            <span className="absolute right-[6vw] top-[7%] hidden label-mono text-[11px] text-muted md:inline">{d.format_label}</span>
            <span data-sound-label={d.sound_label} className="absolute bottom-[7%] left-[6vw] label-mono text-[9px] text-muted md:text-[11px]">{d.sound_label}</span>
            <Timecode className="absolute bottom-[7%] right-[6vw] label-mono text-[9px] text-bone md:text-[11px]" />
          </MediaFrame>
        </div>

        {/* Línea de tiempo: RO y WE, con cabezal */}
        <div className="relative mt-8 border-t border-line bg-surface md:mt-10" data-hero-timeline>
          <div className="flex h-7 items-center justify-between border-b border-line gutter-x label-mono text-[9px] text-muted">
            <span>{d.sequence_label}</span>
            <span className="hidden sm:inline">In 00:00:00:00</span>
            <span className="hidden sm:inline">Out 00:01:24:00</span>
          </div>
          {tracks.map((track, ti) => {
            const total = track.clips.reduce((a, c) => a + c.size, 0);
            return (
              <div key={track.key} className="flex h-[50px] items-center gap-3 border-b border-line gutter-x md:h-[66px] md:gap-6">
                <div className="w-9 shrink-0 label-mono md:w-[110px]">
                  <span className="block text-[10px] md:text-[12px]">{track.key}</span>
                  <span className="hidden text-[9px] text-muted md:block">{track.label}</span>
                </div>
                <div className="flex h-8 min-w-0 flex-1 gap-1 md:h-12" {...(ti === 0 ? { "data-hero-track-area": "" } : {})}>
                  {track.clips.map((clip, i) => (
                    <Link
                      key={clip.label}
                      href={clip.href}
                      style={{ flexGrow: clip.size / total, flexBasis: 0 }}
                      className={`group/clip relative flex min-w-0 items-center gap-2.5 overflow-hidden rounded-[2px] border transition-colors duration-300 ${
                        track.key === "RO" ? "border-line-strong bg-surface-2" : "border-line-strong"
                      } ${i === 0 ? "border-line-cta" : ""} hover:border-bone`}
                    >
                      {track.key === "RO" && (
                        <span aria-hidden="true" className="h-full w-[52px] shrink-0 bg-[#242321] bg-[repeating-linear-gradient(135deg,rgb(237_234_228/0.06)_0_1px,transparent_1px_6px)] max-md:hidden" />
                      )}
                      <span className={`truncate px-2.5 label-mono text-[9px] ${track.key === "RO" ? "md:px-0" : "md:px-3"} ${i === 0 ? "text-bone" : "text-muted"} group-hover/clip:text-bone`}>
                        {clip.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
          {/* Cabezal (se desplaza con el scroll) */}
          <div aria-hidden="true" data-hero-playhead className="pointer-events-none absolute bottom-0 top-0 left-[calc(6vw+48px)] md:left-[calc(6vw+134px)]">
            <span className="absolute -left-[5px] top-0 h-[11px] w-[11px] bg-bone" />
            <span className="absolute left-0 top-0 h-full w-px bg-bone" />
          </div>
        </div>
      </div>
    </section>
  );
}
