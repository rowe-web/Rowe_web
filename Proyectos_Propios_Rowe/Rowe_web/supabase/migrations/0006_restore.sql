-- =============================================================================
-- ROWE · 0006 · Restaurar cambios desde el historial
--   restore_change(id)  deshace un cambio del historial en el BORRADOR:
--                       · edición  → vuelve a los valores anteriores
--                       · borrado  → recrea el registro
--                       · creación → elimina lo creado
--   Se ejecuta con los permisos de quien lo pide (RLS): un editor no puede
--   restaurar precios ni ajustes críticos. Queda en el historial como «Restauró».
-- =============================================================================

-- El registro de cambios distingue las restauraciones (variable de la transacción).
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
  restoring boolean := coalesce(current_setting('rowe.restoring', true), '') = 'on';
begin
  -- Ignora actualizaciones que solo tocan metadatos.
  if tg_op = 'UPDATE' and (b - 'updated_at' - 'updated_by') = (a - 'updated_at' - 'updated_by') then
    return new;
  end if;
  select coalesce(nullif(full_name, ''), email) into who_name from public.profiles where id = who;
  verb := case
    when restoring then 'Restauró'
    when tg_op = 'INSERT' then 'Creó'
    when tg_op = 'UPDATE' then 'Editó'
    else 'Eliminó' end;
  insert into public.audit_log (table_name, record_id, action, category, summary, before, after, actor, actor_name)
  values (
    tg_table_name,
    coalesce(rec ->> 'id', rec ->> 'key', ''),
    case when restoring then 'restore' else lower(tg_op) end,
    tg_argv[0],
    verb || ' «' || internal.record_label(rec) || '»' || case when restoring and tg_op = 'DELETE' then ' (deshizo su creación)' else '' end,
    b,
    a,
    who,
    coalesce(who_name, 'Sistema')
  );
  return coalesce(new, old);
end $$;

create or replace function public.restore_change(p_id bigint)
returns text
language plpgsql volatile security invoker set search_path = public
as $$
declare
  entry public.audit_log;
  pk text;
  pk_val text;
  cols text;
  n int;
begin
  if not public.is_staff() then
    raise exception 'Sin permiso' using errcode = '42501';
  end if;
  select * into entry from public.audit_log where id = p_id;
  if entry.id is null then
    raise exception 'Ese cambio ya no existe en el historial' using errcode = 'P0002';
  end if;
  if entry.table_name not in ('scenes', 'services', 'pages', 'site_settings', 'projects', 'config_sections', 'config_options') then
    raise exception 'Este tipo de cambio no se puede restaurar' using errcode = '22023';
  end if;

  pk := case entry.table_name when 'site_settings' then 'key' else 'id' end;
  pk_val := entry.record_id;
  perform set_config('rowe.restoring', 'on', true);

  if entry.action in ('update', 'restore') and entry.before is not null and entry.after is not null then
    -- Vuelve a los valores de antes (sin tocar la clave ni las marcas de tiempo)
    select string_agg(format('%I = r.%I', k, k), ', ') into cols
      from jsonb_object_keys(entry.before) k
      where k not in ('id', 'key', 'created_at', 'updated_at', 'updated_by')
        and exists (select 1 from information_schema.columns c
                    where c.table_schema = 'public' and c.table_name = entry.table_name and c.column_name = k);
    execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I, $1) r where t.%I::text = $2',
                   entry.table_name, cols, entry.table_name, pk)
      using entry.before, pk_val;
    get diagnostics n = row_count;
    if n = 0 then
      raise exception 'Ese elemento ya no existe (se eliminó después). Restaura antes su borrado.' using errcode = 'P0002';
    end if;
  elsif entry.action = 'delete' or (entry.action = 'restore' and entry.after is null) then
    execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, $1) on conflict do nothing',
                   entry.table_name, entry.table_name)
      using entry.before;
    get diagnostics n = row_count;
    if n = 0 then
      raise exception 'Ya existe un elemento con ese identificador; no se puede recrear.' using errcode = '23505';
    end if;
  elsif entry.action = 'insert' or (entry.action = 'restore' and entry.before is null) then
    execute format('delete from public.%I where %I::text = $1', entry.table_name, pk) using pk_val;
  else
    raise exception 'Este cambio no se puede restaurar' using errcode = '22023';
  end if;

  perform set_config('rowe.restoring', '', true);
  return entry.summary;
end $$;

revoke execute on function public.restore_change(bigint) from public, anon;
grant execute on function public.restore_change(bigint) to authenticated;
