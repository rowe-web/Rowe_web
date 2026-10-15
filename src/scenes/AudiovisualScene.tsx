import { Button } from "@/components/ui/Button";
import { RecDot } from "@/components/ui/RecDot";
import { RichText } from "@/components/ui/RichText";
import { MediaFrame } from "@/components/scene/MediaFrame";
import { SceneHeader } from "@/components/scene/SceneHeader";
import { getMedia, type SceneProps } from "./types";

interface AudiovisualData {
  reels?: { label: string; duration: string; sector: string; media_id?: string | null; poster_id?: string | null }[];
  formats?: string[];
}

/**
 * Escena 04 · Producción audiovisual — diseño nuevo siguiendo el sistema.
 * Tres reels verticales 9:16 con sobreimpresión de cámara (REC + timecode),
 * escalonados y con parallax a distinta velocidad. En móvil: fila deslizable
 * con scroll horizontal nativo (no bloquea el scroll vertical).
 */
export function AudiovisualScene({ scene, site }: SceneProps<AudiovisualData>) {
  const d = scene.data;
  const reels = d.reels ?? [];
  const offsets = ["md:mt-[14vh]", "md:mt-0", "md:mt-[22vh]"];
  const speeds = ["0.08", "-0.06", "0.14"];

  return (
    <section id="audiovisual" data-scene="audiovisual" className="relative overflow-hidden py-[clamp(88px,13vh,140px)]">
      <div className="gutter-x">
        <SceneHeader kicker={scene.kicker} meta={["Reels · Vídeo · Foto"]} />
        <div className="mt-12 flex flex-wrap items-end justify-between gap-8 md:mt-[9vh]">
          <h2 data-reveal="mask" className="headline max-w-[12ch] text-[clamp(48px,12.5vw,64px)] md:text-[clamp(64px,8.3vw,128px)]">
            <RichText text={scene.title} />
          </h2>
          <div data-reveal className="flex max-w-[40ch] flex-col gap-6 pb-3">
            <p className="text-[17px] leading-relaxed text-muted md:text-[18px]">{scene.body}</p>
            {scene.cta_label && (
              <Button variant="link" href={scene.cta_href || "/audiovisual"} arrow="→" className="self-start">
                {scene.cta_label}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div
        data-reels
        className="mt-14 flex snap-x snap-mandatory gap-3 overflow-x-auto gutter-x pb-4 [scrollbar-width:none] md:mt-[8vh] md:grid md:snap-none md:grid-cols-3 md:gap-[3vw] md:overflow-visible md:px-[12vw] [&::-webkit-scrollbar]:hidden"
      >
        {reels.map((r, i) => (
          <figure key={r.label} data-parallax={speeds[i % 3]} className={`w-[62vw] shrink-0 snap-center md:w-auto ${offsets[i % 3]}`}>
            <MediaFrame
              media={getMedia(site, r.media_id)}
              poster={getMedia(site, r.poster_id)}
              aspect="9 / 16"
              marks={14}
              placeholder="[ Reel 9:16 · sustituir ]"
              sizes="(min-width:768px) 25vw, 62vw"
              cursor="▶ Ver"
            >
              <span className="absolute left-[9%] top-[5%] flex items-center gap-2 label-mono text-[9px] text-bone">
                <RecDot size={6} /> Rec
              </span>
              <span className="absolute right-[9%] top-[5%] label-mono text-[9px] tabular-nums text-muted">{r.duration}</span>
              <span className="absolute bottom-[5%] left-[9%] label-mono text-[9px] text-muted">9:16 · 25 fps</span>
            </MediaFrame>
            <figcaption className="mt-3 flex justify-between gap-3 label-mono text-[10px] text-muted">
              <span className="text-bone">{r.label}</span>
              <span>{r.sector}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      {d.formats && (
        <ul data-reveal className="mt-14 flex flex-wrap gap-x-10 gap-y-3 border-t border-line gutter-x pt-5 label-mono text-[10px] text-muted md:mt-[10vh] md:justify-between md:text-[11px]">
          {d.formats.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
