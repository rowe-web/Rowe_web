import "server-only";
import { z } from "zod";

/**
 * Variables solo de servidor. Se validan al usarse, con un mensaje claro si falta alguna.
 */
const schema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(20, "Falta SUPABASE_SECRET_KEY (clave secret de Supabase)"),
});

let cached: z.infer<typeof schema> | null = null;

export function serverEnv() {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `· ${i.message}`).join("\n");
    throw new Error(`Configuración del servidor incompleta (.env.local):\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
