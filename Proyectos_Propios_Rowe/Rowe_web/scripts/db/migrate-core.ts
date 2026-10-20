import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Db } from "./client";

export const MIGRATIONS_DIR = path.resolve(import.meta.dirname, "../../supabase/migrations");

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

/**
 * Aplica en orden los .sql de supabase/migrations que aún no se han aplicado.
 * Cada migración se ejecuta entera o no se ejecuta (transacción).
 * Las migraciones ya aplicadas no se pueden modificar: crea una nueva.
 */
export async function runMigrations(db: Db, dir = MIGRATIONS_DIR, log = console.log): Promise<MigrationResult> {
  await db.exec(`
    create schema if not exists internal;
    create table if not exists internal.schema_migrations (
      name text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    );
  `);

  const files = (await readdir(dir)).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
  const done = new Map(
    (await db.query<{ name: string; checksum: string }>("select name, checksum from internal.schema_migrations")).map((r) => [r.name, r.checksum]),
  );

  const result: MigrationResult = { applied: [], skipped: [] };
  for (const file of files) {
    const sql = await readFile(path.join(dir, file), "utf8");
    // Normaliza saltos de línea: el checksum es el mismo en Windows (CRLF) y Linux (LF).
    const checksum = createHash("sha256").update(sql.replace(/\r\n/g, "\n")).digest("hex");
    const previous = done.get(file);
    if (previous) {
      if (previous !== checksum) {
        throw new Error(`La migración ${file} ya estaba aplicada y ha cambiado. No edites migraciones aplicadas: crea una nueva.`);
      }
      result.skipped.push(file);
      continue;
    }
    log(`→ Aplicando ${file}`);
    await db.exec(
      `begin;\n${sql}\n;insert into internal.schema_migrations (name, checksum) values ('${file}', '${checksum}');\ncommit;`,
    ).catch(async (err) => {
      await db.exec("rollback;").catch(() => {});
      throw new Error(`Error en ${file}: ${err instanceof Error ? err.message : String(err)}`);
    });
    result.applied.push(file);
  }
  return result;
}
