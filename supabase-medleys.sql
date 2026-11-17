-- SHALOM: popurrís como colecciones independientes de cantos existentes.
-- Cada fragmento conserva el ID del canto original y una copia editable de su sección.
create table if not exists public.medleys (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(btrim(title)) between 2 and 160),
 slug text not null unique check (char_length(btrim(slug)) between 2 and 190),
 song_type text not null default 'catolico' check (song_type in ('catolico','cristiano','mixto')),
 base_tone text not null default '',
 description text not null default '',
 parts jsonb not null default '[]'::jsonb,
 is_published boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint shalom_medley_parts_are_array check (jsonb_typeof(parts) = 'array'),
 constraint shalom_medley_parts_limit check (jsonb_array_length(parts) <= 30),
 constraint shalom_medley_published_has_parts check (not is_published or jsonb_array_length(parts) > 0)
);
create index if not exists medleys_public_list on public.medleys (is_published, updated_at desc);
alter table public.medleys enable row level security;
revoke all on table public.medleys from public;
grant select on public.medleys to anon, authenticated;
grant insert, update, delete on public.medleys to authenticated;
drop policy if exists "Visitors read published SHALOM medleys" on public.medleys;
create policy "Visitors read published SHALOM medleys" on public.medleys
 for select to anon, authenticated using (is_published);
drop policy if exists "SHALOM admins read all medleys" on public.medleys;
create policy "SHALOM admins read all medleys" on public.medleys
 for select to authenticated using ((select public.jhd_is_admin()));
drop policy if exists "SHALOM admins insert medleys" on public.medleys;
create policy "SHALOM admins insert medleys" on public.medleys
 for insert to authenticated with check ((select public.jhd_is_admin()));
drop policy if exists "SHALOM admins update medleys" on public.medleys;
create policy "SHALOM admins update medleys" on public.medleys
 for update to authenticated using ((select public.jhd_is_admin())) with check ((select public.jhd_is_admin()));
drop policy if exists "SHALOM admins delete medleys" on public.medleys;
create policy "SHALOM admins delete medleys" on public.medleys
 for delete to authenticated using ((select public.jhd_is_admin()));
