import { RichText } from "@/components/ui/RichText";
import { SceneHeader } from "@/components/scene/SceneHeader";
import { Configurator } from "@/features/configurator/Configurator";
import { getConfiguratorSettings } from "@/features/configurator/settings";
import { emptyContact, getSetting, hasRealValue, type ContactSettings } from "@/lib/content/settings";
import { siteHost } from "@/lib/site";
import type { SceneProps } from "./types";

/** Escena 09 · Tu presupuesto (ROWE Presupuesto.dc.html). */
export function PresupuestoScene({ site }: SceneProps) {
  const s = getConfiguratorSettings(site);
  const contact = getSetting<ContactSettings>(site, "contact", emptyContact);
  return (
    <section id="presupuesto" data-scene="presupuesto" className="relative gutter-x pb-[120px] pt-[clamp(110px,15vh,150px)]">
      <SceneHeader kicker={s.kicker} meta={[s.meta]} />
      <div className="mt-[9vh] flex flex-wrap items-end justify-between gap-10">
        <h2 data-reveal="mask" className="headline text-[clamp(56px,10vw,168px)]">
          <RichText text={s.title} />
        </h2>
        <div data-reveal className="flex max-w-[390px] flex-col gap-[18px] pb-4">
          <p className="text-[18px] leading-relaxed text-muted">{s.lead}</p>
          <p className="label-mono">{s.promise}</p>
        </div>
      </div>
      <Configurator config={site.configurator} settings={s} pdfFooter={[contact.email_contact, siteHost, contact.phone].filter(hasRealValue)} />
    </section>
  );
}
