-- ============================================================
-- Un cliente puede estar registrado con VARIOS dueños y elegir cuál ver.
-- Estrategia: perfiles.dueno_id pasa a ser el "dueño activo" (el que está
-- viendo ahora). cliente_duenos lista TODOS sus vínculos. Las RPCs del portal
-- siguen leyendo dueno_id (= activo), así que no hace falta tocarlas.
-- Correr en: Supabase -> SQL Editor. (Requiere migracion-multitenant.sql)
-- ============================================================

create table if not exists cliente_duenos (
  cliente_id uuid not null references auth.users (id) on delete cascade,
  owner_id   uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (cliente_id, owner_id)
);
alter table cliente_duenos enable row level security;
drop policy if exists cd_sel on cliente_duenos;
create policy cd_sel on cliente_duenos for select using (cliente_id = auth.uid());

-- Backfill: pasar los vínculos actuales (un dueño por cliente) a la tabla.
insert into cliente_duenos (cliente_id, owner_id)
select id, dueno_id from perfiles where tipo = 'cliente' and dueno_id is not null
on conflict do nothing;

-- Registro/vinculación: agrega el dueño a la lista del cliente y lo deja activo.
create or replace function registrarse_cliente(p_slug text)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from negocios where slug = p_slug;
  if v_owner is null then raise exception 'Link invalido'; end if;

  insert into perfiles (id, tipo, nombre, dueno_id)
  values (auth.uid(), 'cliente', coalesce((select email from auth.users where id = auth.uid()), ''), v_owner)
  on conflict (id) do update set dueno_id = excluded.dueno_id
    where perfiles.tipo = 'cliente';

  insert into cliente_duenos (cliente_id, owner_id) values (auth.uid(), v_owner)
  on conflict do nothing;
end; $$;
grant execute on function registrarse_cliente(text) to authenticated;

-- Lista de dueños con los que el cliente está registrado (marca el activo).
create or replace function mis_duenos()
returns table (owner_id uuid, nombre text, activo boolean)
language sql security definer set search_path = public as $$
  select cd.owner_id,
         coalesce(nullif(n.nombre, ''), 'Negocio'),
         (cd.owner_id = (select dueno_id from perfiles where id = auth.uid())) as activo
  from cliente_duenos cd
  left join negocios n on n.owner_id = cd.owner_id
  where cd.cliente_id = auth.uid()
  order by 2;
$$;
grant execute on function mis_duenos() to authenticated;

-- Cambiar el dueño activo (solo si el cliente está vinculado a él).
create or replace function cambiar_dueno_activo(p_owner uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from cliente_duenos where cliente_id = auth.uid() and owner_id = p_owner) then
    raise exception 'No estás registrado con ese negocio';
  end if;
  update perfiles set dueno_id = p_owner where id = auth.uid() and tipo = 'cliente';
end; $$;
grant execute on function cambiar_dueno_activo(uuid) to authenticated;
