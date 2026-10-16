-- =============================================================================
-- ROWE · 0005 · Funciones del panel de administración
--   draft_status()      ¿hay cambios sin publicar? + última publicación y último cambio
--   admin_stats(días)   estadísticas del periodo (y del anterior, para comparar)
--   admin_users()       usuarios del panel con su último acceso (solo admin)
-- =============================================================================

create or replace function public.draft_status()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  rel record;
  last_change record;
begin
  if not (public.is_staff() or internal.is_system()) then
    raise exception 'Sin permiso' using errcode = '42501';
  end if;
  select r.version, r.published_at, r.snapshot, coalesce(nullif(p.full_name, ''), p.email, 'Sistema') as who
    into rel
    from public.releases r left join public.profiles p on p.id = r.published_by
    order by r.version desc limit 1;
  select created_at, actor_name, summary, category into last_change
    from public.audit_log where table_name <> 'releases'
    order by id desc limit 1;
  return jsonb_build_object(
    'dirty', rel.snapshot is null or public.build_snapshot() is distinct from (rel.snapshot - 'version' - 'published_at'),
    'version', rel.version,
    'published_at', rel.published_at,
    'published_by', rel.who,
    'last_change_at', last_change.created_at,
    'last_change_by', last_change.actor_name,
    'last_change', last_change.summary
  );
end $$;

create or replace function public.admin_stats(p_days int default 7)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  t1 timestamptz := now();
  t0 timestamptz := now() - make_interval(days => greatest(1, least(p_days, 731)));
  p0 timestamptz := t0 - make_interval(days => greatest(1, least(p_days, 731)));
  unit text := case when p_days > 62 then 'month' else 'day' end;
  result jsonb;
begin
  if not (public.is_staff() or internal.is_system()) then
    raise exception 'Sin permiso' using errcode = '42501';
  end if;

  with
  cur as (select * from public.events where created_at >= t0 and created_at < t1),
  prev as (select * from public.events where created_at >= p0 and created_at < t0),
  dur as (
    select 'cur' as k, avg(extract(epoch from (mx - mn))) as secs
      from (select min(created_at) mn, max(created_at) mx from cur group by session_hash having count(*) > 1) s
    union all
    select 'prev', avg(extract(epoch from (mx - mn)))
      from (select min(created_at) mn, max(created_at) mx from prev group by session_hash having count(*) > 1) s
  ),
  firsts as (
    select distinct on (session_hash) session_hash, referrer_source
      from cur where type = 'pageview' order by session_hash, created_at
  ),
  slots as (
    select g as slot from generate_series(date_trunc(unit, t0), date_trunc(unit, t1), ('1 ' || unit)::interval) g
  )
  select jsonb_build_object(
    'days', p_days,
    'unit', unit,
    'visits', (select count(*) from cur where type = 'pageview'),
    'visits_prev', (select count(*) from prev where type = 'pageview'),
    'uniques', (select count(distinct session_hash) from cur where type = 'pageview'),
    'uniques_prev', (select count(distinct session_hash) from prev where type = 'pageview'),
    'avg_seconds', coalesce((select round(secs) from dur where k = 'cur'), 0),
    'avg_seconds_prev', coalesce((select round(secs) from dur where k = 'prev'), 0),
    'lead_sessions', (select count(distinct session_hash) from cur where type = 'lead'),
    'lead_sessions_prev', (select count(distinct session_hash) from prev where type = 'lead'),
    'quote_sessions', (select count(distinct session_hash) from cur where type = 'quote'),
    'quote_sessions_prev', (select count(distinct session_hash) from prev where type = 'quote'),
    'leads', (select count(*) from public.leads where created_at >= t0),
    'leads_prev', (select count(*) from public.leads where created_at >= p0 and created_at < t0),
    'quotes_saved', (select count(*) from public.quotes where created_at >= t0),
    'bars', coalesce((
      select jsonb_agg(jsonb_build_object('slot', s.slot, 'visits',
        (select count(*) from cur where type = 'pageview' and date_trunc(unit, created_at) = s.slot)) order by s.slot)
      from slots s), '[]'::jsonb),
    'funnel', jsonb_build_object(
      'visits', (select count(distinct session_hash) from cur where type = 'pageview'),
      'video', (select count(distinct session_hash) from cur where type = 'video_play'),
      'config', (select count(distinct session_hash) from cur where type = 'config_open'),
      'lead', (select count(distinct session_hash) from cur where type = 'lead')),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object('label', referrer_source, 'count', n) order by n desc)
      from (select referrer_source, count(*) n from firsts where referrer_source <> 'Interno' group by 1) x), '[]'::jsonb),
    'pages', coalesce((
      select jsonb_agg(jsonb_build_object('path', path, 'count', n) order by n desc)
      from (select path, count(*) n from cur where type = 'pageview' group by 1 order by 2 desc limit 6) x), '[]'::jsonb)
  ) into result;
  return result;
end $$;

create or replace function public.admin_users()
returns table (id uuid, email text, full_name text, role public.user_role, last_sign_in_at timestamptz, invited_at timestamptz, confirmed boolean)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not (public.is_admin() or internal.is_system()) then
    raise exception 'Solo un administrador puede ver los usuarios' using errcode = '42501';
  end if;
  return query
    select p.id, p.email, p.full_name, p.role, u.last_sign_in_at, u.invited_at, (u.email_confirmed_at is not null)
    from public.profiles p join auth.users u on u.id = p.id
    order by p.role nulls last, p.created_at;
end $$;

revoke execute on function public.draft_status(), public.admin_stats(int), public.admin_users() from public, anon;
grant execute on function public.draft_status(), public.admin_stats(int), public.admin_users() to authenticated;
