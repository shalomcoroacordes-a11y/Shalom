-- Standalone reviewed maintenance SQL. Do not run automatically or without a backup.
begin;
do $audit$
declare t text; rel regclass; p text;
begin
 foreach t in array array['admin_roles','admin_role_permissions','admin_user_roles','admin_permission_overrides','admin_access_blocks','admin_invites','admin_profiles','admin_audit_log'] loop
  rel:=to_regclass(format('public.%I',t));
  if rel is null or not exists(select 1 from pg_class where oid=rel and relrowsecurity and relkind='r') then
   raise exception 'Missing RLS-protected RBAC table: %',t;
  end if;
  if exists(select 1 from pg_policy where polrelid=rel and polcmd<>'r') then
   raise exception 'Unexpected write policy on %',t;
  end if;
  execute format('revoke all privileges on table public.%I from anon, authenticated',t);
  execute format('grant select on table public.%I to authenticated',t);
  if has_any_column_privilege('anon',rel,'SELECT') or not has_table_privilege('authenticated',rel,'SELECT') then
   raise exception 'Unexpected effective read privilege on %',t;
  end if;
  foreach p in array array['INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER','REFERENCES'] loop
   if has_table_privilege('anon',rel,p) or has_table_privilege('authenticated',rel,p) then
    raise exception 'Unexpected inherited % privilege on %',p,t;
   end if;
  end loop;
  foreach p in array array['INSERT','UPDATE','REFERENCES'] loop
   if has_any_column_privilege('anon',rel,p) or has_any_column_privilege('authenticated',rel,p) then
    raise exception 'Unexpected column % privilege on %',p,t;
   end if;
  end loop;
 end loop;
end
$audit$;
commit;
