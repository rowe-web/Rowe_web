import { serverEnv } from "@/lib/env.server";
import { processOutbox } from "@/lib/email/outbox";
import { json } from "@/lib/server/request";

/**
 * GET /api/cron/email-retry — reintenta los avisos por email pendientes o fallidos.
 * Lo llama la tarea programada de la plataforma (Fase 6) con «Authorization: Bearer CRON_SECRET».
 * En local: curl -H "Authorization: Bearer TU_SECRETO" http://localhost:3000/api/cron/email-retry
 */
export async function GET(req: Request) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return json({ message: "No autorizado" }, 401);
  const result = await processOutbox({ limit: 50 });
  return json(result);
}
