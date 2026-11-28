-- SHALOM Admin. Esquema ADITIVO; NO sustituye jhd_is_admin ni elimina datos.
-- En producción hay un propietario histórico en jhd_admin_users.
create table if not exists public.admin_roles (
 id uuid primary key default gen_random_uuid(), name text not null unique check(length(btrim(name)) between 2 and 80),
 description text not null default '', is_system boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.admin_role_permissions (
 role_id uuid not null references public.admin_roles(id) on delete cascade,
 permission text not null, primary key(role_id,permission),
 constraint valid_admin_permission check(permission ~ '^(songs|artists|albums|categories|medleys|repertoires|contact_messages|home_recommendations|site_content|roles)\.(view|edit|publish|delete)$')
);
create table if not exists public.admin_user_roles (
 user_id uuid not null references auth.users(id) on delete cascade,
 role_id uuid not null references public.admin_roles(id) on delete cascade,
 granted_by uuid references auth.users(id),
 assigned_at timestamptz not null default now(), primary key(user_id,role_id)
);
create table if not exists public.admin_permission_overrides (
 user_id uuid not null references auth.users(id) on delete cascade,
 permission text not null, allowed boolean not null,
 changed_by uuid references auth.users(id), updated_at timestamptz not null default now(),
 primary key(user_id,permission),
 constraint valid_permission_override check(permission ~ '^(songs|artists|albums|categories|medleys|repertoires|contact_messages|home_recommendations|site_content|roles)\.(view|edit|publish|delete)$')
);
create table if not exists public.admin_access_blocks (
 user_id uuid primary key references auth.users(id) on delete cascade,
 reason text not null default '', blocked_by uuid references auth.users(id),
 blocked_at timestamptz not null default now()
);
create table if not exists public.admin_invites (
 email text primary key check(email=lower(btrim(email))),
 role_ids uuid[] not null default '{}',
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '14 days'),
 consumed_by uuid references auth.users(id),
 consumed_at timestamptz
);
create table if not exists public.admin_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null, display_name text not null default '',
 joined_at timestamptz not null default now()
);
create table if not exists public.admin_audit_log (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references auth.users(id), subject_id uuid,
 action text not null, details jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create index if not exists idx_admin_role_members on public.admin_user_roles(role_id);
create index if not exists idx_admin_audit_at on public.admin_audit_log(created_at desc);
-- Nunca autorizar por user_metadata ni confiar en el cliente para una revocación.
create or replace function public.admin_is_owner()
returns boolean language sql stable security definer set search_path=''
as $$
 select auth.uid() is not null and exists (
  select 1 from public.jhd_admin_users m where m.user_id=auth.uid()
 );
$$;
create or replace function public.admin_has_permission(p_permission text)
returns boolean language sql stable security definer set search_path=''
as $$
 select auth.uid() is not null
  and not exists(select 1 from public.admin_access_blocks b where b.user_id=auth.uid())
  and (
   public.admin_is_owner()
   or coalesce((select o.allowed from public.admin_permission_overrides o
                where o.user_id=auth.uid() and o.permission=p_permission),(
     select exists(
      select 1 from public.admin_user_roles ur
      join public.admin_role_permissions rp on rp.role_id=ur.role_id
      where ur.user_id=auth.uid() and rp.permission=p_permission
     )
   ))
  );
$$;
-- Respuesta única para app: verificación de acceso y permisos EFECTIVOS en cada operación.
create or replace function public.admin_my_access()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare
 uid uuid:=auth.uid(); owner boolean; blocked boolean; perms jsonb; role_names jsonb;
begin
 if uid is null then return jsonb_build_object('authorized',false,'owner',false,'blocked',false,'permissions','[]'::jsonb);end if;
 owner:=public.admin_is_owner();
 blocked:=exists(select 1 from public.admin_access_blocks where user_id=uid);
 select coalesce(jsonb_agg(p.permission order by p.permission),'[]'::jsonb) into perms from (
  select permission from (
   select rp.permission from public.admin_user_roles ur
     join public.admin_role_permissions rp on rp.role_id=ur.role_id where ur.user_id=uid
   union
   select o.permission from public.admin_permission_overrides o where o.user_id=uid and o.allowed
  ) v where public.admin_has_permission(v.permission)
 ) p;
 select coalesce(jsonb_agg(r.name order by r.name),'[]'::jsonb) into role_names
 from public.admin_user_roles ur join public.admin_roles r on r.id=ur.role_id where ur.user_id=uid;
 return jsonb_build_object('authorized',not blocked and (owner or exists(select 1 from public.admin_user_roles where user_id=uid)),
                          'owner',owner,'blocked',blocked,'permissions',case when blocked then '[]'::jsonb else perms end,
                          'roles',role_names);
end;
$$;
create or replace function public.admin_create_role(p_name text,p_description text,p_permissions text[])
returns uuid language plpgsql security definer set search_path=''
as $$
declare new_id uuid; v text;
begin
 if not public.admin_is_owner() then raise exception 'Solo propietario';end if;
 if length(btrim(coalesce(p_name,''))) not between 2 and 80 then raise exception 'Nombre inválido';end if;
 if exists(select 1 from unnest(coalesce(p_permissions,'{}')) q where q !~ '^(songs|artists|albums|categories|medleys|repertoires|contact_messages|home_recommendations|site_content|roles)\.(view|edit|publish|delete)$') then raise exception 'Permiso inválido';end if;
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
 if exists(select 1 from unnest(coalesce(p_permissions,'{}')) q where q !~ '^(songs|artists|albums|categories|medleys|repertoires|contact_messages|home_recommendations|site_content|roles)\.(view|edit|publish|delete)$') then raise exception 'Permiso inválido';end if;
 update public.admin_roles set name=btrim(p_name),description=coalesce(p_description,'') where id=p_id and not is_system;
 if not found then raise exception 'Rol inexistente o protegido';end if;
 delete from public.admin_role_permissions where role_id=p_id;
 insert into public.admin_role_permissions(role_id,permission) select p_id,unnest(coalesce(p_permissions,'{}')) on conflict do nothing;
 insert into public.admin_audit_log(actor_id,action,details) values(auth.uid(),'role.updated',jsonb_build_object('role',p_id));
 return true;
end;
$$;
create or replace function public.admin_invite_user(p_email text,p_role_ids uuid[])
returns boolean language plpgsql security definer set search_path=''
as $$
declare e text:=lower(btrim(coalesce(p_email,'')));
begin
 if not public.admin_is_owner() then raise exception 'Solo propietario';end if;
 if e !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Correo inválido';end if;
 if cardinality(coalesce(p_role_ids,'{}'))=0 or exists(select 1 from unnest(p_role_ids) i where not exists(select 1 from public.admin_roles where id=i)) then raise exception 'Roles inválidos';end if;
 insert into public.admin_invites(email,role_ids,created_by,expires_at,consumed_at,consumed_by)
 values(e,p_role_ids,auth.uid(),now()+interval '14 days',null,null)
 on conflict(email) do update set role_ids=excluded.role_ids,created_by=excluded.created_by,created_at=now(),expires_at=excluded.expires_at,consumed_at=null,consumed_by=null;
 insert into public.admin_audit_log(actor_id,action,details) values(auth.uid(),'invite.created',jsonb_build_object('email',e));
 return true;
end;
$$;
create or replace function public.admin_redeem_invite()
returns boolean language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); e text; invitation public.admin_invites%rowtype;
begin
 if uid is null then raise exception 'Sesión requerida';end if;
 select lower(btrim(u.email)) into e from auth.users u
 where u.id=uid and u.email_confirmed_at is not null;
 if e is null then raise exception 'Primero verifica tu correo';end if;
 select * into invitation from public.admin_invites where email=e and consumed_at is null and expires_at>now() for update;
 if not found then return false;end if;
 if exists(select 1 from public.admin_access_blocks where user_id=uid) then raise exception 'Acceso bloqueado';end if;
 insert into public.admin_user_roles(user_id,role_id,granted_by)
 select uid,i,invitation.created_by from unnest(invitation.role_ids) i on conflict do nothing;
 insert into public.admin_profiles(user_id,email) values(uid,e)
 on conflict(user_id) do update set email=excluded.email;
 update public.admin_invites set consumed_by=uid,consumed_at=now() where email=e;
 insert into public.admin_audit_log(actor_id,subject_id,action) values(uid,uid,'invite.redeemed');
 return true;
end;
$$;
create or replace function public.admin_assign_user_roles(p_user_id uuid,p_role_ids uuid[])
returns boolean language plpgsql security definer set search_path=''
as $$
begin
 if not public.admin_is_owner() then raise exception 'Solo propietario';end if;
 if exists(select 1 from public.jhd_admin_users where user_id=p_user_id) then raise exception 'Propietario protegido';end if;
 if exists(select 1 from unnest(coalesce(p_role_ids,'{}')) i where not exists(select 1 from public.admin_roles where id=i)) then raise exception 'Rol inexistente';end if;
 delete from public.admin_user_roles where user_id=p_user_id;
 insert into public.admin_user_roles(user_id,role_id,granted_by)
 select p_user_id,i,auth.uid() from unnest(coalesce(p_role_ids,'{}')) i on conflict do nothing;
 insert into public.admin_audit_log(actor_id,subject_id,action) values(auth.uid(),p_user_id,'roles.assigned');
 return true;
end;
$$;
create or replace function public.admin_block_user(p_user_id uuid,p_reason text)
returns boolean language plpgsql security definer set search_path=''
as $$
begin
 if not public.admin_is_owner() then raise exception 'Solo propietario';end if;
 if exists(select 1 from public.jhd_admin_users where user_id=p_user_id) then raise exception 'No puedes bloquear propietarios históricos';end if;
 insert into public.admin_access_blocks(user_id,reason,blocked_by) values(p_user_id,coalesce(p_reason,''),auth.uid())
 on conflict(user_id) do update set reason=excluded.reason,blocked_by=excluded.blocked_by,blocked_at=now();
 insert into public.admin_audit_log(actor_id,subject_id,action) values(auth.uid(),p_user_id,'admin.blocked');
 return true;
end;
$$;
create or replace function public.admin_unblock_user(p_user_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
begin
 if not public.admin_is_owner() then raise exception 'Solo propietario';end if;
 delete from public.admin_access_blocks where user_id=p_user_id;
 insert into public.admin_audit_log(actor_id,subject_id,action) values(auth.uid(),p_user_id,'admin.unblocked');
 return true;
end;
$$;
-- Cambio ATÓMICO de canto, capos y enlaces: si falla una relación, nada queda a medias.
create or replace function public.admin_publish_song(
 p_song jsonb,p_artists jsonb,p_categories jsonb,p_albums jsonb,p_links jsonb,p_capos jsonb,p_expected timestamptz default null
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 sid uuid:=(p_song->>'id')::uuid; previous timestamptz; result timestamptz;
 rec jsonb; songtype text:=coalesce(p_song->>'song_type','catolico');
begin
 if not public.admin_has_permission('songs.publish') then raise exception 'No tienes permiso para publicar cantos';end if;
 if sid is null or length(btrim(coalesce(p_song->>'title','')))=0 or length(btrim(coalesce(p_song->>'slug','')))=0
 then raise exception 'Datos incompletos';end if;
 if songtype not in ('catolico','cristiano','mixto') then raise exception 'Tipo inválido';end if;
 select updated_at into previous from public.songs where id=sid for update;
 if found and (p_expected is null or previous is distinct from p_expected) then raise exception 'CONFLICT: alguien editó el canto';end if;
 if not found and p_expected is not null then raise exception 'CONFLICT: canto eliminado';end if;
 insert into public.songs(id,title,slug,song_type,tone,difficulty,lyrics,capo_position,capo_key,artist_id,category_id,updated_at)
 values(sid,btrim(p_song->>'title'),p_song->>'slug',songtype,nullif(p_song->>'tone',''),nullif(p_song->>'difficulty',''),
        coalesce(p_song->>'lyrics',''),coalesce((p_song->>'capo_position')::integer,0),nullif(p_song->>'capo_key',''),
        nullif(p_song->>'artist_id','')::uuid,nullif(p_song->>'category_id','')::uuid,now())
 on conflict(id) do update set title=excluded.title,slug=excluded.slug,song_type=excluded.song_type,tone=excluded.tone,
 difficulty=excluded.difficulty,lyrics=excluded.lyrics,capo_position=excluded.capo_position,
 capo_key=excluded.capo_key,artist_id=excluded.artist_id,category_id=excluded.category_id,updated_at=now();
 delete from public.song_artists where song_id=sid;
 delete from public.song_categories where song_id=sid;
 delete from public.album_songs where song_id=sid;
 delete from public.song_links where song_id=sid;
 delete from public.song_capo_versions where song_id=sid;
 for rec in select value from jsonb_array_elements(coalesce(p_artists,'[]'::jsonb))
 loop
  insert into public.song_artists(song_id,artist_id,role,sort_order)
  values(sid,(rec->>'artist_id')::uuid,coalesce(rec->>'role','colaborador'),coalesce((rec->>'sort_order')::integer,0));
 end loop;
 for rec in select value from jsonb_array_elements(coalesce(p_categories,'[]'::jsonb))
 loop insert into public.song_categories(song_id,category_id) values(sid,(rec->>'category_id')::uuid);end loop;
 for rec in select value from jsonb_array_elements(coalesce(p_albums,'[]'::jsonb))
 loop insert into public.album_songs(song_id,album_id,sort_order) values(sid,(rec->>'album_id')::uuid,coalesce((rec->>'sort_order')::integer,0));end loop;
 for rec in select value from jsonb_array_elements(coalesce(p_links,'[]'::jsonb))
 loop insert into public.song_links(song_id,title,link_type,platform,url,sort_order)
 values(sid,btrim(rec->>'title'),coalesce(rec->>'link_type','Tutorial'),rec->>'platform',rec->>'url',coalesce((rec->>'sort_order')::integer,0));end loop;
 for rec in select value from jsonb_array_elements(coalesce(p_capos,'[]'::jsonb))
 loop insert into public.song_capo_versions(song_id,label,capo_position,capo_key,sort_order)
 values(sid,coalesce(rec->>'label',''),(rec->>'capo_position')::integer,btrim(rec->>'capo_key'),coalesce((rec->>'sort_order')::integer,0));end loop;
 select updated_at into result from public.songs where id=sid;
 insert into public.admin_audit_log(actor_id,subject_id,action,details)
 values(auth.uid(),sid,'song.published',jsonb_build_object('title',p_song->>'title'));
 return jsonb_build_object('id',sid,'updated_at',result);
end;
$$;
create or replace function public.admin_delete_song(p_song_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare old jsonb;
begin
 if not public.admin_has_permission('songs.delete') then raise exception 'Sin permiso para eliminar cantos';end if;
 select to_jsonb(s) into old from public.songs s where id=p_song_id for update;
 if old is null then raise exception 'Canto no encontrado';end if;
 insert into public.admin_trash(item_type,original_id,item_name,snapshot,deleted_by)
 values('song',p_song_id,old->>'title',old,auth.uid());
 delete from public.song_capo_versions where song_id=p_song_id;
 delete from public.song_links where song_id=p_song_id;
 delete from public.song_categories where song_id=p_song_id;
 delete from public.song_artists where song_id=p_song_id;
 delete from public.album_songs where song_id=p_song_id;
 delete from public.song_versions where version_song_id=p_song_id or parent_song_id=p_song_id;
 delete from public.artist_featured_songs where song_id=p_song_id;
 delete from public.songs where id=p_song_id;
 insert into public.admin_audit_log(actor_id,subject_id,action) values(auth.uid(),p_song_id,'song.deleted');
 return true;
end;
$$;
-- Tablas nuevas: no exponer información de roles ni correos a ANON.
do $$
declare t text;
begin
 foreach t in array array['admin_roles','admin_role_permissions','admin_user_roles','admin_permission_overrides','admin_access_blocks','admin_invites','admin_profiles','admin_audit_log']
 loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all privileges on table public.%I from anon, authenticated',t);
  execute format('grant select on table public.%I to authenticated',t);
 end loop;
end$$;
create policy "Roles visible a administradores" on public.admin_roles for select to authenticated using (
 public.admin_is_owner() or public.admin_has_permission('roles.view') or exists (
 select 1 from public.admin_user_roles u where u.role_id=id and u.user_id=auth.uid())
);
create policy "Permisos del rol visibles a administradores" on public.admin_role_permissions for select to authenticated using (
 public.admin_is_owner() or public.admin_has_permission('roles.view') or exists(
 select 1 from public.admin_user_roles u where u.role_id=admin_role_permissions.role_id and u.user_id=auth.uid())
);
create policy "Asignaciones visibles a propietario y a sí mismo" on public.admin_user_roles for select to authenticated using (
 public.admin_is_owner() or user_id=auth.uid()
);
create policy "Excepciones visibles a propietario y a sí mismo" on public.admin_permission_overrides for select to authenticated using (
 public.admin_is_owner() or user_id=auth.uid()
);
create policy "Bloqueos visibles a propietario" on public.admin_access_blocks for select to authenticated using (public.admin_is_owner());
create policy "Invitaciones visibles a propietario" on public.admin_invites for select to authenticated using (public.admin_is_owner());
create policy "Perfiles visibles a propietario y a sí mismo" on public.admin_profiles for select to authenticated using (
 public.admin_is_owner() or user_id=auth.uid()
);
create policy "Auditoría visible a propietario" on public.admin_audit_log for select to authenticated using(public.admin_is_owner());
-- Las políticas antiguas del propietario permanecen. Estos permisos ADICIONALES
-- son para administradores con roles y sin pertenencia a jhd_admin_users.
do $$
declare t text; res text;
begin
 for t,res in select * from (values
  ('songs','songs'),('song_artists','songs'),('song_categories','songs'),
  ('song_links','songs'),('song_capo_versions','songs'),('album_songs','songs'),
  ('artists','artists'),('albums','albums'),('categories','categories'),
  ('medleys','medleys'),('repertoires','repertoires'),('contact_messages','contact_messages'),
  ('home_recommendations','home_recommendations'),('site_content','site_content')
 ) a(t,res) loop
  execute format('grant select, insert, update, delete on public.%I to authenticated',t);
  execute format('create policy %I on public.%I for select to authenticated using (public.admin_has_permission(%L))',
   'SHALOM roles read',t,res||'.view');
  execute format('create policy %I on public.%I for insert to authenticated with check (public.admin_has_permission(%L))',
   'SHALOM roles publish',t,res||'.publish');
  execute format('create policy %I on public.%I for update to authenticated using (public.admin_has_permission(%L)) with check (public.admin_has_permission(%L))',
   'SHALOM roles edit published',t,res||'.publish',res||'.publish');
  execute format('create policy %I on public.%I for delete to authenticated using (public.admin_has_permission(%L))',
   'SHALOM roles delete',t,res||'.delete');
 end loop;
end$$;
-- Asegurar que la API cliente solo pueda invocar funciones tras iniciar sesión.
do $$
declare f text;
begin
 foreach f in array array[
  'admin_is_owner()','admin_has_permission(text)','admin_my_access()',
  'admin_create_role(text,text,text[])','admin_update_role(uuid,text,text,text[])',
  'admin_invite_user(text,uuid[])','admin_redeem_invite()',
  'admin_assign_user_roles(uuid,uuid[])','admin_block_user(uuid,text)',
  'admin_unblock_user(uuid)','admin_publish_song(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,timestamptz)',
  'admin_delete_song(uuid)'
 ] loop
  execute 'revoke all on function public.'||f||' from public, anon';
  execute 'grant execute on function public.'||f||' to authenticated';
 end loop;
end$$;
