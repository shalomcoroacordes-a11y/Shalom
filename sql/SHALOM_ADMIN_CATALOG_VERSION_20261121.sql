-- Versión para control optimista del catálogo de destacados.
alter table public.home_recommendations
 add column if not exists updated_at timestamptz not null default now();
-- El lector público conserva el mismo formato; solo se añade metadato.
