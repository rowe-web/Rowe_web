import { connectPostgres, requireEnv } from "./client";

/**
 * Publica el borrador actual como versión nueva (igual que «Publicar» en el panel) y avisa
 * a la web para que deje de servir la versión anterior de su caché.
 *   npm run db:publish -- "Nota de la versión"
 * Si la web no está arrancada, no pasa nada: al arrancar ya lee la última versión.
 */
async function main() {
  const note = process.argv.slice(2).join(" ").trim() || "Publicación desde script";
  const db = connectPostgres(requireEnv("DATABASE_URL"));
  try {
    const [{ v }] = await db.query<{ v: number }>("select public.publish_release($1) as v", [note]);
    console.log(`✓ Publicada la versión ${v} · ${note}`);
  } finally {
    await db.close();
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const secret = process.env.CRON_SECRET;
  if (!secret) return console.log("· Sin CRON_SECRET: la web verá la versión nueva al reiniciarla (o al publicar desde el panel).");
  try {
    const res = await fetch(`${site}/api/revalidate`, { method: "POST", headers: { authorization: `Bearer ${secret}` } });
    console.log(res.ok ? `✓ La web (${site}) ya sirve la versión nueva` : `! La web respondió ${res.status}: reiníciala para ver la versión nueva.`);
  } catch {
    console.log(`· La web (${site}) no está arrancada: al arrancarla ya leerá la versión nueva.`);
  }
}

main().catch((err) => {
  console.error("\n✗ No se pudo publicar:", err instanceof Error ? err.message : err);
  process.exit(1);
});
