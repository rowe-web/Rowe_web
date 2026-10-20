/**
 * npm run db:seed                      → contenido inicial + usuario administrador
 * npm run db:seed -- --demo            → además, mensajes de ejemplo en la bandeja
 * npm run db:seed -- --reset-content   → vuelve a cargar TODO el contenido editable (pide confirmación)
 */
import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";
import { connectPostgres, requireEnv } from "./client";
import { seedContent } from "./seed-core";

const args = new Set(process.argv.slice(2));

async function confirm(question: string): Promise<boolean> {
  if (args.has("--yes")) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${question} Escribe «sí» para continuar: `);
  rl.close();
  return ["sí", "si", "s", "yes", "y"].includes(answer.trim().toLowerCase());
}

async function ensureAdmin() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SECRET_KEY");
  const email = requireEnv("SEED_ADMIN_EMAIL").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "";
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // ¿Existe ya?
  let userId: string | null = null;
  for (let page = 1; page < 50 && !userId; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`No se pudo consultar Auth: ${error.message}`);
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    if (data.users.length < 200) break;
  }

  if (!userId) {
    if (password.length < 12) {
      throw new Error("SEED_ADMIN_PASSWORD debe tener al menos 12 caracteres (puedes cambiarla después desde el panel).");
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "admin" },
      user_metadata: { full_name: "Admin ROWE" },
    });
    if (error) throw new Error(`No se pudo crear el administrador: ${error.message}`);
    userId = data.user.id;
    console.log(`✓ Administrador creado: ${email}`);
  } else {
    await supabase.auth.admin.updateUserById(userId, { app_metadata: { role: "admin" } });
    console.log(`✓ El administrador ${email} ya existía`);
  }
  return userId;
}

async function main() {
  if (args.has("--reset-content")) {
    const ok = await confirm("Se borrarán escenas, textos, proyectos, precios y ajustes y se volverán a cargar los del diseño.");
    if (!ok) {
      console.log("Cancelado.");
      return;
    }
  }

  const db = connectPostgres(requireEnv("DATABASE_URL"));
  try {
    const adminId = await ensureAdmin();
    // El trigger crea el perfil; aquí garantizamos el rol aunque el usuario existiera de antes.
    await db.query(
      `insert into public.profiles (id, email, full_name, role)
       select id, email, coalesce(raw_user_meta_data->>'full_name', 'Admin ROWE'), 'admin' from auth.users where id = $1
       on conflict (id) do update set role = 'admin'`,
      [adminId],
    );
    await seedContent(db, { demo: args.has("--demo"), resetContent: args.has("--reset-content") });
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
