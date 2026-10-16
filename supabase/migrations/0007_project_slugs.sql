-- =============================================================================
-- ROWE · 0007 · Direcciones de proyectos publicados
--   published_project_slugs()  slugs de los proyectos de la última versión publicada.
--   Lo usa el proxy para responder 404 de verdad a /proyectos/<slug-que-no-existe>
--   antes de empezar a renderizar. Devuelve null si aún no hay ninguna versión.
--   Solo lee lo que ya es público (releases).
-- =============================================================================

create or replace function public.published_project_slugs()
returns text[]
language sql stable security definer set search_path = public
as $$
  select case when r.snapshot is null then null else
    coalesce((select array_agg(p ->> 'slug') from jsonb_array_elements(r.snapshot -> 'projects') p), '{}')
  end
  from (select (select snapshot from public.releases order by version desc limit 1) as snapshot) r
$$;

revoke all on function public.published_project_slugs() from public;
grant execute on function public.published_project_slugs() to anon, authenticated;
