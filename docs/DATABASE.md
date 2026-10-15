# Base de datos · ROWE

Postgres en Supabase. Esquema versionado en `supabase/migrations/` (se aplica con `npm run db:migrate`).
Las migraciones ya aplicadas **no se editan**: cada cambio es un archivo nuevo (`0004_…sql`).

## Modelo borrador / publicado

```
Panel (editar) ──► tablas de contenido (borrador) ──► «Publicar» ──► releases (foto inmutable) ──► web pública
```

- El panel siempre edita las tablas de contenido. Nada de eso es visible para el público.
- `publish_release()` (solo admin) congela todo el contenido en `releases.snapshot` como una versión nueva.
- La web solo lee la última versión (`latest_release()`), cacheada y renovada al publicar.
- `republish_release(n)` vuelve a publicar una versión anterior (restaurar la web entera).
- Cada cambio en el contenido queda en `audit_log` con quién, cuándo, antes y después (historial y «Restaurar» de un cambio concreto).

## Tablas

| Tabla | Para qué |
|---|---|
| `profiles` | Usuarios del panel. `role`: `admin`, `editor` o vacío (sin acceso). Se crea solo al dar de alta el usuario en Auth. |
| `site_settings` | Ajustes por clave (`contact`, `seo`, `brand`, `cookies`, `configurator`, `hablemos`, `notifications`). `is_public` decide si entran en la web; `editor_can_edit` si los editores pueden tocarlos. |
| `scenes` | Escenas de la home: orden, visibilidad, titular, texto, botón, vídeo/póster y `data` (contenido específico de cada escena). |
| `services` | Servicios de web y audiovisual. |
| `pages` | Páginas internas y legales (bloques de contenido + SEO). |
| `projects` / `project_media` | Portfolio. `status` borrador/publicado, destacado, galería ordenada. `is_placeholder` marca los proyectos de ejemplo del diseño. |
| `config_sections` / `config_options` | Configurador de presupuesto (ver abajo). |
| `media` | Ficheros del bucket `media` de Storage con dimensiones, peso, texto alternativo y póster. |
| `releases` | Versiones publicadas. |
| `audit_log` | Historial de cambios. |
| `quotes` | Presupuestos calculados (recalculados en el servidor), numerados `ROWE-AAAA-NNNN`. |
| `leads` | Solicitudes de «Hablemos» y del configurador. Estado, notas internas, origen. |
| `email_outbox` | Cola de avisos por email con reintentos. Un fallo de email nunca borra ni bloquea el lead. |
| `events` | Analítica propia (solo con consentimiento de cookies). |
| `internal.rate_limits` | Límite de envíos por IP (anti-spam). No expuesto. |

## Configurador

- **Sección** = «toma» del diseño. `requires` la activa solo si se cumple una condición (p. ej. audiovisual solo con «Web + contenido»); mientras tanto muestra el aviso `locked_*`.
- **Opción**:
  - `control`: `card` (tipo), `segment` (botón de grupo), `toggle` (interruptor), `stepper` (contador).
  - `set_key`: opciones excluyentes entre sí (tipo, tamaño, reels).
  - `price_min` / `price_max` + `price_mode`: `once` (pago único), `monthly` (al mes), `percent_once` (% sobre el pago único, p. ej. entrega urgente).
  - `is_base`: tipo de proyecto. Sus `weeks_*` son el plazo base; en el resto son incrementos. `components` desglosa la base en varias líneas (Web a medida + Jornada de rodaje).
  - `modifies_base`: modifica la línea base en lugar de añadir una (landing).
  - `weeks_factor`: multiplica el plazo (urgente ×0,6).
  - `stepper_*`: mínimo, máximo e incluidos (idiomas: 1–4, el primero incluido).
- Reglas de redondeo, niveles, medidor y textos: ajuste `configurator`.

## Seguridad (RLS)

| Quién | Puede |
|---|---|
| Público (anon) | Leer la versión publicada. Nada más. |
| Servidor (secret key) | Crear leads, presupuestos, eventos y emails tras validar, recalcular el precio y limitar envíos. |
| Editor | Escenas, textos, páginas, servicios, proyectos, medios, mensajes (sin borrarlos), estadísticas, historial. Ajustes marcados como editables. |
| Admin | Todo: precios, usuarios, ajustes, publicar y restaurar. |

Protecciones adicionales en la base de datos:

- Nadie puede darse rol a sí mismo.
- No se puede quitar el último administrador.
- Los editores no pueden cambiar qué ajustes son públicos.
- Validación de email, longitudes y rangos de precios en la propia tabla.

> Las tablas nuevas que se creen en migraciones futuras deben activar RLS y revocar privilegios a `anon` (Supabase se los concede por defecto).

## Pruebas

`npm test` levanta un Postgres real en memoria (PGlite), aplica las migraciones y el seed, y comprueba la publicación, la restauración, el historial y los permisos de cada rol (`tests/db/`).
