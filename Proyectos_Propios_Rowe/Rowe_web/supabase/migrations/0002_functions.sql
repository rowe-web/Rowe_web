-- =============================================================================
-- ROWE · 0002 · Funciones, triggers, historial y publicación
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
create or replace function public.current_app_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.current_app_role() = 'admin', false) $$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.current_app_role() is not null $$;

-- Procesos del servidor (service_role) y scripts de mantenimiento no llevan usuario.
create or replace function internal.is_system()
returns boolean
language sql stable
as $$ select auth.uid() is null $$;

-- ---------------------------------------------------------------------------
-- updated_at / updated_by automáticos
-- ---------------------------------------------------------------------------
create or replace function internal.touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function internal.touch_with_actor()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if auth.uid() is not null then
    new.updated_by := auth.uid();
  end if;
  return new;
end $$;

create trigger profiles_touch before update on public.profiles for each row execute function internal.touch();
create trigger media_touch before update on public.media for each row execute function internal.touch();
create trigger site_settings_touch before insert or update on public.site_settings for each row execute function internal.touch_with_actor();
create trigger scenes_touch before insert or update on public.scenes for each row execute function internal.touch_with_actor();
create trigger services_touch before insert or update on public.services for each row execute function internal.touch_with_actor();
create trigger pages_touch before insert or update on public.pages for each row execute function internal.touch_with_actor();
create trigger projects_touch before insert or update on public.projects for each row execute function internal.touch_with_actor();
create trigger config_sections_touch before insert or update on public.config_sections for each row execute function internal.touch_with_actor();
create trigger config_options_touch before insert or update on public.config_options for each row execute function internal.touch_with_actor();
create trigger leads_touch before update on public.leads for each row execute function internal.touch_with_actor();

-- ---------------------------------------------------------------------------
-- Alta de usuarios: al crear/invitar un usuario en Auth se crea su perfil.
-- El rol solo se toma de app_metadata (que solo puede escribir el servidor).
-- ---------------------------------------------------------------------------
create or replace function internal.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  r text := new.raw_app_meta_data ->> 'role';
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    case when r in ('admin', 'editor') then r::public.user_role end
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function internal.handle_new_user();

-- Solo un admin puede cambiar roles, y nunca puede quedarse la web sin administradores.
create or replace function internal.guard_profile()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role and not (public.is_admin() or internal.is_system()) then
      raise exception 'Solo un administrador puede cambiar roles' using errcode = '42501';
    end if;
    if new.email is distinct from old.email and not internal.is_system() then
      raise exception 'El email se cambia desde la cuenta de acceso' using errcode = '42501';
    end if;
  end if;
  if (tg_op = 'DELETE' and old.role = 'admin')
     or (tg_op = 'UPDATE' and old.role = 'admin' and new.role is distinct from 'admin') then
    if (select count(*) from public.profiles where role = 'admin' and id <> old.id) = 0 then
      raise exception 'Debe quedar al menos un administrador' using errcode = '23514';
    end if;
  end if;
  return coalesce(new, old);
end $$;

create trigger profiles_guard before update or delete on public.profiles
  for each row execute function internal.guard_profile();

-- Los editores no pueden cambiar qué ajustes son públicos ni cuáles pueden editar.
create or replace function internal.guard_settings()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not (public.is_admin() or internal.is_system()) then
    if tg_op = 'INSERT' or new.is_public is distinct from old.is_public
       or new.editor_can_edit is distinct from old.editor_can_edit or new.key is distinct from old.key then
      raise exception 'Solo un administrador puede cambiar la configuración de los ajustes' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger site_settings_guard before insert or update on public.site_settings
  for each row execute function internal.guard_settings();

-- ---------------------------------------------------------------------------
-- Historial de cambios
-- trigger args: categoría visible en el panel (Textos, Proyectos, Precios…)
-- ---------------------------------------------------------------------------
create or replace function internal.record_label(rec jsonb)
returns text language sql immutable as $$
  select coalesce(
    nullif(rec ->> 'name', ''), nullif(rec ->> 'title', ''), nullif(rec ->> 'label', ''),
    nullif(rec ->> 'file_name', ''), nullif(rec ->> 'key', ''), nullif(rec ->> 'slug', ''), 'registro')
$$;

create or replace function internal.log_change()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  b jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  a jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  rec jsonb := coalesce(a, b);
  who uuid := auth.uid();
  who_name text;
  verb text;
begin
  -- Ignora actualizaciones que solo tocan metadatos.
  if tg_op = 'UPDATE' and (b - 'updated_at' - 'updated_by') = (a - 'updated_at' - 'updated_by') then
    return new;
  end if;
  select coalesce(nullif(full_name, ''), email) into who_name from public.profiles where id = who;
  verb := case tg_op when 'INSERT' then 'Creó' when 'UPDATE' then 'Editó' else 'Eliminó' end;
  insert into public.audit_log (table_name, record_id, action, category, summary, before, after, actor, actor_name)
  values (
    tg_table_name,
    coalesce(rec ->> 'id', rec ->> 'key', ''),
    lower(tg_op),
    tg_argv[0],
    verb || ' «' || internal.record_label(rec) || '»',
    b,
    a,
    who,
    coalesce(who_name, 'Sistema')
  );
  return coalesce(new, old);
end $$;

create trigger scenes_audit after insert or update or delete on public.scenes for each row execute function internal.log_change('Textos');
create trigger services_audit after insert or update or delete on public.services for each row execute function internal.log_change('Textos');
create trigger pages_audit after insert or update or delete on public.pages for each row execute function internal.log_change('Textos');
create trigger settings_audit after insert or update or delete on public.site_settings for each row execute function internal.log_change('Ajustes');
create trigger projects_audit after insert or update or delete on public.projects for each row execute function internal.log_change('Proyectos');
create trigger config_sections_audit after insert or update or delete on public.config_sections for each row execute function internal.log_change('Precios');
create trigger config_options_audit after insert or update or delete on public.config_options for each row execute function internal.log_change('Precios');
create trigger media_audit after insert or delete on public.media for each row execute function internal.log_change('Medios');

-- ---------------------------------------------------------------------------
-- Número de presupuesto: ROWE-2026-0001
-- ---------------------------------------------------------------------------
create or replace function public.next_quote_number()
returns text language sql volatile security definer set search_path = public
as $$
  select 'ROWE-' || to_char(now() at time zone 'Europe/Madrid', 'YYYY') || '-' || lpad(nextval('public.quote_number_seq')::text, 4, '0')
$$;

alter table public.quotes alter column number set default public.next_quote_number();

-- ---------------------------------------------------------------------------
-- Límite de envíos (anti-spam). Devuelve true si la petición está permitida.
-- ---------------------------------------------------------------------------
create or replace function public.check_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql volatile security definer set search_path = internal, public
as $$
declare
  current_count int;
begin
  insert into internal.rate_limits as rl (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set count = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1 else rl.count + 1 end,
        window_start = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then now() else rl.window_start end
  returning count into current_count;
  -- Limpieza oportunista de ventanas antiguas
  delete from internal.rate_limits where window_start < now() - interval '1 day';
  return current_count <= p_limit;
end $$;

-- ---------------------------------------------------------------------------
-- Publicación
-- build_snapshot: contenido actual (borrador) en el formato que consume la web.
-- publish_release: congela ese contenido como nueva versión pública.
-- ---------------------------------------------------------------------------
create or replace function public.build_snapshot()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  if not (public.is_staff() or internal.is_system()) then
    raise exception 'Sin permiso' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'settings', coalesce((select jsonb_object_agg(key, value) from public.site_settings where is_public), '{}'::jsonb),
    'scenes', coalesce((
      select jsonb_agg(to_jsonb(s) - 'updated_by' - 'updated_at' order by s.position)
      from public.scenes s where s.visible), '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(to_jsonb(s) - 'updated_by' - 'updated_at' order by s.discipline, s.position)
      from public.services s where s.visible), '[]'::jsonb),
    'pages', coalesce((
      select jsonb_object_agg(p.slug, to_jsonb(p) - 'updated_by' - 'updated_at')
      from public.pages p), '{}'::jsonb),
    'projects', coalesce((
      select jsonb_agg(
        (to_jsonb(p) - 'updated_by' - 'updated_at' - 'is_placeholder')
        || jsonb_build_object('gallery', coalesce((
             select jsonb_agg(pm.media_id order by pm.position)
             from public.project_media pm where pm.project_id = p.id), '[]'::jsonb))
        order by p.position, p.year desc nulls last)
      from public.projects p where p.status = 'publicado'), '[]'::jsonb),
    'configurator', jsonb_build_object(
      'sections', coalesce((
        select jsonb_agg(to_jsonb(c) - 'updated_by' - 'updated_at' - 'id' order by c.position)
        from public.config_sections c where c.visible), '[]'::jsonb),
      'options', coalesce((
        select jsonb_agg(to_jsonb(o) - 'updated_by' - 'updated_at' - 'id' order by o.position)
        from public.config_options o
        join public.config_sections c on c.key = o.section_key
        where o.visible and c.visible), '[]'::jsonb)),
    'media', coalesce((
      select jsonb_object_agg(m.id, to_jsonb(m) - 'created_by' - 'updated_at')
      from public.media m), '{}'::jsonb)
  );
end $$;

create or replace function public.publish_release(p_note text default '')
returns int
language plpgsql volatile security definer set search_path = public
as $$
declare
  v int;
  who_name text;
begin
  if not (public.is_admin() or internal.is_system()) then
    raise exception 'Solo un administrador puede publicar' using errcode = '42501';
  end if;
  lock table public.releases in exclusive mode;
  select coalesce(max(version), 0) + 1 into v from public.releases;
  insert into public.releases (version, snapshot, note, published_by)
  values (v, public.build_snapshot() || jsonb_build_object('version', v, 'published_at', now()), coalesce(p_note, ''), auth.uid());
  select coalesce(nullif(full_name, ''), email) into who_name from public.profiles where id = auth.uid();
  insert into public.audit_log (table_name, record_id, action, category, summary, actor, actor_name)
  values ('releases', v::text, 'publish', 'Publicación',
          'Publicó la versión ' || v || case when coalesce(p_note, '') <> '' then ' · ' || p_note else '' end,
          auth.uid(), coalesce(who_name, 'Sistema'));
  return v;
end $$;

-- Vuelve a publicar una versión anterior (crea una versión nueva con su contenido).
create or replace function public.republish_release(p_version int)
returns int
language plpgsql volatile security definer set search_path = public
as $$
declare
  snap jsonb;
  v int;
  who_name text;
begin
  if not (public.is_admin() or internal.is_system()) then
    raise exception 'Solo un administrador puede publicar' using errcode = '42501';
  end if;
  select snapshot into snap from public.releases where version = p_version;
  if snap is null then
    raise exception 'La versión % no existe', p_version using errcode = 'P0002';
  end if;
  lock table public.releases in exclusive mode;
  select coalesce(max(version), 0) + 1 into v from public.releases;
  insert into public.releases (version, snapshot, note, published_by)
  values (v, snap || jsonb_build_object('version', v, 'published_at', now()), 'Restaurada desde la versión ' || p_version, auth.uid());
  select coalesce(nullif(full_name, ''), email) into who_name from public.profiles where id = auth.uid();
  insert into public.audit_log (table_name, record_id, action, category, summary, actor, actor_name)
  values ('releases', v::text, 'restore', 'Publicación', 'Restauró la versión publicada ' || p_version,
          auth.uid(), coalesce(who_name, 'Sistema'));
  return v;
end $$;

-- Versión pública vigente (lo único que necesita la web).
create or replace function public.latest_release()
returns jsonb
language sql stable security definer set search_path = public
as $$ select snapshot from public.releases order by version desc limit 1 $$;
