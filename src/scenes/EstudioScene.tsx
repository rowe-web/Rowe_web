import { CornerMarks } from "@/components/ui/CornerMarks";
import { SplitWords } from "@/components/ui/SplitWords";
import { SceneHeader } from "@/components/scene/SceneHeader";
import { mediaUrl } from "@/lib/content/settings";
import { supabaseConfig } from "@/lib/site";
import styles from "./Estudio.module.css";
import { SceneMotion } from "@/motion/SceneMotion";
import { getMedia, type SceneProps } from "./types";

interface EstudioData {
  stats?: { value: string; label: string }[];
  tracks?: { key: string; word: string; label: string; hover: string }[];
  master?: { key: string; word: string; label: string };
  ro_media_id?: string | null;
}

/**
 * Escena 01 · El estudio — mezcla (d):
 *  1c manifiesto serif con cursivas, que se ilumina palabra a palabra (scroll pinneado)
 *  1b cabezal en el frente de lectura + mesa «Mezcla» V1/V2/Master + cifras en rejilla
 *  Hover «RO»: vídeo de rodaje dentro de las letras · Hover «WE»: web en movimiento
 */
export function EstudioScene({ scene, site, previewLit }: SceneProps<EstudioData> & { previewLit?: number }) {
  const d = scene.data;
  const manifesto = `${scene.title} ${scene.body}`.trim();
  const roVideo = getMedia(site, d.ro_media_id);
  const [ro, we] = d.tracks ?? [];

  return (
    <section id="estudio" data-scene="estudio" data-pin-container className="relative gutter-x py-[clamp(88px,13vh,140px)]">
      <SceneMotion name="estudio" />
      <SceneHeader kicker={scene.kicker} meta={["RO + WE = ROWE"]} />

      <div className="mt-12 grid gap-14 md:mt-[9vh] lg:grid-cols-[minmax(0,1fr)_minmax(300px,29vw)] lg:gap-[5vw]">
        <div className="flex flex-col justify-between gap-12">
          <p data-manifesto className="headline-serif text-[clamp(30px,8.4vw,40px)] leading-[1.08] text-bone [text-wrap:pretty] md:text-[clamp(40px,4.03vw,58px)]">
            <SplitWords text={manifesto} previewLit={previewLit} head />
          </p>

          <dl className="grid grid-cols-3 border-y border-line">
            {(d.stats ?? []).map((s, i) => (
              <div key={s.label} className={`flex flex-col gap-2 py-4 md:py-[22px] ${i > 0 ? "border-l border-line pl-3.5 md:pl-6" : ""}`}>
                <dt className="order-2 label-mono text-[9px] text-muted md:text-[11px]">{s.label}</dt>
                <dd data-count={s.value} className="order-1 font-mono text-[28px] leading-none tabular-nums md:text-[44px]">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Mesa «Mezcla» (1b) */}
        <div className="flex flex-col" aria-label="RO + WE = ROWE">
          <p className="pb-3.5 label-mono text-[10px] text-muted">Mezcla</p>

          {ro && (
            <div data-track="ro" data-scroll-active className={`${styles.ro} flex items-center gap-5 border-t border-line py-3 md:gap-6 md:py-4`}>
              <TrackLabel track={ro.key} label={ro.label} />
              <span className="relative inline-block px-3.5 py-1.5" data-cursor="Rodaje">
                <span className="relative block headline-serif text-[clamp(64px,17vw,112px)] leading-[0.9] lg:text-[clamp(72px,7.8vw,112px)]">
                  <span className="text-textured block">{ro.word}</span>
                  {/* Vídeo de rodaje dentro de las letras: texto hueso + vídeo en «multiply» sobre negro */}
                  {roVideo && (
                    <span aria-hidden="true" className={`${styles.roVideo} pointer-events-none absolute inset-0 bg-ink`}>
                      <span className="absolute inset-0 block text-bone">{ro.word}</span>
                      <video className="absolute inset-0 h-full w-full object-cover mix-blend-multiply" muted loop playsInline preload="none" data-hover-play>
                        <source src={mediaUrl(supabaseConfig.url, roVideo.bucket, roVideo.path)} type={roVideo.mime} />
                      </video>
                    </span>
                  )}
                </span>
                <CornerMarks size={14} color="#EDEAE4" />
              </span>
            </div>
          )}

          {we && (
            <div data-track="we" data-scroll-active className="group/we flex items-center gap-5 border-t border-line py-3 md:gap-6 md:py-4">
              <TrackLabel track={we.key} label={we.label} />
              <span
                className={`${styles.we} block px-3.5 py-1.5 headline-serif text-[clamp(64px,17vw,112px)] leading-[0.9] lg:text-[clamp(72px,7.8vw,112px)]`}
                data-cursor="Web"
              >
                {we.word}
              </span>
            </div>
          )}

          {d.master && (
            <div className="flex items-center gap-5 border-t border-bone py-3 md:gap-6 md:py-4">
              <TrackLabel track={d.master.key} label={`= ${d.master.word}`} />
              <span className="block px-3.5 py-1.5 headline-serif text-[clamp(64px,17vw,112px)] italic leading-[0.9] lg:text-[clamp(72px,7.8vw,112px)]">
                {d.master.word}
              </span>
            </div>
          )}

          <p className="pt-3 label-mono text-[10px] leading-[1.7] text-ghost max-lg:hidden">
            {ro && <span className="block">Hover «{ro.word}»: {ro.hover.toLowerCase()}</span>}
            {we && <span className="block">Hover «{we.word}»: {we.hover.toLowerCase()}</span>}
          </p>
        </div>
      </div>
    </section>
  );
}

function TrackLabel({ track, label }: { track: string; label: string }) {
  return (
    <div className="w-[60px] shrink-0 label-mono text-[9px] leading-[1.7] md:w-[90px] md:text-[10px]">
      <span className="block text-bone">{track}</span>
      <span className="block text-muted">{label}</span>
    </div>
  );
}
