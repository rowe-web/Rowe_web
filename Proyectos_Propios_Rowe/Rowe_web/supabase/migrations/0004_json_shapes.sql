-- =============================================================================
-- ROWE · 0004 · Forma de los campos JSON
-- Impide guardar JSON con la forma equivocada (p. ej. un objeto guardado como
-- texto JSON por una doble serialización): la base de datos lo rechaza.
-- =============================================================================

alter table public.site_settings  add constraint site_settings_value_object check (jsonb_typeof(value) = 'object');
alter table public.scenes         add constraint scenes_data_object         check (jsonb_typeof(data) = 'object');
alter table public.pages          add constraint pages_blocks_array         check (jsonb_typeof(blocks) = 'array');
alter table public.projects       add constraint projects_metrics_array     check (jsonb_typeof(metrics) = 'array');
alter table public.config_sections add constraint config_sections_requires_object check (requires is null or jsonb_typeof(requires) = 'object');
alter table public.config_options add constraint config_options_components_array check (components is null or jsonb_typeof(components) = 'array');
alter table public.config_options add constraint config_options_requires_object  check (requires is null or jsonb_typeof(requires) = 'object');
alter table public.leads          add constraint leads_source_object        check (jsonb_typeof(source) = 'object');
alter table public.quotes         add constraint quotes_selections_object   check (jsonb_typeof(selections) = 'object');
alter table public.quotes         add constraint quotes_items_array         check (jsonb_typeof(items) = 'array');
alter table public.events         add constraint events_meta_object         check (jsonb_typeof(meta) = 'object');
alter table public.email_outbox   add constraint email_outbox_payload_object check (jsonb_typeof(payload) = 'object');
alter table public.releases       add constraint releases_snapshot_object   check (jsonb_typeof(snapshot) = 'object');
