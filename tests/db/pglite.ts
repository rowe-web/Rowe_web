import { readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { Db } from "../../scripts/db/client";
import { runMigrations } from "../../scripts/db/migrate-core";

export interface TestDb extends Db {
  /** Ejecuta como un usuario autenticado de Supabase (o anónimo si uid = null). */
  as<T>(uid: string | null, fn: () => Promise<T>): Promise<T>;
  createUser(email: string, role?: "admin" | "editor" | null, fullName?: string): Promise<string>;
}

export async function createTestDb(): Promise<TestDb> {
  const pg = new PGlite();
  const stub = await readFile(path.join(import.meta.dirname, "supabase-stub.sql"), "utf8");
  await pg.exec(stub);

  const db: TestDb = {
    async exec(sql) {
      await pg.exec(sql);
    },
    async query<T>(sql: string, params: unknown[] = []) {
      const res = await pg.query<T>(sql, params);
      return res.rows;
    },
    async close() {
      await pg.close();
    },
    async as(uid, fn) {
      const role = uid ? "authenticated" : "anon";
      const claims = JSON.stringify(uid ? { sub: uid, role } : { role });
      await pg.exec(`select set_config('request.jwt.claims', '${claims}', false); set role ${role};`);
      try {
        return await fn();
      } finally {
        await pg.exec(`reset role; select set_config('request.jwt.claims', '', false);`);
      }
    },
    async createUser(email, role = null, fullName = "") {
      const rows = await db.query<{ id: string }>(
        `insert into auth.users (email, raw_app_meta_data, raw_user_meta_data) values ($1, $2::jsonb, $3::jsonb) returning id`,
        [email, JSON.stringify(role ? { role } : {}), JSON.stringify(fullName ? { full_name: fullName } : {})],
      );
      return rows[0].id;
    },
  };

  await runMigrations(db, undefined, () => {});
  return db;
}
