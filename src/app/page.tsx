import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { CornerMarks } from "@/components/ui/CornerMarks";
import { Grain } from "@/components/ui/Grain";
import { getPublishedSite } from "@/lib/content/published";
import { isSupabaseConfigured } from "@/lib/site";

/**
 * Inicio provisional de la Fase 1: comprueba que la base de datos responde.
 * En la Fase 2 se sustituye por la película completa (escenas 00–10).
 */
async function DatabaseStatus() {
  if (!isSupabaseConfigured) {
    return <p className="label-mono text-muted">Base de datos · sin configurar (.env.local)</p>;
  }
  let site: Awaited<ReturnType<typeof getPublishedSite>>;
  try {
    site = await getPublishedSite();
  } catch (err) {
    const message = err instanceof Error ? err.message : "desconocido";
    return <p className="label-mono text-rec">Error de base de datos · {message}</p>;
  }
  if (!site) return <p className="label-mono text-muted">Base de datos conectada · aún no hay versión publicada (npm run db:seed)</p>;
  return (
    <p className="label-mono text-muted">
      Base de datos conectada · versión publicada <span className="text-bone">{site.version}</span> ·{" "}
      <span className="text-bone">{site.scenes.length}</span> escenas · <span className="text-bone">{site.configurator.options.length}</span>{" "}
      opciones de presupuesto · <span className="text-bone">{site.projects.length}</span> proyectos
    </p>
  );
}

export default function Home() {
  return (
    <main className="relative flex min-h-screen-safe flex-col items-center justify-center gap-10 gutter-x py-24 text-center">
      <div className="relative w-full max-w-5xl px-6 py-20 media-placeholder">
        <CornerMarks size={24} inset={24} />
        <p className="label-mono text-muted">Fase 1 — Base y sistema de diseño</p>
        <h1 className="headline mt-8 text-[clamp(48px,8vw,128px)]">
          Que te vean.
          <br />
          Que <em>confíen.</em>
        </h1>
      </div>
      <Logo height={22} priority />
      <DatabaseStatus />
      <Button href="/sistema" variant="outline" size="sm" arrow="→">
        Ver el sistema de diseño
      </Button>
      <Grain />
    </main>
  );
}
