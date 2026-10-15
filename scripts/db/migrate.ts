/**
 * npm run db:migrate
 * Aplica las migraciones de supabase/migrations a la base de datos de DATABASE_URL.
 */
import { connectPostgres, requireEnv } from "./client";
import { runMigrations } from "./migrate-core";

async function main() {
  const db = connectPostgres(requireEnv("DATABASE_URL"));
  try {
    const { applied, skipped } = await runMigrations(db);
    console.log(
      applied.length
        ? `✓ ${applied.length} migración(es) aplicada(s)${skipped.length ? ` · ${skipped.length} ya estaban` : ""}`
        : `✓ Base de datos al día (${skipped.length} migraciones)`,
    );
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
