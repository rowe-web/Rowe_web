import { serverEnv } from "@/lib/env.server";
import { syncInbox } from "@/lib/email/inbox";
import { json } from "@/lib/server/request";

/**
 * GET /api/cron/inbox — lee las respuestas de los clientes del buzón de ROWE aunque nadie
 * tenga el panel abierto. Lo llama la tarea programada (Fase 6) con «Authorization: Bearer CRON_SECRET».
 */
export async function GET(req: Request) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return json({ message: "No autorizado" }, 401);
  return json(await syncInbox({ minInterval: 0 }));
}
