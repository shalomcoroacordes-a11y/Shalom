-- SHALOM Admin hardening v2, aditivo y sin borrar contenido.
create or replace function public.admin_set_permission_override(
 p_user_id uuid,p_permission text,p_allowed boolean default null
) returns boolean language plpgsql security definer set search_path=''
as $$
begin
 if not public.admin_is_owner() then raise exception 'Solo propietario';end if;
 if exists(select 1 from public.jhd_admin_users where user_id=p_user_id) then raise exception 'Propietario protegido';end if;
 if p_permission !~ '^(songs|artists|albums|categories|medleys|repertoires|contact_messages|home_recommendations|site_content|roles)\.(view|edit|publish|delete)$'
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
revoke all on function public.admin_set_permission_override(uuid,text,boolean) from public,anon;
grant execute on function public.admin_set_permission_override(uuid,text,boolean) to authenticated;
-- Donaciones comparten permiso de sitio; los antiguos permisos del dueño no se alteran.
grant select,insert,update,delete on public.donation_settings to authenticated;
create policy "SHALOM Admin role read donations" on public.donation_settings
 for select to authenticated using(public.admin_has_permission('site_content.view'));
create policy "SHALOM Admin role publish donations" on public.donation_settings
 for insert to authenticated with check(public.admin_has_permission('site_content.publish'));
create policy "SHALOM Admin role update donations" on public.donation_settings
 for update to authenticated using(public.admin_has_permission('site_content.publish'))
 with check(public.admin_has_permission('site_content.publish'));
create policy "SHALOM Admin role delete donations" on public.donation_settings
 for delete to authenticated using(public.admin_has_permission('site_content.delete'));
