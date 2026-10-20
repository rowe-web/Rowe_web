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
- Se puede repetir sin miedo: nunca pisa lo que hayas editado desde el panel. Si una página interna sigue vacía (sin secciones), la rellena con el contenido inicial.
- Los cambios de contenido posteriores (por ejemplo, la opción «Solo contenido» del configurador o los textos nuevos del preloader) están en `scripts/db/content-updates.ts`: solo se aplican donde sigue el texto antiguo. Después, publica desde el panel para que la web los use.

### 5. Arrancar

```bash
npm run dev
```

Abre <http://localhost:3000>. La portada debe decir «Base de datos conectada · versión publicada 1 · 11 escenas…».

**Desde el móvil (misma wifi):** abre `http://IP-del-ordenador:3000` (la IP la muestra `npm run dev` en «Network», p. ej. `192.168.1.41`). Las direcciones de red local ya están permitidas en `next.config.ts` (`allowedDevOrigins`); sin eso, Next bloquea sus scripts en desarrollo y la intro se quedaba fija. La intro en móvil es más corta y se salta al tocar o deslizar; y si el JavaScript no cargara, se retira sola a los 8 s.

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

## Email: avisos de nuevo lead y respuestas desde el panel

Cada solicitud se guarda **siempre** en la base de datos. Después se envía un aviso por email al equipo (ajuste «notifications»: por defecto `rowe.web.agency@gmail.com` y `rowe.web.contacto@gmail.com`). Si el envío falla, queda registrado en la cola (`email_outbox`) con el motivo y se reintenta (1 min, 5 min, 30 min, 2 h, 12 h).

**Ahora (sin dominio propio): Gmail con contraseña de aplicación**

La cuenta que envía es `rowe.web.contacto@gmail.com` (ya configurada en `.env.local`). Para cambiarla:

1. Entra en <https://myaccount.google.com> con la cuenta que enviará → **Seguridad** → activa la **Verificación en dos pasos** (obligatoria para lo siguiente).
2. Ve a <https://myaccount.google.com/apppasswords>, crea una contraseña de aplicación llamada «ROWE web» y copia las 16 letras (sin espacios).
3. En `.env.local`: `EMAIL_PROVIDER=smtp`, `SMTP_USER=` esa cuenta y `SMTP_PASSWORD=` esas 16 letras. Reinicia `npm run dev`.

**Responder desde el panel:** en Mensajes, el botón **Responder** abre un formulario (asunto + texto) que envía la respuesta desde esa misma cuenta, no desde el correo personal de quien responde. El borrador se guarda mientras escribes; cada respuesta (enviada o fallida) queda en el historial del mensaje (tabla `lead_replies`) y el mensaje pasa de «Nuevo» a «Contactado».

El email al cliente tiene la estética de la web en versión clara de máximo contraste (texto #111 sobre blanco, logotipo negro sobre su propio fondo blanco para que no se pierda si el cliente de correo invierte colores; en modo oscuro de Apple Mail/iOS cambia a la paleta oscura de la web) e incluye el resumen de su solicitud: servicio, presupuesto, nº de presupuesto, lo que eligió y su mensaje. Nunca muestra datos de relleno («[+34 600 000 000]», «[Ciudad, Provincia]»): pon los reales en Ajustes → Contacto y Marca. Para llegar a la bandeja de entrada: el remitente es siempre la cuenta autenticada con nombre «ROWE» y Reply-To a la misma cuenta, cabecera `X-Entity-Ref-ID` única, sale autenticado desde Gmail (SPF y DKIM de Google), versión de texto, HTML de tablas sin scripts, pocos enlaces y una línea que explica por qué se recibe. Al escribir, el panel avisa de lo que suele llevar a spam (mayúsculas, «!!», «gratis», demasiados enlaces…). Con dominio propio (Fase 6) conviene pasar a `EMAIL_PROVIDER=resend` con SPF, DKIM y DMARC del dominio. Sin el envío configurado, el botón vuelve a abrir el programa de correo.

Limitaciones: unos 500 destinatarios al día, el remitente es una dirección @gmail.com y Google puede bloquear el envío si detecta un uso anómalo (el lead nunca se pierde: queda en la cola).

**Respuestas de los clientes (conversación):** cuando un cliente contesta un email de ROWE, la respuesta se lee del buzón de `rowe.web.contacto@gmail.com` por IMAP (misma contraseña de aplicación; el buzón se abre en solo lectura: nada se marca como leído ni se mueve) y se guarda en su mensaje (tabla `lead_inbound`). Se asocia por las cabeceras del email (contesta a una respuesta enviada desde el panel) o, si no, por el remitente (su mensaje más reciente); el resto del correo se ignora. En el panel, cada mensaje muestra la **conversación** en orden: formulario inicial (borde discontinuo), respuestas de ROWE (a la derecha, punto rojo) y respuestas del cliente (a la izquierda, ✉, «Nueva» hasta que se ve).

El buzón se lee cada minuto mientras el panel está abierto (y con «Comprobar correo»). Con el panel cerrado lo hará la tarea programada `GET /api/cron/inbox` (`Authorization: Bearer CRON_SECRET`; se programa en la Fase 6). Nunca hay dos lecturas a la vez.

**Avisos en tiempo real:** con el panel abierto, abajo a la derecha aparece un aviso al llegar un mensaje o presupuesto nuevo desde la web y cuando un cliente responde por email (Supabase Realtime, solo para el equipo por RLS). La bandeja y la conversación se actualizan solas.

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
| `npm run db:publish -- "nota"` | Publica el borrador como versión nueva (igual que «Publicar» del panel) y avisa a la web para que deje de servir la anterior (`POST /api/revalidate` con `CRON_SECRET`) |
| `npm run db:backup` | Copia de seguridad de la base de datos (`-- --media`: también los archivos) |
| `npm run db:seed -- --reset-content` | Vuelve a cargar TODO el contenido del diseño (pide confirmación; no toca mensajes ni usuarios) |
| `npm run brand` | Regenera favicon, iconos e imagen para compartir desde los logos de `design/assets` |

## Páginas internas, 404 y textos legales

- **/web, /audiovisual, /proyectos y /contacto** se montan con *secciones* que se añaden, quitan, reordenan y editan en **Ajustes → Páginas y legal**: cabecera (con imagen o vídeo 2.39:1 opcional), lista de servicios, una escena de la home, «qué incluye», proyectos relacionados, listado con filtros, preguntas frecuentes, contacto + formulario y cierre. Los tipos están en `src/lib/content/blocks.ts`.
- **Caso de estudio** (`/proyectos/<slug>`): sale de cada proyecto (reto, solución, resultado, cifras, galería, web del cliente) y enlaza con el siguiente.
- **404 «Escena eliminada en el montaje»**: textos en Ajustes → Marca. Una dirección que no existe, o un proyecto no publicado, responde **404 de verdad** (el proxy consulta los proyectos publicados antes de pintar la página).
- **Textos legales** (aviso legal, privacidad, cookies): en Ajustes → Páginas y legal. Los datos del titular se rellenan en **Ajustes → Datos legales** y se insertan solos donde el texto pone `{titular}`, `{nif}`, `{domicilio}`, `{email}`, `{alojamiento}` y `{actualizado}`; `{web}` y `{dominio}` salen de `NEXT_PUBLIC_SITE_URL`. Lo que va `[entre corchetes]` es provisional. **Que un abogado o gestor revise los textos antes del lanzamiento.**

## Web y audiovisual a partes iguales

- **Preloader**: además del timecode de rodaje, el logo aparece como etiqueta de código `< ROWE />` con cursor y un registro de *build → render → deploy* que avanza con la carga real. Las líneas se editan en Ajustes → Menú y pie (`preloader_steps`).
- **Hero · Fig. 01**: «Proceso ROWE · web, contenido y tráfico». Mientras no subas el vídeo del proceso (escena Hero → *Vídeo del proceso 4:5*), se ve una animación en bucle de tres planos (la web se construye → contenido vertical grabando → las visitas suben). La foto 4:5 hace de póster del vídeo.
- **Escena 03 · Desarrollo web**: selector **Escritorio / Móvil**. Las dos vistas se desplazan con el mismo progreso de scroll, así que cambiar de vista no salta. Se puede subir una grabación vertical de la web en móvil (*Grabación de la web en móvil*).
- **Configurador · «Solo contenido»**: tipo de proyecto para presupuestar solo el rodaje para redes. Bloquea tamaño, funciones y mantenimiento (aviso «Sin web, de momento» con botón «Añadir web») y abre el bloque audiovisual. Precios y reglas en Precios del panel; el servidor recalcula igual.
- **Punto REC ↔ `</>`**: el punto rojo de la cabecera, del pie y de «Hablemos» alterna cada 6 s con el símbolo web (`RecDot morph`). Con movimiento reducido se queda el punto quieto.
- **Logo**: siempre lleva al inicio con la misma cortinilla que el menú, también desde el menú abierto o el overlay «Hablemos» (su logo es el mismo enlace). En la home, por debajo de la cortinilla, sube arriba del todo, quita el ancla, cierra menú y overlays y vuelve a montar la página (`src/motion/replay.ts`), así que todas las animaciones empiezan de nuevo.
- **Navegación**: Next conserva las páginas visitadas y las vuelve a mostrar con «atrás»; los revelados se reinician al volver, así que nada se queda oculto. Un ancla pedida con el scroll bloqueado (menú cerrándose) espera al desbloqueo para aterrizar exacta.
- **Menú**: al pasar por cada elemento, el recuadro de la derecha muestra una vista previa animada de esa sección y su resumen. El resumen se edita en Ajustes → Menú y pie (*Resumen al pasar por encima*). La animación se elige por el enlace (`/`, `/web`, `/audiovisual`, `/proyectos`, `#presupuesto`, `#hablemos`); un enlace distinto muestra el recuadro de siempre.

## Dominio e indexación

- Nunca se escribe el dominio en el código: todo (canonical, sitemap, robots, Open Graph, datos estructurados) sale de `NEXT_PUBLIC_SITE_URL`.
- Cada página tiene título y descripción de Google (editables), canónica, imagen para compartir (la de la página o proyecto, si no la de Ajustes → SEO, si no `public/brand/og-default.png`) y datos estructurados (organización, servicios, migas de pan y casos de estudio).
- El sitemap incluye los proyectos publicados y se renueva al publicar.
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
src/components/page/    Secciones de las páginas internas (cabecera, servicios, FAQ, cierre…)
src/content/            Contenido inicial: seed-data.ts (escenas, ajustes, proyectos) · seed-pages.ts (páginas y legales)
src/lib/                site (URL, indexación) · seo (metadatos, JSON-LD) · content (versión publicada, secciones) · timecode · rich-text
src/motion/             Movimiento (magnético; Lenis/ScrollTrigger en la Fase 2)
tests/db/               Pruebas de base de datos con PGlite
tests/e2e/              Navegador: scroll, leads, panel, páginas, 404 y accesibilidad (axe)
```

## Texto editable

En titulares y textos del panel:

- `*texto*` → cursiva serif (como en el diseño).
- Un salto de línea → salto de línea.
- No se interpreta HTML.
