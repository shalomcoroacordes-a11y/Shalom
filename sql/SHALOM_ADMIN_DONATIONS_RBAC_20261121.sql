-- Permisos separados para Donaciones: no concede acceso al resto del sitio.
alter table public.admin_role_permissions drop constraint if exists valid_admin_permission;
alter table public.admin_role_permissions add constraint valid_admin_permission
 check(permission ~ '^(songs|artists|albums|categories|medleys|repertoires|contact_messages|home_recommendations|site_content|donation_settings|roles)\.(view|edit|publish|delete)$');
alter table public.admin_permission_overrides drop constraint if exists valid_permission_override;
alter table public.admin_permission_overrides add constraint valid_permission_override
 check(permission ~ '^(songs|artists|albums|categories|medleys|repertoires|contact_messages|home_recommendations|site_content|donation_settings|roles)\.(view|edit|publish|delete)$');
create or replace function public.admin_create_role(p_name text,p_description text,p_permissions text[])
returns uuid language plpgsql security definer set search_path=''
as $$
declare new_id uuid;
begin
 if not public.admin_is_owner() then raise exception 'Solo propietario';end if;
 if length(btrim(coalesce(p_name,''))) not between 2 and 80 then raise exception 'Nombre inválido';end if;
 if exists(select 1 from unnest(coalesce(p_permissions,'{}')) q where q !~ '^(songs|artists|albums|categories|medleys|repertoires|contact_messages|home_recommendations|site_content|donation_settings|roles)\.(view|edit|publish|delete)$') then raise exception 'Permiso inválido';end if;
 insert into public.admin_roles(name,description) values(btrim(p_name),coalesce(p_description,'')) returning id into new_id;
 insert into public.admin_role_permissions(role_id,permission) select new_id,unnest(coalesce(p_permissions,'{}')) on conflict do nothing;
 insert into public.admin_audit_log(actor_id,action,details) values(auth.uid(),'role.created',jsonb_build_object('role',new_id));
 return new_id;
end;
$$;
create or replace function public.admin_update_role(p_id uuid,p_name text,p_description text,p_permissions text[])
returns boolean language plpgsql security definer set search_path=''
as $$
begin
 if not public.admin_is_owner() then raise exception 'Solo propietario';end if;
 if length(btrim(coalesce(p_name,''))) not between 2 and 80 then raise exception 'Nombre inválido';end if;
 if exists(select 1 from unnest(coalesce(p_permissions,'{}')) q where q !~ '^(songs|artists|albums|categories|medleys|repertoires|contact_messages|home_recommendations|site_content|donation_settings|roles)\.(view|edit|publish|delete)$') then raise exception 'Permiso inválido';end if;
 update public.admin_roles set name=btrim(p_name),description=coalesce(p_description,'') where id=p_id and not is_system;
 if not found then raise exception 'Rol inexistente o protegido';end if;
 delete from public.admin_role_permissions where role_id=p_id;
 insert into public.admin_role_permissions(role_id,permission) select p_id,unnest(coalesce(p_permissions,'{}')) on conflict do nothing;
 insert into public.admin_audit_log(actor_id,action,details) values(auth.uid(),'role.updated',jsonb_build_object('role',p_id));
 return true;
end;
$$;
create or replace function public.admin_set_permission_override(
 p_user_id uuid,p_permission text,p_allowed boolean default null
) returns boolean language plpgsql security definer set search_path=''
as $$
begin
 if not public.admin_is_owner() then raise exception 'Solo propietario';end if;
 if exists(select 1 from public.jhd_admin_users where user_id=p_user_id) then raise exception 'Propietario protegido';end if;
 if p_permission !~ '^(songs|artists|albums|categories|medleys|repertoires|contact_messages|home_recommendations|site_content|donation_settings|roles)\.(view|edit|publish|delete)$'
 then raise exception 'Permiso inválido';end if;
 if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'Usuario inexistente';end if;
 if p_allowed is null then
  delete from public.admin_permission_overrides where user_id=p_user_id and permission=p_permission;
 else
  insert into public.admin_permission_overrides(user_id,permission,allowed,changed_by,updated_at)
  values(p_user_id,p_permission,p_allowed,auth.uid(),now())
  on conflict(user_id,permission) do update set allowed=excluded.allowed,changed_by=excluded.changed_by,updated_at=excluded.updated_at;
 end if;
 insert into public.admin_audit_log(actor_id,subject_id,action,details)
 values(auth.uid(),p_user_id,'permission.override',jsonb_build_object('permission',p_permission,'value',p_allowed));
 return true;
end;
$$;
-- Reemplazar solamente las cuatro políticas nuevas. No tocar las anteriores del propietario.
drop policy if exists "SHALOM Admin role read donations" on public.donation_settings;
drop policy if exists "SHALOM Admin role publish donations" on public.donation_settings;
drop policy if exists "SHALOM Admin role update donations" on public.donation_settings;
drop policy if exists "SHALOM Admin role delete donations" on public.donation_settings;
create policy "SHALOM Admin role read donations" on public.donation_settings
 for select to authenticated using(public.admin_has_permission('donation_settings.view'));
create policy "SHALOM Admin role publish donations" on public.donation_settings
 for insert to authenticated with check(public.admin_has_permission('donation_settings.publish'));
create policy "SHALOM Admin role update donations" on public.donation_settings
 for update to authenticated using(public.admin_has_permission('donation_settings.publish'))
 with check(public.admin_has_permission('donation_settings.publish'));
create policy "SHALOM Admin role delete donations" on public.donation_settings
 for delete to authenticated using(public.admin_has_permission('donation_settings.delete'));
