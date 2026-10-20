import postgres from "postgres";

/** Interfaz mínima común a Postgres (Supabase) y PGlite (tests). */
export interface Db {
  /** Ejecuta SQL con varias sentencias (sin parámetros). Se ejecuta como una sola transacción implícita. */
  exec(sql: string): Promise<void>;
  /** Consulta parametrizada ($1, $2…). */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
}

export function connectPostgres(url: string): Db {
  const sql = postgres(url, {
    max: 1,
    prepare: false, // compatible con el pooler de Supabase
    onnotice: () => {},
    connection: { application_name: "rowe-scripts" },
  });
  return {
    async exec(text) {
      await sql.unsafe(text).simple();
    },
    async query<T>(text: string, params: unknown[] = []) {
      return (await sql.unsafe(text, params as never[])) as unknown as T[];
    },
    async close() {
      await sql.end({ timeout: 5 });
    },
  };
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`\n✗ Falta la variable de entorno ${name}. Revisa tu archivo .env.local (ver .env.example).\n`);
    process.exit(1);
  }
  return value;
}
