-- =============================================================================
-- ROWE · 0010 · Ubicación / ciudad del cliente en los mensajes
--   leads.city   dónde está (para valorar la logística de los rodajes). Opcional.
-- =============================================================================

alter table public.leads
  add column if not exists city text not null default '' check (char_length(city) <= 120);
