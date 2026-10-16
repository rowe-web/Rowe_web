import { SceneHeader } from "@/components/scene/SceneHeader";
import { RichText } from "@/components/ui/RichText";
import { HablemosForm } from "@/features/hablemos/HablemosForm";
import { PrefillBox } from "@/features/hablemos/PrefillBox";
import { getHablemosSettings } from "@/features/hablemos/settings";
import type { ContactoBlock } from "@/lib/content/blocks";
import { emptyContact, getSetting, instagramHref, whatsappHref, type ContactSettings } from "@/lib/content/settings";
import type { SiteSnapshot } from "@/lib/content/types";

/**
 * /contacto · «Hoja de rodaje»: los canales directos (Ajustes → Contacto) en una ficha
 * monoespaciada, y al lado el formulario «Hablemos» en 5 tomas (el mismo de la escena 10,
 * con el resumen del configurador si se viene de allí).
 */
export function ContactBlock({ block, site }: { block: ContactoBlock; site: SiteSnapshot }) {
  const contact = getSetting<ContactSettings>(site, "contact", emptyContact);
  const settings = getHablemosSettings(site);
  const tel = contact.phone.replace(/[^\d+]/g, "");
  const rows = [
    { label: "Email", value: contact.email_contact, href: contact.email_contact ? `mailto:${contact.email_contact}` : "" },
    { label: "Teléfono", value: contact.phone, href: tel ? `tel:${tel}` : "" },
    { label: "WhatsApp", value: contact.whatsapp, href: whatsappHref(contact.whatsapp), external: true },
    { label: "Instagram", value: contact.instagram, href: instagramHref(contact.instagram), external: true },
    { label: "Estudio", value: contact.address, href: "" },
    { label: "Horario", value: contact.hours, href: "" },
  ].filter((r) => r.value);

  return (
    <section id="hablemos" data-scene="hablemos" className="relative gutter-x pb-[clamp(72px,12vh,140px)]">
      <SceneHeader kicker={block.kicker} />
      {block.title && (
        <h2 data-reveal="mask" className="headline mt-12 text-[clamp(44px,11vw,60px)] md:mt-[8vh] md:text-[clamp(60px,6.9vw,112px)]">
          <RichText text={block.title} />
        </h2>
      )}
      <div className="mt-12 flex flex-wrap items-start gap-[clamp(48px,6vw,110px)] md:mt-[8vh]">
        <div data-reveal className="flex min-w-0 flex-[1_1_340px] flex-col gap-8">
          {block.channels_label && <span className="label-mono text-muted">{block.channels_label}</span>}
          <dl className="border-t border-line">
            {rows.map((r) => (
              <div key={r.label} className="flex flex-col gap-1.5 border-b border-line py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <dt className="label-mono text-[10px] text-muted">{r.label}</dt>
                <dd className="min-w-0 text-[19px] leading-snug md:text-[22px]">
                  {r.href ? (
                    <a
                      href={r.href}
                      className="group/ch inline-flex items-baseline gap-2 break-all border-b border-transparent transition-colors hover:border-line-cta sm:break-normal"
                      {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {r.value}
                      <span aria-hidden="true" className="text-[14px] text-muted transition-transform duration-300 group-hover/ch:-translate-y-0.5 group-hover/ch:translate-x-0.5">
                        ↗
                      </span>
                      {r.external && <span className="sr-only">(se abre en una pestaña nueva)</span>}
                    </a>
                  ) : (
                    r.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p className="label-mono">{settings.promise}</p>
          <PrefillBox settings={settings} variant="section" />
        </div>
        <div className="min-w-0 flex-[1.3_1_520px]">
          {block.form_label && <span className="mb-6 block label-mono text-muted">{block.form_label}</span>}
          <HablemosForm settings={settings} contact={contact} variant="section" />
        </div>
      </div>
    </section>
  );
}
