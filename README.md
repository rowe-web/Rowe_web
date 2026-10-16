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
     - Usa el **Session pooler**, no la conexión directa (`db.xxx.supabase.co`): la directa solo funciona con IPv6 y muchas redes domésticas son solo IPv4.
     - Si la contraseña tiene símbolos como `? # / @ :`, van codificados en la URL (`?` → `%3F`, `#` → `%23`, `/` → `%2F`, `@` → `%40`, `:` → `%3A`).
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

## Panel de administración (`/admin`)

Entra en `/admin` con tu email y contraseña. Todo lo que ves en la web se edita aquí: textos y escenas, proyectos, precios del configurador, medios, ajustes, páginas legales y menú.

**Borrador y publicación.** Lo que guardas queda en **borrador**: la web pública no cambia hasta que un administrador pulsa **Publicar**. Antes puedes verlo en **Vista previa** (`/vista-previa`, solo para el equipo). Cada publicación crea una versión que se puede volver a publicar desde **Historial → Versiones publicadas**.

**Roles.**

| | Administrador | Editor |
|---|---|---|
| Textos, escenas, proyectos, medios | ✓ | ✓ |
| Mensajes (estado y notas) | ✓ (y borrar) | ✓ |
| Ajustes | todos | solo los marcados como editables (marca, menú y pie, formulario) |
| Precios del configurador | ✓ | — |
| Usuarios | ✓ | — |
| Publicar | ✓ | — (guarda borradores) |

Los permisos los exige la propia base de datos (RLS), no solo la interfaz.

**Nunca se pierde lo que escribes.** Cada editor guarda una copia local mientras escribes (si se cierra el navegador, al volver ofrece «Recuperar»), avisa si sales con cambios sin guardar y tiene **Deshacer** en la barra superior. Además, **Historial** registra cada cambio con quién y cuándo, y **Restaurar** lo deshace (también recrea lo borrado).

**Medios.** Imágenes (JPG, PNG, WEBP, AVIF), vídeo (MP4, WEBM) y audio (MP3), máx. 20 MB. Las imágenes se reducen a 2560 px y se pasan a WebP al subirlas; los vídeos generan su imagen de reserva. El plan gratuito de Supabase da 1 GB (la barra de Medios lo muestra). Si borras un archivo que la web publicada aún usa, el archivo se elimina del almacenamiento al publicar, para que la web nunca muestre una imagen rota.

**Invitar a alguien.** Usuarios → **Invitar usuario** → email y rol. Si el email está configurado (ver abajo), le llega la invitación; si no, el panel te da un **enlace para copiar** y mandárselo por WhatsApp o email. Al abrirlo, crea su contraseña. **Quitar acceso** bloquea la cuenta y conserva su historial.

**Ajustes de Supabase necesarios (una vez):**

1. **Authentication → Sign In / Providers**: *Allow new users to sign up* **desactivado** (solo por invitación).
2. **Authentication → URL Configuration**: *Site URL* = la dirección de la web (ahora `http://localhost:3000`; en la Fase 6, el dominio) y en *Redirect URLs* añade `http://localhost:3000/**` (y después `https://tu-dominio/**`). Lo usa «¿Olvidaste tu contraseña?».
3. Los emails de acceso que envía Supabase por defecto tienen un límite muy bajo (unos pocos por hora). Las invitaciones del panel no dependen de ellos (usan el email de la web o el enlace copiable).

## Copias de seguridad

- **Plan gratuito de Supabase:** no hay copias descargables. Haz una copia con `npm run db:backup` (todas las tablas en JSON en `backups/`) o `npm run db:backup -- --media` (además, todos los archivos). Recomendado: una vez al mes y antes de cambios grandes. La carpeta `backups/` no se sube a git porque contiene datos de clientes: guárdala en un sitio privado.
- **Plan Pro de Supabase (25 $/mes):** copias diarias automáticas (7 días) que se restauran con un clic en **Database → Backups**. Con *Point-in-Time Recovery* (de pago aparte) se vuelve a cualquier minuto.
- Además, cada versión publicada se guarda completa en la tabla `releases`: desde **Historial** se puede volver a publicar cualquiera.

## Email de avisos (nuevo lead)

Cada solicitud se guarda **siempre** en la base de datos. Después se envía un aviso por email al equipo (ajuste «notifications»: por defecto `rowe.web.agency@gmail.com` y `rowe.web.contacto@gmail.com`). Si el envío falla, queda registrado en la cola (`email_outbox`) con el motivo y se reintenta (1 min, 5 min, 30 min, 2 h, 12 h).

**Ahora (sin dominio propio): Gmail con contraseña de aplicación**

1. Entra en <https://myaccount.google.com> con `rowe.web.agency@gmail.com` → **Seguridad** → activa la **Verificación en dos pasos** (obligatoria para lo siguiente).
2. Ve a <https://myaccount.google.com/apppasswords>, crea una contraseña de aplicación llamada «ROWE web» y copia las 16 letras (sin espacios).
3. En `.env.local`: `EMAIL_PROVIDER=smtp`, `SMTP_USER=rowe.web.agency@gmail.com` y `SMTP_PASSWORD=` esas 16 letras. Reinicia `npm run dev`.

Limitaciones: unos 500 destinatarios al día, el remitente es una dirección @gmail.com y Google puede bloquear el envío si detecta un uso anómalo (el lead nunca se pierde: queda en la cola).

**Con dominio propio:** `EMAIL_PROVIDER=resend`, `RESEND_API_KEY` y `EMAIL_FROM=avisos@tu-dominio` (se verifica el dominio en Resend). Sin dominio, Resend solo deja enviar a la dirección con la que te registraste.

**Reintentos:** `GET /api/cron/email-retry` con `Authorization: Bearer CRON_SECRET` (la tarea programada se configura en la Fase 6).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Web en local con recarga automática |
| `npm run build` / `npm start` | Build de producción y servidor de producción |
| `npm run check` | Lint + tipos + tests + build (antes de cada entrega) |
| `npm test` | Tests (incluye base de datos real en memoria: permisos, publicación, historial) |
| `npm run test:e2e` | Pruebas en navegador real: scroll, navegación, configurador, formulario, leads, PDF, cookies y panel (construye y arranca la web de producción; crea y borra sus propios usuarios y datos de prueba en Supabase) |
| `npm run db:migrate` | Aplica migraciones nuevas |
| `npm run db:seed` | Carga el contenido que falte y asegura el admin |
| `npm run db:backup` | Copia de seguridad de la base de datos (`-- --media`: también los archivos) |
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
src/app/                Rutas: web pública, /admin (panel), /vista-previa, /api, /sistema
src/admin/              Panel: acciones del servidor, pantallas, editor (deshacer/copia local), medios
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
