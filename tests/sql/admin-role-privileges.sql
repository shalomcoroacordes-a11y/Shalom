\set ON_ERROR_STOP on
-- Disposable fixture only, not production.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('test.actor',true),'')::uuid
$$;
grant usage on schema auth to authenticated;
do $fixture$
declare t text;
begin
 foreach t in array array['admin_roles','admin_role_permissions','admin_user_roles','admin_permission_overrides','admin_access_blocks','admin_invites','admin_profiles','admin_audit_log'] loop
  execute format('create table public.%I(id uuid primary key, value text)',t);
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy own_read on public.%I for select to authenticated using (id=auth.uid())',t);
  execute format('grant all on table public.%I to authenticated,service_role',t);
  execute format('insert into public.%I values ($1,$2),($3,$4)',t)
  using '00000000-0000-4000-8000-000000000001'::uuid,'owner','00000000-0000-4000-8000-000000000002'::uuid,'other';
 end loop;
end
$fixture$;
-- Representative privileged RPC; actual production RPC permission tests remain separate.
create function public.test_write(p_value text) returns void
 language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is distinct from '00000000-0000-4000-8000-000000000001'::uuid then raise exception 'denied';end if;
 update public.admin_roles set value=p_value where id=auth.uid();
end;
$$;
revoke all on function public.test_write(text) from public,anon;
grant execute on function public.test_write(text) to authenticated;
grant truncate on public.admin_audit_log to public;
\set ON_ERROR_STOP off
\ir ../../sql/SHALOM_ADMIN_ROLE_PRIVILEGES.sql
\set ON_ERROR_STOP on
do $$begin
 if not has_table_privilege('authenticated','public.admin_roles','TRUNCATE') then raise exception 'partial changes escaped rollback';end if;
end$$;
revoke truncate on public.admin_audit_log from public;
\ir ../../sql/SHALOM_ADMIN_ROLE_PRIVILEGES.sql
\ir ../../sql/SHALOM_ADMIN_ROLE_PRIVILEGES.sql
do $check$
declare t text; p text;
begin
 foreach t in array array['admin_roles','admin_role_permissions','admin_user_roles','admin_permission_overrides','admin_access_blocks','admin_invites','admin_profiles','admin_audit_log'] loop
  if not has_table_privilege('authenticated',format('public.%I',t),'SELECT') then raise exception 'missing read %',t;end if;
  if not has_table_privilege('service_role',format('public.%I',t),'TRUNCATE') then raise exception 'service role changed %',t;end if;
  foreach p in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER','REFERENCES'] loop
   if has_table_privilege('anon',format('public.%I',t),p) then raise exception 'anon % on %',p,t;end if;
   if p<>'SELECT' and has_table_privilege('authenticated',format('public.%I',t),p) then raise exception 'authenticated % on %',p,t;end if;
  end loop;
 end loop;
end
$check$;
set role authenticated;
select set_config('test.actor','00000000-0000-4000-8000-000000000001',false);
do $$begin
 if (select count(*) from public.admin_roles)<>1 then raise exception 'RLS failed';end if;
 begin
  update public.admin_roles set value='bad';
  raise exception 'unexpected direct update';
 exception when insufficient_privilege then null;end;
 begin
  truncate public.admin_audit_log;
  raise exception 'unexpected truncate';
 exception when insufficient_privilege then null;end;
end$$;
select public.test_write('authorized rpc');
do $$begin
 if (select value from public.admin_roles) is distinct from 'authorized rpc' then raise exception 'RPC write failed';end if;
end$$;
select set_config('test.actor','00000000-0000-4000-8000-000000000002',false);
do $$begin
 begin
  perform public.test_write('bad');
  raise exception 'unexpected privileged RPC';
 exception when others then if sqlerrm<>'denied' then raise;end if;end;
end$$;
reset role;
set role anon;
do $$begin
 begin
  perform 1 from public.admin_roles;
  raise exception 'unexpected anon read';
 exception when insufficient_privilege then null;end;
end$$;
reset role;
\echo 'RBAC least privilege, rollback, idempotency, RLS, representative RPC and service role passed.'

\ir admin-role-visibility.sql
