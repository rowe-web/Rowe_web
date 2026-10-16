import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ClosingBlock } from "@/components/page/ClosingBlock";
import { MediaFrame } from "@/components/scene/MediaFrame";
import { SceneHeader } from "@/components/scene/SceneHeader";
import { Timecode } from "@/components/scene/Timecode";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageBlocks, type CierreBlock } from "@/lib/content/blocks";
import { loadSite } from "@/lib/content/site";
import type { Project, SiteSnapshot } from "@/lib/content/types";
import { breadcrumbLd, buildMetadata, projectLd, SITE_NAME } from "@/lib/seo";
import { getMedia } from "@/scenes/types";

export async function generateStaticParams() {
  const site = await loadSite();
  // Con Cache Components hace falta al menos uno; los demás se generan en la primera visita
  return site.projects.length ? site.projects.map((p) => ({ slug: p.slug })) : [{ slug: "ejemplo" }];
}

export async function generateMetadata({ params }: PageProps<"/proyectos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const site = await loadSite();
  const p = site.projects.find((x) => x.slug === slug);
  if (!p) return { title: "Escena eliminada en el montaje", robots: { index: false, follow: false } };
  return buildMetadata(site, {
    title: p.seo_title || `${p.title} — Caso de estudio · ${SITE_NAME}`,
    description: p.seo_description || p.summary,
    path: `/proyectos/${p.slug}`,
    images: [p.cover_id],
    type: "article",
  });
}

/**
 * Caso de estudio. Un slug desconocido ya devuelve 404 real desde el proxy (src/proxy.ts);
 * el notFound() de aquí es la red de seguridad (p. ej. un proyecto recién despublicado).
 */
export default function ProjectPage({ params }: PageProps<"/proyectos/[slug]">) {
  return (
    <Suspense fallback={<main id="contenido" className="min-h-screen-safe" />}>
      <ProjectContent params={params} />
    </Suspense>
  );
}

async function ProjectContent({ params }: { params: PageProps<"/proyectos/[slug]">["params"] }) {
  const { slug } = await params;
  const site = await loadSite();
  const index = site.projects.findIndex((x) => x.slug === slug);
  if (index < 0) notFound();
  const p = site.projects[index];
  const next = site.projects.length > 1 ? site.projects[(index + 1) % site.projects.length] : null;
  const cover = getMedia(site, p.cover_id);
  const video = getMedia(site, p.video_id);
  const gallery = p.gallery.map((id) => getMedia(site, id)).filter((m) => m !== null);
  const number = String(index + 1).padStart(2, "0");
  // El cierre es el mismo (editable) de la página /proyectos
  const closing = pageBlocks(site.pages["proyectos"]?.blocks).find((b): b is CierreBlock => b.type === "cierre");
  const clientHref = p.client_url ? (/^https?:\/\//.test(p.client_url) ? p.client_url : `https://${p.client_url}`) : "";

  const sheet = [
    { label: "Cliente", value: p.client },
    { label: "Sector", value: p.sector },
    { label: "Año", value: p.year ? String(p.year) : "" },
    { label: "Disciplina", value: p.category },
  ].filter((r) => r.value);
  const takes = [
    { label: "Reto", text: p.challenge },
    { label: "Solución", text: p.solution },
    { label: "Resultado", text: p.result },
  ].filter((t) => t.text);

  return (
    <main id="contenido">
      <JsonLd data={[breadcrumbLd([{ name: "Proyectos", path: "/proyectos" }, { name: p.title, path: `/proyectos/${p.slug}` }]), projectLd(site, p)]} />

      <section className="gutter-x pb-[clamp(48px,8vh,96px)] pt-[clamp(120px,18vh,180px)]">
        <SceneHeader kicker={`Proyecto ${number} — ${p.category}`} meta={[p.sector, p.year ? String(p.year) : ""].filter(Boolean)} />
        <nav aria-label="Migas de pan" className="mt-6 label-mono text-[10px] text-muted">
          <Link href="/proyectos" className="transition-colors hover:text-bone">
            Proyectos
          </Link>
          <span aria-hidden="true"> / </span>
          <span aria-current="page" className="text-bone">
            {p.title}
          </span>
        </nav>
        <h1 data-reveal="mask" className="headline mt-10 max-w-[16ch] text-[clamp(52px,13vw,76px)] md:mt-[7vh] md:text-[clamp(76px,9.4vw,160px)]">
          {p.title}
        </h1>
        <div className="mt-12 grid gap-10 md:mt-[8vh] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-[5vw]">
          {p.summary && (
            <p data-reveal className="max-w-[34ch] text-[22px] font-light leading-snug tracking-[-0.01em] md:text-[clamp(24px,2.2vw,32px)]">
              {p.summary}
            </p>
          )}
          <dl data-reveal className="flex flex-col border-t border-line">
            {sheet.map((r) => (
              <div key={r.label} className="flex items-baseline justify-between gap-6 border-b border-line py-3.5">
                <dt className="label-mono text-[10px] text-muted">{r.label}</dt>
                <dd className="text-right text-[15px]">{r.value}</dd>
              </div>
            ))}
            {clientHref && (
              <div className="flex items-baseline justify-between gap-6 border-b border-line py-3.5">
                <dt className="label-mono text-[10px] text-muted">Web</dt>
                <dd className="text-right text-[15px]">
                  <a href={clientHref} target="_blank" rel="noopener noreferrer" className="border-b border-line-cta transition-colors hover:border-bone">
                    {p.client_url.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗<span className="sr-only"> (se abre en una pestaña nueva)</span>
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      <figure className="gutter-x">
        <div data-reveal="wipe">
          <MediaFrame
            media={video ?? cover}
            poster={video ? cover : null}
            aspect="2.39 / 1"
            marks={24}
            priority
            placeholder={`[ Portada 2.39:1 · ${p.title} ]`}
            cursor={video ? "▶ Ver" : undefined}
          />
        </div>
        <figcaption className="mt-3 flex justify-between gap-4 label-mono text-[10px] text-muted">
          <span>Fig. {number} — {p.title}</span>
          <span className="hidden sm:inline">2.39:1</span>
          <Timecode />
        </figcaption>
      </figure>

      {takes.length > 0 && (
        <section aria-label="El caso" className="gutter-x py-[clamp(72px,12vh,140px)]">
          <ol className="border-t border-line">
            {takes.map((t, i) => (
              <li key={t.label} data-reveal className="grid gap-x-[4vw] gap-y-4 border-b border-line py-10 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:py-14">
                <div className="flex items-baseline gap-5">
                  <span className="label-mono text-[10px] text-muted">Toma {String(i + 1).padStart(2, "0")}</span>
                  <h2 className="headline-serif text-[clamp(40px,10vw,52px)] italic md:text-[clamp(52px,4.9vw,80px)]">{t.label}</h2>
                </div>
                <p className="max-w-[52ch] text-[18px] leading-relaxed md:pt-3 md:text-[21px]">{t.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {p.metrics.length > 0 && (
        <section aria-label="Resultados" className="gutter-x pb-[clamp(72px,12vh,140px)]">
          <dl className="grid grid-cols-1 border-y border-line sm:grid-cols-3">
            {p.metrics.map((m, i) => (
              <div key={m.label} data-reveal className={`flex flex-col-reverse gap-3 py-8 sm:py-10 ${i ? "border-t border-line sm:border-l sm:border-t-0 sm:pl-[3vw]" : ""}`}>
                <dt className="label-mono text-[10px] text-muted">{m.label}</dt>
                <dd className="headline-serif text-[clamp(56px,14vw,72px)] leading-none md:text-[clamp(72px,7vw,120px)]">{m.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {gallery.length > 0 && <Gallery site={site} project={p} />}

      {next && <NextProject site={site} project={next} index={(index + 1) % site.projects.length} />}

      {closing && <ClosingBlock block={closing} />}
    </main>
  );
}

/** Galería: la primera imagen a lo ancho (2.39:1); el resto en parejas 4:5 escalonadas. */
function Gallery({ site, project: p }: { site: SiteSnapshot; project: Project }) {
  const items = p.gallery.map((id) => getMedia(site, id)).filter((m) => m !== null);
  const [first, ...rest] = items;
  return (
    <section aria-label="Galería" className="gutter-x pb-[clamp(72px,12vh,140px)]">
      <SceneHeader kicker="Galería" meta={[`${items.length} planos`]} timecode={false} />
      <div className="mt-10 flex flex-col gap-[4vw]">
        <div data-reveal="wipe">
          <MediaFrame media={first} aspect="2.39 / 1" sizes="88vw" />
        </div>
        {rest.length > 0 && (
          <div className="grid gap-[4vw] sm:grid-cols-2">
            {rest.map((m, i) => (
              <div key={m.id} data-reveal className={i % 2 === 1 ? "sm:mt-[12vh]" : ""}>
                <MediaFrame media={m} aspect="4 / 5" sizes="(min-width:640px) 44vw, 88vw" />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** «Siguiente proyecto»: el corte a la siguiente escena del archivo. */
function NextProject({ site, project: n, index }: { site: SiteSnapshot; project: Project; index: number }) {
  return (
    <section aria-label="Siguiente proyecto" className="gutter-x pb-[clamp(72px,12vh,140px)]">
      <Link href={`/proyectos/${n.slug}`} data-cursor="Siguiente" data-scroll-active className="group/next flex flex-col gap-8 border-t border-line pt-8">
        <span className="flex justify-between gap-4 label-mono text-[10px] text-muted">
          <span>Siguiente — Proyecto {String(index + 1).padStart(2, "0")}</span>
          <span>{n.category}</span>
        </span>
        <span className="grid items-end gap-8 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <span className="headline text-[clamp(48px,12vw,64px)] transition-transform duration-700 ease-[var(--ease-cut)] group-hover/next:translate-x-4 md:text-[clamp(64px,7.6vw,128px)]">
            {n.title} <span aria-hidden="true" className="inline-block text-[0.6em] transition-transform duration-500 group-hover/next:translate-x-3">→</span>
          </span>
          <span className="block overflow-hidden">
            <MediaFrame
              media={getMedia(site, n.cover_id)}
              aspect="2.39 / 1"
              placeholder={`[ Portada · ${n.title} ]`}
              sizes="(min-width:768px) 36vw, 88vw"
              className="transition-transform duration-700 ease-[var(--ease-cut)] group-hover/next:scale-[1.04] group-data-[active]/next:scale-[1.04]"
            />
          </span>
        </span>
      </Link>
    </section>
  );
}
