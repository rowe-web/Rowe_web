import { createHash } from "node:crypto";
import { z } from "zod";
import { classifySource } from "@/lib/analytics/source";
import { clientIp, hashIp, sameOrigin } from "@/lib/server/request";
import { siteHost } from "@/lib/site";
import { adminClient } from "@/lib/supabase/admin";

const eventSchema = z.object({
  type: z.enum(["pageview", "video_play", "config_open", "quote", "lead", "pdf"]),
  path: z.string().max(300).startsWith("/"),
  referrer: z.string().max(500).default(""),
  session: z.string().min(4).max(64),
  meta: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()])).default({}),
});

/**
 * POST /api/events — analítica propia. El navegador solo la envía con consentimiento.
 * No guarda IP ni el identificador de sesión en claro (solo su huella).
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response(null, { status: 403 });
  const parsed = eventSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  const e = parsed.data;

  const db = adminClient();
  const { data: allowed } = await db.rpc("check_rate_limit", { p_key: `ev:${hashIp(clientIp(req))}`, p_limit: 240, p_window_seconds: 600 });
  if (allowed === false) return new Response(null, { status: 429 });

  const { error } = await db.from("events").insert({
    type: e.type,
    path: e.path,
    referrer_source: classifySource(e.referrer, siteHost),
    session_hash: createHash("sha256").update(e.session).digest("hex").slice(0, 32),
    meta: e.meta,
  });
  if (error) console.error("[events]", error.message);
  return new Response(null, { status: 204 });
}
