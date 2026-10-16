import { revalidateTag } from "next/cache";
import { serverEnv } from "@/lib/env.server";
import { SITE_CACHE_TAG } from "@/lib/content/published";
import { json } from "@/lib/server/request";

/**
 * POST /api/revalidate — la web vuelve a leer la última versión publicada.
 * Publicar desde el panel ya lo hace solo; esto es para lo que se publica fuera del
 * panel (scripts de mantenimiento: npm run db:publish). Protegido con
 * «Authorization: Bearer CRON_SECRET».
 */
export async function POST(req: Request) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return json({ message: "No autorizado" }, 401);
  // expire: 0 → la siguiente visita ya lee la versión nueva (sin servir la anterior mientras tanto)
  revalidateTag(SITE_CACHE_TAG, { expire: 0 });
  return json({ ok: true });
}
