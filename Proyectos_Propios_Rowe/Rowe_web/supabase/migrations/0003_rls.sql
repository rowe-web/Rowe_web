-- =============================================================================
-- ROWE · 0003 · Seguridad (Row Level Security)
--
-- Público (anon):   solo lee la versión publicada (releases). No escribe nada:
--                   los leads, presupuestos y eventos entran por el servidor
--                   (service_role) tras validar, recalcular y limitar envíos.
-- Editor:           contenido en borrador (escenas, textos, páginas, servicios,
--                   proyectos, medios), mensajes y estadísticas. No publica,
--                   no ve precios, usuarios ni ajustes críticos.
-- Administrador:    todo.
-- =============================================================================

alter table public.profiles        enable row level security;
alter table public.media           enable row level security;
alter table public.site_settings   enable row level security;
alter table public.scenes          enable row level security;
alter table public.services        enable row level security;
alter table public.pages           enable row level security;
alter table public.projects        enable row level security;
alter table public.project_media   enable row level security;
alter table public.config_sections enable row level security;
alter table public.config_options  enable row level security;
alter table public.releases        enable row level security;
alter table public.audit_log       enable row level security;
alter table public.quotes          enable row level security;
alter table public.leads           enable row level security;
alter table public.email_outbox    enable row level security;
alter table public.events          enable row level security;

-- Defensa en profundidad: el rol público no tiene privilegios sobre nada salvo releases.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select on public.releases to anon;
revoke all on schema internal from anon, authenticated;
revoke all on all tables in schema internal from anon, authenticated;

-- El panel trabaja con el rol authenticated (RLS decide qué filas).
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Funciones: solo las necesarias, y a quien corresponde.
revoke execute on all functions in schema public from public, anon;
grant execute on function public.current_app_role(), public.is_admin(), public.is_staff() to authenticated;
grant execute on function public.build_snapshot(), public.publish_release(text), public.republish_release(int) to authenticated;
grant execute on function public.latest_release() to anon, authenticated;
revoke execute on function public.check_rate_limit(text, int, int) from authenticated;
revoke execute on function public.next_quote_number() from authenticated;

-- ---------------------------------------------------------------------------
-- Versión publicada: lectura pública
-- ---------------------------------------------------------------------------
create policy releases_public_read on public.releases for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------------
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy profiles_admin_delete on public.profiles for delete to authenticated
  using (public.is_admin() and id <> auth.uid());

-- ---------------------------------------------------------------------------
-- Contenido editable por todo el equipo
-- ---------------------------------------------------------------------------
create policy media_staff_all on public.media for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy scenes_staff_all on public.scenes for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy services_staff_all on public.services for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy pages_staff_all on public.pages for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy projects_staff_all on public.projects for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy project_media_staff_all on public.project_media for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- Ajustes: el equipo lee; edita el admin, o el editor si el ajuste lo permite
-- ---------------------------------------------------------------------------
create policy settings_staff_read on public.site_settings for select to authenticated
  using (public.is_staff());
create policy settings_write on public.site_settings for update to authenticated
  using (public.is_admin() or (public.is_staff() and editor_can_edit))
  with check (public.is_admin() or (public.is_staff() and editor_can_edit));
create policy settings_admin_insert on public.site_settings for insert to authenticated
  with check (public.is_admin());
create policy settings_admin_delete on public.site_settings for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Precios del configurador: solo administradores
-- ---------------------------------------------------------------------------
create policy config_sections_admin on public.config_sections for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy config_options_admin on public.config_options for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Historial: el equipo lo lee; solo escriben los triggers
-- ---------------------------------------------------------------------------
create policy audit_staff_read on public.audit_log for select to authenticated
  using (public.is_staff());

-- ---------------------------------------------------------------------------
-- Mensajes (leads): el equipo los lee y gestiona; solo el admin los borra
-- ---------------------------------------------------------------------------
create policy leads_staff_read on public.leads for select to authenticated
  using (public.is_staff());
create policy leads_staff_update on public.leads for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy leads_admin_delete on public.leads for delete to authenticated
  using (public.is_admin());

create policy quotes_staff_read on public.quotes for select to authenticated
  using (public.is_staff());
create policy events_staff_read on public.events for select to authenticated
  using (public.is_staff());
create policy outbox_admin_read on public.email_outbox for select to authenticated
  using (public.is_admin());

-- Los leads, presupuestos, eventos y emails no tienen política de INSERT:
-- solo el servidor (service_role, que ignora RLS) puede crearlos.
revoke insert on public.leads, public.quotes, public.events, public.email_outbox, public.releases, public.audit_log from authenticated;
revoke update, delete on public.releases, public.audit_log, public.quotes, public.events, public.email_outbox from authenticated;

-- ---------------------------------------------------------------------------
-- Storage: bucket público «media» (lectura pública de ficheros);
-- solo el equipo sube, reemplaza o borra.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/mp4'])
on conflict (id) do nothing;

create policy media_objects_staff_read on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_staff());
create policy media_objects_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_staff());
create policy media_objects_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_staff()) with check (bucket_id = 'media' and public.is_staff());
create policy media_objects_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_staff());
