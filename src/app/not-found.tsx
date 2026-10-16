import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/chrome/SiteShell";
import { SceneHeader } from "@/components/scene/SceneHeader";
import { Button } from "@/components/ui/Button";
import { RichText } from "@/components/ui/RichText";
import { emptyBrand, emptyNavigation, getSetting, type BrandSettings, type NavigationSettings } from "@/lib/content/settings";
import { loadSite } from "@/lib/content/site";
import { PageMotion } from "@/motion/PageMotion";

export const metadata: Metadata = {
  title: "Escena eliminada en el montaje",
  robots: { index: false, follow: false },
};

/**
 * 404 · «Escena eliminada en el montaje». Sirve para las direcciones que no existen
 * (404 real) y para los notFound() de las páginas. Textos en Ajustes → Marca.
 * Debajo, la mesa de montaje con el hueco del clip que se cortó.
 */
export default async function NotFound() {
  const site = await loadSite();
  const brand = getSetting<BrandSettings>(site, "brand", emptyBrand);
  const nav = getSetting<NavigationSettings>(site, "navigation", emptyNavigation);

  return (
    <SiteShell site={site}>
      <PageMotion>
        <main id="contenido" className="relative flex min-h-screen-safe flex-col justify-center gutter-x pb-[10vh] pt-[clamp(120px,18vh,180px)]">
          <SceneHeader kicker="Escena 404 — Corte final" meta={["Toma no encontrada"]} />

          <div className="mt-12 grid items-end gap-10 md:mt-[8vh] lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
            <h1 data-reveal="mask" className="headline max-w-[13ch] text-[clamp(52px,13vw,76px)] md:text-[clamp(76px,9vw,152px)]">
              <RichText text={brand.not_found_title || "Escena eliminada *en el montaje.*"} />
            </h1>
            <div data-reveal className="flex flex-col gap-8 lg:pb-4">
              <p className="max-w-[38ch] text-[17px] leading-relaxed text-muted md:text-[19px]">{brand.not_found_body}</p>
              <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
                <Button href="/" arrow="→">
                  Volver al inicio
                </Button>
                <Button variant="link" href="/contacto" arrow="→">
                  Pide tu propuesta
                </Button>
              </div>
            </div>
          </div>

          <CutTimeline />

          {nav.items.length > 0 && (
            <nav aria-label="Escenas disponibles" className="mt-12 flex flex-col gap-4 border-t border-line pt-6">
              <span className="label-mono text-[10px] text-muted">Escenas disponibles</span>
              <ul className="flex flex-wrap gap-x-8 gap-y-3 text-[16px]">
                {nav.items.map((it) => (
                  <li key={it.href}>
                    <Link href={it.href} className="border-b border-transparent transition-colors hover:border-line-cta">
                      {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </main>
      </PageMotion>
    </SiteShell>
  );
}

/** Mesa de montaje (1b) con un clip cortado: hueco discontinuo y línea de corte REC. Decorativa. */
function CutTimeline() {
  const tracks = [
    { key: "RO", clips: [2.4, 1.6, 0, 2.8] },
    { key: "WE", clips: [1.8, 2.2, 0, 2.8] },
  ];
  return (
    <div data-reveal aria-hidden="true" className="mt-[10vh] flex flex-col gap-1.5">
      <div className="flex justify-between label-mono text-[9px] text-muted">
        <span>00:00:00:00</span>
        <span className="text-rec">✂ 00:00:04:04</span>
        <span>00:00:08:00</span>
      </div>
      {tracks.map((t) => (
        <div key={t.key} className="flex items-center gap-1.5">
          <span className="w-8 shrink-0 label-mono text-[9px] text-muted">{t.key}</span>
          <div className="relative flex h-9 flex-1 gap-1 md:h-11">
            {t.clips.map((size, i) =>
              size ? (
                <span key={i} className="rounded-[2px] border border-line-cta bg-surface-2" style={{ flexGrow: size, flexBasis: 0 }} />
              ) : (
                <span key={i} className="flex items-center justify-center rounded-[2px] border border-dashed border-line-dashed label-mono text-[9px] text-muted" style={{ flexGrow: 1.4, flexBasis: 0 }}>
                  404
                </span>
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
