/**
 * npm run db:backup            → copia de seguridad de la base de datos en backups/AAAA-MM-DD-HHMM/
 * npm run db:backup -- --media → además, descarga todos los archivos de la biblioteca de medios
 *
 * El plan gratuito de Supabase no ofrece copias descargables: este comando guarda cada
 * tabla en JSON (contenido, versiones publicadas, historial, mensajes, presupuestos…).
 * Los archivos de backups/ NO se suben a git (contienen datos personales de clientes).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { connectPostgres, requireEnv } from "./client";

const TABLES = [
  "site_settings", "scenes", "services", "pages", "projects", "project_media", "config_sections", "config_options",
  "media", "releases", "audit_log", "profiles", "leads", "quotes", "email_outbox", "events",
];

async function main() {
  const db = connectPostgres(requireEnv("DATABASE_URL"));
  const stamp = new Date().toISOString().slice(0, 16).replace("T", "-").replace(":", "");
  const dir = path.join(process.cwd(), "backups", stamp);
  await mkdir(dir, { recursive: true });
  try {
    for (const t of TABLES) {
      const rows = await db.query(`select * from public.${t}`);
      await writeFile(path.join(dir, `${t}.json`), JSON.stringify(rows, null, 1));
      console.log(`✓ ${t.padEnd(16)} ${rows.length} filas`);
    }
  } finally {
    await db.close();
  }

  if (process.argv.includes("--media")) {
    const supabase = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SECRET_KEY"), { auth: { persistSession: false } });
    const { data: media } = await supabase.from("media").select("bucket, path");
    let n = 0;
    for (const m of media ?? []) {
      const { data, error } = await supabase.storage.from(m.bucket).download(m.path);
      if (error || !data) {
        console.warn(`! No se pudo descargar ${m.path}: ${error?.message}`);
        continue;
      }
      const file = path.join(dir, "media", m.bucket, m.path);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, Buffer.from(await data.arrayBuffer()));
      n++;
    }
    console.log(`✓ medios           ${n} archivos`);
  }
  console.log(`\nCopia guardada en ${dir}\nGuárdala fuera del ordenador (disco externo o Drive privado): contiene datos de clientes.`);
}

main().catch((err) => {
  console.error("\n✗ No se pudo hacer la copia:", err instanceof Error ? err.message : err);
  process.exit(1);
});
