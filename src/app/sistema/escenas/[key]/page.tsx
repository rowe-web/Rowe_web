import { notFound } from "next/navigation";
import { Preloader } from "@/components/chrome/Preloader";
import { SiteFooter } from "@/components/chrome/SiteFooter";
import { SiteHeader } from "@/components/chrome/SiteHeader";
import { SiteMenu } from "@/components/chrome/SiteMenu";
import { Grain } from "@/components/ui/Grain";
import { buildFallbackSnapshot } from "@/content/fallback";
import type { SiteSnapshot } from "@/lib/content/types";
import {
  emptyBrand,
  emptyContact,
  emptyNavigation,
  getSetting,
  type BrandSettings,
  type ContactSettings,
  type NavigationSettings,
} from "@/lib/content/settings";
import { EcosistemaScene } from "@/scenes/EcosistemaScene";
import { EstudioScene } from "@/scenes/EstudioScene";
import { ProcesoScene } from "@/scenes/ProcesoScene";
import { sceneRegistry } from "@/scenes/registry";
import { boards } from "../boards";

/** Página interna de revisión: puede bloquear la navegación (no necesita carga instantánea). */
export const instant = false;

export function generateStaticParams() {
  return boards.map((b) => ({ key: b.key }));
}

/** Una pieza del tablero, a tamaño real (se muestra dentro de un iframe en /sistema/escenas). */
export default async function BoardItem({ params }: { params: Promise<{ key: string }> }) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "true") notFound();
  const { key } = await params;
  const site = buildFallbackSnapshot();
  const nav = getSetting<NavigationSettings>(site, "navigation", emptyNavigation);
  const content = renderBoard(key, site, nav);
  if (!content) notFound();

  return (
    <main className="relative">
      {key === "hero" && <SiteHeader nav={nav} />}
      {content}
      <Grain />
    </main>
  );
}

function renderBoard(key: string, site: SiteSnapshot, nav: NavigationSettings): React.ReactNode {
  const contact = getSetting<ContactSettings>(site, "contact", emptyContact);
  const brand = getSetting<BrandSettings>(site, "brand", emptyBrand);
  const scene = site.scenes.find((s) => s.key === key);

  if (key === "preloader") return <Preloader label={nav.preloader_label} meta={nav.preloader_meta} progress={0.68} preview />;
  if (key === "header") return <SiteHeader nav={nav} preview />;
  if (key === "menu") return <SiteMenu nav={nav} contact={contact} brand={brand} open preview />;
  if (key === "footer") return <SiteFooter site={site} />;
  if (!scene) return null;
  if (key === "estudio") return <EstudioScene scene={scene} site={site} previewLit={0.55} />;
  if (key === "ecosistema") return <EcosistemaScene scene={scene} site={site} previewStep={1} />;
  if (key === "proceso") return <ProcesoScene scene={scene} site={site} previewHead={0.42} />;
  const Scene = sceneRegistry[key];
  return Scene ? <Scene scene={scene} site={site} /> : null;
}
