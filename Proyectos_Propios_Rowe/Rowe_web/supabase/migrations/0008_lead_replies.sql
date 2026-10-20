-- =============================================================================
-- ROWE · 0008 · Respuestas enviadas desde el panel
--   Cada respuesta a un mensaje (lead) que se envía desde el panel por la cuenta
--   de email de ROWE queda registrada aquí, con su estado (enviada / fallida).
--   Solo el equipo puede leerlas; solo el servidor (service_role) puede crearlas.
-- =============================================================================

create table public.lead_replies (
  id             bigint generated always as identity primary key,
  lead_id        uuid not null references public.leads (id) on delete cascade,
  created_at     timestamptz not null default now(),
  sent_by        uuid references public.profiles (id) on delete set null,
  sent_by_name   text not null default '' check (char_length(sent_by_name) <= 160),
  from_email     text not null default '' check (char_length(from_email) <= 254),
  to_email       text not null check (char_length(to_email) <= 254),
  subject        text not null check (char_length(subject) between 1 and 200),
  body           text not null check (char_length(body) between 1 and 10000),
  status         text not null check (status in ('sent', 'failed')),
  error          text,
  message_id     text
);
create index lead_replies_lead_idx on public.lead_replies (lead_id, created_at desc);

alter table public.lead_replies enable row level security;

create policy lead_replies_staff_read on public.lead_replies for select to authenticated
  using (public.is_staff());

revoke all on public.lead_replies from anon;
grant select on public.lead_replies to authenticated;
revoke insert, update, delete on public.lead_replies from authenticated;
