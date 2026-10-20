import type { SiteSnapshot } from "@/lib/content/types";
import { sceneRegistry } from "@/scenes/registry";

/** Escenas de la home en el orden y con la visibilidad decididos en el panel. */
export function HomeScenes({ site }: { site: SiteSnapshot }) {
  return (
    <main id="contenido">
      {site.scenes.map((scene) => {
        const Scene = sceneRegistry[scene.key];
        return Scene ? <Scene key={scene.id} scene={scene} site={site} /> : null;
      })}
    </main>
  );
}
