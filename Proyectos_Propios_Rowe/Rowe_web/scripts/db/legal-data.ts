import { connectPostgres, requireEnv } from "./client";

/**
 * Datos del titular (Ajustes → Datos legales) en el BORRADOR, sin pisar ningún otro campo.
 *   npm run db:legal
 * Lee los valores de .env.local (LEGAL_OWNER, LEGAL_NIF, LEGAL_ADDRESS, LEGAL_EMAIL y,
 * opcional, LEGAL_HOSTING) para que el NIF y el domicilio no queden en el repositorio.
 * Solo cambia los campos con valor distinto: se puede ejecutar todas las veces que haga falta.
 * El cambio queda en el Historial del panel («Sistema»). No publica.
 */
const FIELDS = {
  owner: "LEGAL_OWNER",
  nif: "LEGAL_NIF",
  address: "LEGAL_ADDRESS",
  email: "LEGAL_EMAIL",
  hosting: "LEGAL_HOSTING",
} as const;

async function main() {
  const wanted = Object.fromEntries(
    Object.entries(FIELDS)
      .map(([field, env]) => [field, (process.env[env] ?? "").trim()] as const)
      .filter(([, v]) => v),
  );
  if (!Object.keys(wanted).length) throw new Error("No hay datos: añade LEGAL_OWNER, LEGAL_NIF, LEGAL_ADDRESS y LEGAL_EMAIL a .env.local.");

  const db = connectPostgres(requireEnv("DATABASE_URL"));
  try {
    const [row] = await db.query<{ value: Record<string, unknown> }>("select value from public.site_settings where key = 'legal'");
    if (!row) throw new Error("No existe el ajuste «legal»: ejecuta antes npm run db:seed.");
    const changes = Object.fromEntries(Object.entries(wanted).filter(([k, v]) => row.value[k] !== v));
    if (!Object.keys(changes).length) {
      console.log("✓ Datos legales: ya estaban al día, sin cambios");
      return;
    }
    // jsonb || jsonb: solo sustituye los campos que cambian
    await db.query("update public.site_settings set value = value || $1::text::jsonb where key = 'legal'", [JSON.stringify(changes)]);
    console.log(`✓ Datos legales actualizados en el borrador: ${Object.keys(changes).join(", ")}`);
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error("\n✗", err instanceof Error ? err.message : err);
  process.exit(1);
});
