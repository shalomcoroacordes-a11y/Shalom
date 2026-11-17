-- SHALOM: repertorios para misas y ensayos, independientes de los cantos originales.
create table if not exists public.repertoires (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(btrim(title)) between 2 and 160),
 kind text not null default 'misa' check (kind in ('misa', 'ensayo')),
 event_date date,
 location text not null default '' check (char_length(location) <= 180),
 notes text not null default '' check (char_length(notes) <= 3000),
 items jsonb not null default '[]'::jsonb,
 is_published boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint shalom_repertoire_items_array check (jsonb_typeof(items)='array'),
 constraint shalom_repertoire_items_limit check (jsonb_array_length(items) <= 45),
 constraint shalom_repertoire_published_has_items check (not is_published or jsonb_array_length(items) > 0)
);
create index if not exists shalom_repertoires_published on public.repertoires (is_published, event_date desc);
alter table public.repertoires enable row level security;
revoke all on public.repertoires from public, anon, authenticated;
grant select on public.repertoires to anon, authenticated;
grant insert, update, delete on public.repertoires to authenticated;
drop policy if exists "SHALOM public repertories" on public.repertoires;
create policy "SHALOM public repertories" on public.repertoires
 for select to anon, authenticated using (is_published);
drop policy if exists "SHALOM admin drafts repertories" on public.repertoires;
create policy "SHALOM admin drafts repertories" on public.repertoires
 for select to authenticated using ((select public.jhd_is_admin()));
drop policy if exists "SHALOM admin create repertories" on public.repertoires;
create policy "SHALOM admin create repertories" on public.repertoires
 for insert to authenticated with check ((select public.jhd_is_admin()));
drop policy if exists "SHALOM admin edit repertories" on public.repertoires;
create policy "SHALOM admin edit repertories" on public.repertoires
 for update to authenticated using ((select public.jhd_is_admin()))
 with check ((select public.jhd_is_admin()));
drop policy if exists "SHALOM admin delete repertories" on public.repertoires;
create policy "SHALOM admin delete repertories" on public.repertoires
 for delete to authenticated using ((select public.jhd_is_admin()));
