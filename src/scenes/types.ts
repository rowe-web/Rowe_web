import type { MediaItem, Scene, SiteSnapshot } from "@/lib/content/types";

export interface SceneProps<TData = Record<string, unknown>> {
  scene: Scene<TData>;
  site: SiteSnapshot;
}

export function getMedia(site: SiteSnapshot, id: string | null | undefined): MediaItem | null {
  return id ? (site.media[id] ?? null) : null;
}

/** Ancla de cada escena (enlaces del menú y botones «#presupuesto», «#hablemos»…). */
export function sceneAnchor(key: string): string {
  return key;
}
