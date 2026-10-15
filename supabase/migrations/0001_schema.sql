-- =============================================================================
-- ROWE · 0001 · Esquema base
-- Tablas de contenido (borrador), publicación (releases), leads, presupuestos,
-- medios, usuarios, historial y analítica. Documentación: docs/DATABASE.md
-- =============================================================================


-- Esquema interno: no se expone por la API pública de Supabase.
create schema if not exists internal;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.user_role      as enum ('admin', 'editor');
create type public.lead_status    as enum ('nuevo', 'contactado', 'cerrado');
create type public.lead_origin    as enum ('formulario', 'configurador');
create type public.content_status as enum ('borrador', 'publicado');
create type public.media_kind     as enum ('image', 'video', 'audio', 'other');
create type public.price_mode     as enum ('once', 'monthly', 'percent_once');
create type public.email_status   as enum ('pending', 'sent', 'failed', 'dead');

-- ---------------------------------------------------------------------------
-- Usuarios del panel
-- Un usuario de Auth sin rol (role = null) no tiene acceso a nada.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  full_name     text not null default '',
  role          public.user_role,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Medios (los ficheros viven en Supabase Storage, bucket «media»)
-- ---------------------------------------------------------------------------
create table public.media (
  id             uuid primary key default gen_random_uuid(),
  bucket         text not null default 'media',
  path           text not null unique,
  file_name      text not null,
  mime           text not null,
  kind           public.media_kind not null,
  size_bytes     bigint not null check (size_bytes >= 0),
  width          int check (width > 0),
  height         int check (height > 0),
  duration_s     numeric(8, 2) check (duration_s >= 0),
  alt            text not null default '',
  blur_data_url  text,
  poster_id      uuid references public.media (id) on delete set null,
  created_at     timestamptz not null default now(),
  created_by     uuid references public.profiles (id) on delete set null,
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Ajustes (contacto, SEO, cookies, textos del formulario, configurador…)
-- is_public: entra en la versión publicada que ve la web.
-- editor_can_edit: los editores pueden modificarlo (si no, solo admin).
-- ---------------------------------------------------------------------------
create table public.site_settings (
  key              text primary key check (key ~ '^[a-z][a-z0-9_]*$'),
  label            text not null,
  value            jsonb not null,
  is_public        boolean not null default true,
  editor_can_edit  boolean not null default false,
  updated_at       timestamptz not null default now(),
  updated_by       uuid references public.profiles (id) on delete set null
);

-- ---------------------------------------------------------------------------
-- Escenas de la home (orden, visibilidad y textos editables)
-- data: contenido específico de cada escena (manifiesto, pasos, cifras…)
-- ---------------------------------------------------------------------------
create table public.scenes (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique check (key ~ '^[a-z][a-z0-9_]*$'),
  position    int not null,
  visible     boolean not null default true,
  name        text not null,
  kicker      text not null default '',
  title       text not null default '' check (char_length(title) <= 200),
  body        text not null default '' check (char_length(body) <= 2000),
  cta_label   text not null default '',
  cta_href    text not null default '',
  media_id    uuid references public.media (id) on delete set null,
  poster_id   uuid references public.media (id) on delete set null,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null
);
create index scenes_position_idx on public.scenes (position);

-- ---------------------------------------------------------------------------
-- Servicios de cada disciplina (WE = web, RO = audiovisual)
-- ---------------------------------------------------------------------------
create table public.services (
  id           uuid primary key default gen_random_uuid(),
  discipline   text not null check (discipline in ('web', 'audiovisual')),
  slug         text not null unique check (slug ~ '^[a-z0-9-]+$'),
  position     int not null,
  visible      boolean not null default true,
  title        text not null,
  description  text not null default '',
  media_id     uuid references public.media (id) on delete set null,
  updated_at   timestamptz not null default now(),
  updated_by   uuid references public.profiles (id) on delete set null
);

-- ---------------------------------------------------------------------------
-- Páginas internas y legales (contenido por bloques)
-- ---------------------------------------------------------------------------
create table public.pages (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9-]+$'),
  kind             text not null check (kind in ('service', 'projects', 'contact', 'legal', 'system')),
  title            text not null,
  intro            text not null default '',
  blocks           jsonb not null default '[]'::jsonb,
  seo_title        text not null default '',
  seo_description  text not null default '',
  og_media_id      uuid references public.media (id) on delete set null,
  updated_at       timestamptz not null default now(),
  updated_by       uuid references public.profiles (id) on delete set null
);

-- ---------------------------------------------------------------------------
-- Proyectos / portfolio
-- is_placeholder: proyecto de ejemplo del diseño; hay que sustituirlo antes del lanzamiento.
-- ---------------------------------------------------------------------------
create table public.projects (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title            text not null default '',
  client           text not null default '',
  sector           text not null default '',
  year             int check (year between 2000 and 2100),
  category         text not null default 'Web' check (category in ('Web', 'Audiovisual', 'Web + Audiovisual')),
  summary          text not null default '',
  challenge        text not null default '',
  solution         text not null default '',
  result           text not null default '',
  metrics          jsonb not null default '[]'::jsonb,
  cover_id         uuid references public.media (id) on delete set null,
  video_id         uuid references public.media (id) on delete set null,
  client_url       text not null default '',
  seo_title        text not null default '',
  seo_description  text not null default '',
  status           public.content_status not null default 'borrador',
  featured         boolean not null default false,
  is_placeholder   boolean not null default false,
  position         int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  updated_by       uuid references public.profiles (id) on delete set null
);
create index projects_position_idx on public.projects (position);

create table public.project_media (
  project_id  uuid not null references public.projects (id) on delete cascade,
  media_id    uuid not null references public.media (id) on delete cascade,
  position    int not null default 0,
  primary key (project_id, media_id)
);

-- ---------------------------------------------------------------------------
-- Configurador de presupuesto
-- Secciones = «tomas». Opciones con precio mín/máx, modo de precio y plazo.
-- Reglas del motor: src/features/configurator/engine.ts (documentadas allí).
-- ---------------------------------------------------------------------------
create table public.config_sections (
  id             uuid primary key default gen_random_uuid(),
  key            text not null unique check (key ~ '^[a-z][a-z0-9_]*$'),
  position       int not null,
  visible        boolean not null default true,
  take_label     text not null,
  title          text not null,
  description    text not null default '',
  -- Si se cumple, la sección está activa. Ej: {"set":"tipo","in":["contenido"]}
  requires       jsonb,
  locked_title   text not null default '',
  locked_body    text not null default '',
  locked_cta     text not null default '',
  -- Opción que se elige al pulsar el botón del aviso de bloqueo
  locked_select  text not null default '',
  updated_at     timestamptz not null default now(),
  updated_by     uuid references public.profiles (id) on delete set null
);

create table public.config_options (
  id                uuid primary key default gen_random_uuid(),
  section_key       text not null references public.config_sections (key) on update cascade on delete cascade,
  key               text not null unique check (key ~ '^[a-z][a-z0-9_]*$'),
  position          int not null,
  visible           boolean not null default true,
  -- card: tarjeta (tipo) · segment: botón de un grupo · toggle: interruptor · stepper: contador
  control           text not null check (control in ('card', 'segment', 'toggle', 'stepper')),
  -- Opciones con el mismo set_key son excluyentes entre sí (elección única)
  set_key           text,
  set_label         text not null default '',
  set_description   text not null default '',
  badge             text not null default '',
  label             text not null,
  description       text not null default '',
  -- Texto en el resumen/PDF. {n} = cantidad (stepper)
  line_label        text not null default '',
  price_min         int not null default 0,
  price_max         int not null default 0,
  price_mode        public.price_mode not null default 'once',
  unit_label        text not null default '',
  track             text not null default 'WE' check (track in ('WE', 'RO')),
  -- Opción base (tipo de proyecto): weeks_* son absolutos; en el resto, incrementos
  is_base           boolean not null default false,
  -- Desglose de la opción base en varias líneas (Web + contenido)
  components        jsonb,
  -- Modifica la línea base en vez de crear una línea propia (landing)
  modifies_base     boolean not null default false,
  base_suffix       text not null default '',
  weeks_min         int not null default 0,
  weeks_max         int not null default 0,
  weeks_factor      numeric(4, 2),
  stepper_min       int,
  stepper_max       int,
  stepper_included  int,
  is_default        boolean not null default false,
  requires          jsonb,
  updated_at        timestamptz not null default now(),
  updated_by        uuid references public.profiles (id) on delete set null,
  constraint config_price_range check (price_mode = 'percent_once' or abs(price_min) <= abs(price_max)),
  constraint config_weeks_range check (weeks_min <= weeks_max),
  constraint config_set_key check (control not in ('card', 'segment') or set_key is not null),
  constraint config_stepper check (control <> 'stepper' or (stepper_min is not null and stepper_max is not null and stepper_min <= stepper_max))
);
create index config_options_section_idx on public.config_options (section_key, position);

-- ---------------------------------------------------------------------------
-- Publicación: cada «Publicar» crea una foto inmutable del contenido.
-- La web pública solo lee la última versión.
-- ---------------------------------------------------------------------------
create table public.releases (
  id            bigint generated always as identity primary key,
  version       int not null unique,
  snapshot      jsonb not null,
  note          text not null default '',
  published_by  uuid references public.profiles (id) on delete set null,
  published_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Historial de cambios (alimentado por triggers)
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  record_id   text not null,
  action      text not null check (action in ('insert', 'update', 'delete', 'publish', 'restore')),
  category    text not null,
  summary     text not null default '',
  before      jsonb,
  after       jsonb,
  actor       uuid references public.profiles (id) on delete set null,
  actor_name  text not null default 'Sistema',
  created_at  timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_record_idx on public.audit_log (table_name, record_id);

-- ---------------------------------------------------------------------------
-- Presupuestos calculados (recalculados SIEMPRE en el servidor)
-- ---------------------------------------------------------------------------
create sequence public.quote_number_seq;

create table public.quotes (
  id                uuid primary key default gen_random_uuid(),
  number            text not null unique,
  selections        jsonb not null,
  items             jsonb not null,
  one_min           int not null,
  one_max           int not null,
  monthly_min       int not null default 0,
  monthly_max       int not null default 0,
  weeks_min         int not null,
  weeks_max         int not null,
  level             text not null,
  release_version   int not null,
  pdf_downloaded_at timestamptz,
  created_at        timestamptz not null default now()
);
create index quotes_created_idx on public.quotes (created_at desc);

-- ---------------------------------------------------------------------------
-- Leads («Hablemos» y configurador). Nunca se borran por un fallo de email.
-- ---------------------------------------------------------------------------
create table public.leads (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  origin               public.lead_origin not null,
  need                 text not null check (char_length(need) between 1 and 80),
  sector               text not null default '' check (char_length(sector) <= 80),
  budget_label         text not null default '' check (char_length(budget_label) <= 160),
  message              text not null default '' check (char_length(message) <= 600),
  name                 text not null check (char_length(name) between 1 and 120),
  company              text not null default '' check (char_length(company) <= 160),
  email                text not null check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' and char_length(email) <= 254),
  phone                text not null default '' check (char_length(phone) <= 40),
  privacy_accepted_at  timestamptz not null,
  status               public.lead_status not null default 'nuevo',
  notes                text not null default '' check (char_length(notes) <= 5000),
  quote_id             uuid references public.quotes (id) on delete set null,
  source               jsonb not null default '{}'::jsonb,
  ip_hash              text,
  user_agent           text not null default '',
  updated_at           timestamptz not null default now(),
  updated_by           uuid references public.profiles (id) on delete set null
);
create index leads_created_idx on public.leads (created_at desc);
create index leads_status_idx on public.leads (status);

-- ---------------------------------------------------------------------------
-- Cola de emails (aviso de lead). Si el envío falla, se reintenta.
-- ---------------------------------------------------------------------------
create table public.email_outbox (
  id               bigint generated always as identity primary key,
  lead_id          uuid references public.leads (id) on delete cascade,
  template         text not null,
  to_addresses     text[] not null,
  payload          jsonb not null default '{}'::jsonb,
  status           public.email_status not null default 'pending',
  attempts         int not null default 0,
  last_error       text,
  next_attempt_at  timestamptz not null default now(),
  sent_at          timestamptz,
  created_at       timestamptz not null default now()
);
create index email_outbox_pending_idx on public.email_outbox (status, next_attempt_at);

-- ---------------------------------------------------------------------------
-- Analítica propia (solo con consentimiento). Sin IP ni cookies de terceros.
-- ---------------------------------------------------------------------------
create table public.events (
  id               bigint generated always as identity primary key,
  created_at       timestamptz not null default now(),
  type             text not null check (type in ('pageview', 'video_play', 'config_open', 'quote', 'lead', 'pdf')),
  path             text not null default '/' check (char_length(path) <= 300),
  referrer_source  text not null default 'Directo' check (char_length(referrer_source) <= 60),
  session_hash     text not null check (char_length(session_hash) <= 64),
  duration_ms      int check (duration_ms >= 0),
  meta             jsonb not null default '{}'::jsonb
);
create index events_created_idx on public.events (created_at desc);
create index events_type_created_idx on public.events (type, created_at desc);

-- ---------------------------------------------------------------------------
-- Límite de envíos por IP (anti-spam). Interno.
-- ---------------------------------------------------------------------------
create table internal.rate_limits (
  key           text primary key,
  window_start  timestamptz not null,
  count         int not null
);
