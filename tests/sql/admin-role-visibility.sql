\set ON_ERROR_STOP on
-- Called only after the independent least privilege fixture in a disposable database.
-- Rebuild two synthetic tables with the production column names.
drop table public.admin_role_permissions,public.admin_user_roles;
create table public.admin_role_permissions(role_id uuid not null,permission text not null,primary key(role_id,permission));
create table public.admin_user_roles(user_id uuid not null,role_id uuid not null,primary key(user_id,role_id));
create function public.admin_is_owner() returns boolean language sql stable as $owner$
 select auth.uid()='00000000-0000-4000-8000-000000000001'::uuid
$owner$;
create function public.admin_has_permission(text) returns boolean language sql stable as $permission$
 select $1='roles.view' and auth.uid()='00000000-0000-4000-8000-000000000004'::uuid
$permission$;
alter table public.admin_role_permissions enable row level security;
alter table public.admin_user_roles enable row level security;
grant select on public.admin_role_permissions,public.admin_user_roles to authenticated;
create policy own_assignments on public.admin_user_roles for select to authenticated using(user_id=auth.uid() or public.admin_is_owner());
create policy "Permisos del rol visibles a administradores" on public.admin_role_permissions for select to authenticated using(
 public.admin_is_owner() or public.admin_has_permission('roles.view') or exists(
 select 1 from public.admin_user_roles u where u.role_id=role_id and u.user_id=auth.uid())
);
insert into public.admin_role_permissions values
 ('10000000-0000-4000-8000-000000000001','songs.view'),
 ('10000000-0000-4000-8000-000000000002','songs.delete'),
 ('10000000-0000-4000-8000-000000000003','roles.edit');
insert into public.admin_user_roles values
 ('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003');
set role authenticated;
select set_config('test.actor','00000000-0000-4000-8000-000000000002',false);
do $check$ begin
 if (select count(*) from public.admin_role_permissions)<>3 then raise exception 'original correlation bug not reproduced';end if;
end $check$;
reset role;
\ir ../../sql/SHALOM_ADMIN_ROLE_VISIBILITY.sql
\ir ../../sql/SHALOM_ADMIN_ROLE_VISIBILITY.sql
set role authenticated;
do $check$ begin
 if (select count(*) from public.admin_role_permissions)<>2 or exists(select 1 from public.admin_role_permissions where permission='songs.delete') then raise exception 'foreign role visible';end if;
 if not exists(select 1 from public.admin_role_permissions where permission='songs.view') or not exists(select 1 from public.admin_role_permissions where permission='roles.edit') then raise exception 'own role lost';end if;
end $check$;
select set_config('test.actor','00000000-0000-4000-8000-000000000003',false);
do $check$ begin
 if exists(select 1 from public.admin_role_permissions) then raise exception 'unassigned user can read';end if;
end $check$;
select set_config('test.actor','00000000-0000-4000-8000-000000000004',false);
do $check$ begin
 if (select count(*) from public.admin_role_permissions)<>3 then raise exception 'roles.view lost';end if;
end $check$;
select set_config('test.actor','00000000-0000-4000-8000-000000000001',false);
do $check$ begin
 if (select count(*) from public.admin_role_permissions)<>3 then raise exception 'owner visibility lost';end if;
end $check$;
reset role;
set role anon;
do $check$ begin
 begin
  perform 1 from public.admin_role_permissions;
  raise exception 'anonymous read allowed';
 exception when insufficient_privilege then null;end;
end $check$;
reset role;
\echo 'Role visibility: original bug reproduced; assigned roles only, owner and roles.view preserved, unassigned and anonymous denied, idempotency passed.'
