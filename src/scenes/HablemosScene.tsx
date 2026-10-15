import { RecDot } from "@/components/ui/RecDot";
import { RichText } from "@/components/ui/RichText";
import { SceneHeader } from "@/components/scene/SceneHeader";
import { Timecode } from "@/components/scene/Timecode";
import { HablemosForm } from "@/features/hablemos/HablemosForm";
import { PrefillBox } from "@/features/hablemos/PrefillBox";
import { getHablemosSettings } from "@/features/hablemos/settings";
import { emptyContact, getSetting, type ContactSettings } from "@/lib/content/settings";
import type { SceneProps } from "./types";

/**
 * Escena 10 · Hablemos (ROWE Presupuesto.dc.html): cortinilla «wipe» con el timecode
 * y el título de la escena, y la sección con el formulario en 5 tomas.
 * Dentro de la sección el cursor entra en «modo REC».
 */
export function HablemosScene({ site }: SceneProps) {
  const s = getHablemosSettings(site);
  const contact = getSetting<ContactSettings>(site, "contact", emptyContact);
  return (
    <>
      <div
        data-reveal="wipe"
        aria-hidden="true"
        className="relative flex h-[42vh] min-h-[260px] items-center justify-center overflow-hidden border-y border-line bg-deep"
      >
        <span className="absolute inset-x-0 top-0 h-[10%] bg-black" />
        <span className="absolute inset-x-0 bottom-0 h-[10%] bg-black" />
        <span className="flex flex-col items-center gap-4 px-[6vw] text-center">
          <Timecode className="label-mono text-muted" />
          <RichText className="headline-serif text-[clamp(40px,6vw,96px)] leading-none" text={s.kicker.replace(/ — (.+)$/, " — *$1*")} />
        </span>
      </div>

      <section id="hablemos" data-scene="hablemos" className="relative gutter-x pb-[14vh] pt-[16vh]">
        <SceneHeader kicker={s.kicker} />
        <div className="mt-[9vh] flex flex-wrap items-start gap-[clamp(40px,6vw,110px)]">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-[34px]">
            <RecDot size={56} className="!h-[clamp(44px,5vw,72px)] !w-[clamp(44px,5vw,72px)]" />
            <h2 data-reveal="mask" className="headline-serif text-[clamp(56px,7.5vw,128px)] leading-[0.92]">
              <RichText text={s.title} />
            </h2>
            <p data-reveal className="max-w-[40ch] text-[19px] leading-relaxed text-muted">
              {s.lead}
            </p>
            <p data-reveal className="label-mono">
              {s.promise}
            </p>
            <PrefillBox settings={s} variant="section" />
          </div>
          <div className="min-w-0 flex-[1.25_1_520px]">
            <HablemosForm settings={s} contact={contact} variant="section" />
          </div>
        </div>
      </section>
    </>
  );
}
