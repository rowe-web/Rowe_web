import Link from "next/link";
import { Fragment } from "react";
import { JsonLd } from "@/components/seo/JsonLd";
import { RichText } from "@/components/ui/RichText";
import { SceneHeader } from "@/components/scene/SceneHeader";
import { legalBlocks } from "@/lib/content/blocks";
import { emptyLegal, emptyNavigation, fillLegal, getSetting, type LegalSettings, type NavigationSettings } from "@/lib/content/settings";
import type { SiteSnapshot } from "@/lib/content/types";
import { breadcrumbLd } from "@/lib/seo";
import { siteHost, siteUrl } from "@/lib/site";

/**
 * Página legal (aviso legal, privacidad, cookies). Textos y apartados se editan en
 * Ajustes → Páginas y legal; los datos del titular, en Ajustes → Datos legales.
 * Escritorio: índice fijo a la izquierda. Emails y direcciones web se convierten en enlaces.
 */
export function LegalPage({ site, slug }: { site: SiteSnapshot; slug: string }) {
  const page = site.pages[slug];
  const legal = getSetting<LegalSettings>(site, "legal", emptyLegal);
  const nav = getSetting<NavigationSettings>(site, "navigation", emptyNavigation);
  const fill = (t: string) => fillLegal(t, legal, { url: siteUrl, host: siteHost });
  const blocks = legalBlocks(page?.blocks).map((b) => ({ title: fill(b.title), body: fill(b.body) }));
  const title = page?.title ?? slug;
  const others = nav.legal.filter((l) => l.href !== `/${slug}`);

  return (
    <main id="contenido" className="gutter-x pb-[14vh] pt-[clamp(120px,18vh,180px)]">
      <JsonLd data={breadcrumbLd([{ name: title, path: `/${slug}` }])} />
      <SceneHeader kicker="Legal" meta={legal.updated ? [`Actualizado · ${legal.updated}`] : []} />
      <h1 data-reveal="mask" className="headline mt-12 text-[clamp(48px,12vw,64px)] md:mt-[9vh] md:text-[clamp(64px,7.6vw,128px)]">
        <RichText text={title} />
      </h1>
      {page?.intro && (
        <p data-reveal className="mt-8 max-w-[60ch] whitespace-pre-line text-[17px] leading-relaxed text-muted md:text-[19px]">
          <Linkify text={fill(page.intro)} />
        </p>
      )}

      {blocks.length > 0 && (
        <div className="mt-[9vh] grid gap-12 border-t border-line pt-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-[5vw]">
          <nav aria-label="Índice" className="self-start lg:sticky lg:top-[120px]">
            <span className="label-mono text-[10px] text-muted">Índice</span>
            <ol className="mt-4 flex flex-col gap-2.5 text-[15px]">
              {blocks.map((b, i) => (
                <li key={i}>
                  <a href={`#apartado-${i + 1}`} className="group/toc flex gap-3 text-muted transition-colors hover:text-bone">
                    <span className="w-6 shrink-0 font-mono text-[11px] leading-[22px] tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <span className="border-b border-transparent group-hover/toc:border-line-cta">{b.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="flex max-w-[68ch] flex-col gap-12">
            {blocks.map((b, i) => (
              <section key={i} id={`apartado-${i + 1}`} data-reveal className="flex scroll-mt-[120px] flex-col gap-4">
                <h2 className="flex items-baseline gap-4 text-[22px] leading-snug md:text-[26px]">
                  <span className="font-mono text-[12px] tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</span>
                  {b.title}
                </h2>
                <p className="whitespace-pre-line text-[16px] leading-[1.75] text-muted md:text-[17px]">
                  <Linkify text={b.body} />
                </p>
              </section>
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <nav aria-label="Otros textos legales" className="mt-[12vh] flex flex-wrap gap-x-10 gap-y-3 border-t border-line pt-6 label-mono text-[11px] text-muted">
          {others.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-bone">
              {l.label} →
            </Link>
          ))}
        </nav>
      )}
    </main>
  );
}

/** Emails y direcciones web del texto como enlaces (sin interpretar HTML). */
function Linkify({ text }: { text: string }) {
  const parts = text.split(/([\w.+-]+@[\w-]+(?:\.[\w-]+)+|https?:\/\/[^\s)]*[^\s).,;]|\baepd\.es\b)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{p}</Fragment>;
        const href = p.includes("@") ? `mailto:${p}` : p.startsWith("http") ? p : `https://www.${p}`;
        const external = !p.includes("@") && !p.startsWith(siteUrl);
        return (
          <a key={i} href={href} className="break-words border-b border-line-cta text-bone transition-colors hover:border-bone" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {p}
          </a>
        );
      })}
    </>
  );
}
