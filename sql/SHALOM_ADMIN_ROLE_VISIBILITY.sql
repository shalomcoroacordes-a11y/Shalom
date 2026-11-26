-- Reviewed standalone maintenance, not an automatic deployment.
-- Do not re-run the historical RBAC setup to install this correction.
begin;
do $check$
begin
 if not exists(select 1 from pg_class where oid='public.admin_role_permissions'::regclass and relrowsecurity) then
  raise exception 'Expected RLS on admin_role_permissions';
 end if;
 if not exists(select 1 from pg_policy where polrelid='public.admin_role_permissions'::regclass and polname='Permisos del rol visibles a administradores' and polcmd='r' and polpermissive and polroles=array[(select oid from pg_roles where rolname='authenticated')]) then
  raise exception 'Unexpected role permission policy';
 end if;
 if (select count(*) from pg_policy where polrelid='public.admin_role_permissions'::regclass)<>1 then
  raise exception 'Unexpected additional policy; review before deployment';
 end if;
end
$check$;
alter policy "Permisos del rol visibles a administradores" on public.admin_role_permissions
 using (
  public.admin_is_owner() or public.admin_has_permission('roles.view') or exists(
   select 1 from public.admin_user_roles u
    where u.role_id=admin_role_permissions.role_id and u.user_id=auth.uid()
  )
 );
commit;
