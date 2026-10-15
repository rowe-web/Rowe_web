# ROWE — Web & Audiovisual

Web oficial de ROWE: «la web como una película». Next.js 16 + TypeScript + Tailwind 4 + GSAP/Lenis + Supabase.

| | |
|---|---|
| Diseño de referencia | `design/` (archivos de Claude Design; no se despliegan) |
| Base de datos | [docs/DATABASE.md](docs/DATABASE.md) |
| Guía de estilo viva | `http://localhost:3000/sistema` (solo en local) |

## Requisitos

- **Node.js 20.9 o superior** (instalado: 24 LTS). Compruébalo con `node -v`.
- Una cuenta gratuita de **Supabase** (base de datos, usuarios y archivos).

## Puesta en marcha en local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear el proyecto en Supabase (una sola vez)

1. Entra en <https://supabase.com> → **Start your project** y regístrate (con `rowe.web.agency@gmail.com`).
2. **New project**:
   - Nombre: `rowe-web`.
   - **Database password**: genera una fuerte y **guárdala** (la necesitas en el paso 3).
   - Región: la europea más cercana (p. ej. *West EU (Ireland)* o *Central EU (Frankfurt)*).
   - Plan **Free**.
3. Cuando termine de crearse:
   - **Project Settings → API Keys**: copia la **Project URL**, la clave **publishable** y la clave **secret**.
   - Botón **Connect** (arriba) → pestaña **Session pooler** → copia la cadena `postgresql://…` y sustituye `[YOUR-PASSWORD]` por la contraseña de la base de datos.
4. **Authentication → Sign In / Providers**: desactiva **Allow new users to sign up**. El panel es solo por invitación; esto impide que alguien se registre por su cuenta.

### 3. Configurar las variables de entorno

Copia `.env.example` como `.env.local` y rellena:

```
NEXT_PUBLIC_SUPABASE_URL=            ← Project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= ← clave publishable
SUPABASE_SECRET_KEY=                 ← clave secret (¡nunca la compartas!)
DATABASE_URL=                        ← cadena del Session pooler con tu contraseña
SEED_ADMIN_PASSWORD=                 ← contraseña del panel (mín. 12 caracteres)
```

### 4. Crear las tablas y cargar el contenido

```bash
npm run db:setup
```

Este comando aplica las migraciones, carga todo el contenido del diseño, crea tu usuario administrador (`SEED_ADMIN_EMAIL`) y publica la versión 1.

- Si añades `-- --demo`, también se cargan en la bandeja los mensajes de ejemplo del diseño.
- Se puede repetir sin miedo: nunca pisa lo que hayas editado desde el panel.

### 5. Arrancar

```bash
npm run dev
```

Abre <http://localhost:3000>. La portada debe decir «Base de datos conectada · versión publicada 1 · 11 escenas…».

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Web en local con recarga automática |
| `npm run build` / `npm start` | Build de producción y servidor de producción |
| `npm run check` | Lint + tipos + tests + build (antes de cada entrega) |
| `npm test` | Tests (incluye base de datos real en memoria: permisos, publicación, historial) |
| `npm run db:migrate` | Aplica migraciones nuevas |
| `npm run db:seed` | Carga el contenido que falte y asegura el admin |
| `npm run db:seed -- --reset-content` | Vuelve a cargar TODO el contenido del diseño (pide confirmación; no toca mensajes ni usuarios) |
| `npm run brand` | Regenera favicon, iconos e imagen para compartir desde los logos de `design/assets` |

## Dominio e indexación

- Nunca se escribe el dominio en el código: todo (canonical, sitemap, robots, Open Graph) sale de `NEXT_PUBLIC_SITE_URL`.
- Mientras `NEXT_PUBLIC_ALLOW_INDEXING=false`, la web sale con `noindex` (meta + cabecera `X-Robots-Tag`) y `robots.txt` bloquea a los buscadores.
- El día del lanzamiento: `NEXT_PUBLIC_SITE_URL=https://tu-dominio` y `NEXT_PUBLIC_ALLOW_INDEXING=true` (guía completa en la Fase 6).

## Estructura

```
design/                 Diseño de referencia (Claude Design)
docs/                   Documentación (base de datos…)
public/brand/           Logos oficiales y símbolo
scripts/                gen-brand (iconos/OG) · db/ (migraciones y seed)
supabase/migrations/    SQL versionado: tablas, funciones, RLS, storage
src/app/                Rutas (web, /sistema; panel en la Fase 4)
src/components/         brand/ (Logo) · ui/ (Button, RecDot, Grain, CornerMarks, RichText)
src/content/seed-data.ts  Contenido inicial del diseño
src/lib/                site (URL, indexación) · content (versión publicada) · timecode · rich-text
src/motion/             Movimiento (magnético; Lenis/ScrollTrigger en la Fase 2)
tests/db/               Pruebas de base de datos con PGlite
```

## Texto editable

En titulares y textos del panel:

- `*texto*` → cursiva serif (como en el diseño).
- Un salto de línea → salto de línea.
- No se interpreta HTML.
