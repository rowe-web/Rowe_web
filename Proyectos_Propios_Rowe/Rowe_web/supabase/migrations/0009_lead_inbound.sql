-- =============================================================================
-- ROWE · 0009 · Respuestas de los clientes por email + avisos en tiempo real
--   lead_inbound      emails que los clientes contestan a ROWE, asociados a su mensaje
--                     (se leen del buzón de ROWE por IMAP: src/lib/email/inbox.ts).
--   mail_sync_state   estado de la lectura del buzón (último UID leído). Solo servidor.
--   Realtime          leads y lead_inbound emiten sus altas al panel (con RLS: solo el
--                     equipo las recibe).
-- =============================================================================

create table public.lead_inbound (
  id             bigint generated always as identity primary key,
  lead_id        uuid not null references public.leads (id) on delete cascade,
  received_at    timestamptz not null,
  created_at     timestamptz not null default now(),
  from_email     text not null check (char_length(from_email) <= 254),
  from_name      text not null default '' check (char_length(from_name) <= 160),
  subject        text not null default '' check (char_length(subject) <= 300),
  -- Texto nuevo de la respuesta (sin la cita del email anterior) y el texto completo
  body           text not null default '' check (char_length(body) <= 20000),
  full_text      text not null default '' check (char_length(full_text) <= 60000),
  attachments    int not null default 0,
  message_id     text not null unique check (char_length(message_id) <= 998),
  in_reply_to    text,
  -- Cómo se asoció al mensaje: «thread» (cabeceras del email) o «sender» (mismo remitente)
  matched_by     text not null check (matched_by in ('thread', 'sender')),
  seen_at        timestamptz
);
create index lead_inbound_lead_idx on public.lead_inbound (lead_id, received_at);
create index lead_inbound_unseen_idx on public.lead_inbound (lead_id) where seen_at is null;

alter table public.lead_inbound enable row level security;
create policy lead_inbound_staff_read on public.lead_inbound for select to authenticated
  using (public.is_staff());
revoke all on public.lead_inbound from anon;
grant select on public.lead_inbound to authenticated;
revoke insert, update, delete on public.lead_inbound from authenticated;

create table public.mail_sync_state (
  id             int primary key default 1 check (id = 1),
  mailbox        text not null default 'INBOX',
  uid_validity   bigint,
  last_uid       bigint not null default 0,
  running_since  timestamptz,
  last_run_at    timestamptz,
  last_error     text,
  last_imported  int not null default 0
);
insert into public.mail_sync_state (id) values (1) on conflict do nothing;
alter table public.mail_sync_state enable row level security;
revoke all on public.mail_sync_state from anon, authenticated;

-- Reserva la lectura del buzón: nunca dos a la vez (varias pestañas del panel, la tarea
-- programada…) ni más de una cada `min_interval` segundos. Una lectura que se quedó colgada
-- más de 3 minutos se da por perdida. Devuelve el estado si la reserva es nuestra; si no, nada.
create or replace function public.claim_mail_sync(min_interval int default 20)
returns setof public.mail_sync_state
language sql volatile security definer set search_path = public
as $$
  update public.mail_sync_state
     set running_since = now()
   where id = 1
     and (running_since is null or running_since < now() - interval '3 minutes')
     and (last_run_at is null or last_run_at < now() - make_interval(secs => min_interval))
  returning *
$$;
revoke all on function public.claim_mail_sync(int) from public, anon, authenticated;
grant execute on function public.claim_mail_sync(int) to service_role;

-- Realtime (solo existe en Supabase; en las pruebas locales con PGlite no hay publicación)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leads') then
      alter publication supabase_realtime add table public.leads;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lead_inbound') then
      alter publication supabase_realtime add table public.lead_inbound;
    end if;
  end if;
end
$$;
