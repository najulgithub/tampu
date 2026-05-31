-- ============================================================
-- Multi-dueno (SaaS): cada propietario tiene su negocio, sus unidades
-- y sus propios clientes. Correr en: Supabase -> SQL Editor.
--
-- NO hace falta reemplazar nada: migra automaticamente el negocio
-- unico que ya tenias y deja todo listo para que se registren mas duenos.
-- (Requiere haber corrido antes: migracion-portal-cliente.sql)
-- ============================================================

-- ---------- Negocios: uno por dueno, con un slug unico para el link ----------
create table if not exists negocios (
  owner_id   uuid primary key references auth.users (id) on delete cascade,
  slug       text unique not null,
  nombre     text default 'Alquileres',
  created_at timestamptz not null default now()
);
alter table negocios enable row level security;
-- el dueno lee/edita su propio negocio
drop policy if exists negocios_owner_sel on negocios;
create policy negocios_owner_sel on negocios for select using (owner_id = auth.uid());
drop policy if exists negocios_owner_ins on negocios;
create policy negocios_owner_ins on negocios for insert with check (owner_id = auth.uid());
drop policy if exists negocios_owner_upd on negocios;
create policy negocios_owner_upd on negocios for update using (owner_id = auth.uid());

-- ---------- A que dueno pertenece cada cliente ----------
alter table perfiles add column if not exists dueno_id uuid references auth.users (id);

-- ============================================================
-- MIGRACION del negocio unico anterior (id = 1) al nuevo modelo
-- ============================================================
insert into negocios (owner_id, slug, nombre)
select owner_id, lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)), coalesce(nombre, 'Alquileres')
from negocio
on conflict (owner_id) do nothing;

-- los clientes que ya existen quedan ligados al dueno del negocio anterior
update perfiles p
set dueno_id = (select owner_id from negocio where id = 1)
where p.tipo = 'cliente' and p.dueno_id is null
  and exists (select 1 from negocio where id = 1);

-- ============================================================
-- ALTA DE USUARIOS (RPC, corren con privilegios elevados)
-- ============================================================

-- Registrarse como DUENO: crea/asegura el perfil dueno y su negocio.
-- Devuelve el slug (la "direccion" de su catalogo).
create or replace function registrarse_dueno()
returns text
language plpgsql security definer set search_path = public as $$
declare v_slug text;
begin
  insert into perfiles (id, tipo, nombre)
  values (auth.uid(), 'dueno', coalesce((select email from auth.users where id = auth.uid()), ''))
  on conflict (id) do update set tipo = 'dueno';

  select slug into v_slug from negocios where owner_id = auth.uid();
  if v_slug is null then
    loop
      v_slug := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
      exit when not exists (select 1 from negocios where slug = v_slug);
    end loop;
    insert into negocios (owner_id, slug, nombre)
    values (auth.uid(), v_slug, 'Alquileres')
    on conflict (owner_id) do nothing;
    select slug into v_slug from negocios where owner_id = auth.uid();
  end if;
  return v_slug;
end; $$;

-- Registrarse como CLIENTE de un dueno (a partir del slug del link).
create or replace function registrarse_cliente(p_slug text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from negocios where slug = p_slug;
  if v_owner is null then raise exception 'Link invalido'; end if;
  insert into perfiles (id, tipo, nombre, dueno_id)
  values (auth.uid(), 'cliente', coalesce((select email from auth.users where id = auth.uid()), ''), v_owner)
  on conflict (id) do update set dueno_id = excluded.dueno_id
    where perfiles.tipo = 'cliente';
end; $$;

-- Nombre del negocio a partir del slug (para mostrarlo antes de loguearse).
create or replace function negocio_por_slug(p_slug text)
returns text
language sql security definer set search_path = public as $$
  select nombre from negocios where slug = p_slug;
$$;

-- Mi negocio (slug + nombre) para que el dueno vea/comparta su link.
create or replace function mi_negocio()
returns table (slug text, nombre text)
language sql security definer set search_path = public as $$
  select slug, nombre from negocios where owner_id = auth.uid();
$$;

-- Renombrar mi negocio (lo que ve el cliente en el portal).
create or replace function renombrar_negocio(p_nombre text)
returns void
language sql security definer set search_path = public as $$
  update negocios set nombre = coalesce(nullif(trim(p_nombre), ''), 'Alquileres') where owner_id = auth.uid();
$$;

-- ============================================================
-- PORTAL DEL CLIENTE: ahora usa el dueno al que pertenece el cliente
-- (perfiles.dueno_id), no un negocio fijo.
-- ============================================================
create or replace function portal_unidades()
returns table (id text, nombre text, tipo_unidad text, color text, foto text, localidad text, capacidad int, ambientes int, grupo_nombre text)
language sql security definer set search_path = public as $$
  select u.id, u.nombre, u.tipo_unidad, u.color, u.foto, u.localidad, u.capacidad, u.ambientes, coalesce(g.nombre, '')
  from unidades u
  left join grupos g on g.id = u.grupo_id
  where u.owner_id = (select dueno_id from perfiles where id = auth.uid())
  order by u.nombre;
$$;

create or replace function portal_ocupacion(p_unidad text)
returns table (check_in date, check_out date)
language sql security definer set search_path = public as $$
  select r.check_in, r.check_out
  from reservas r
  where r.unidad_id = p_unidad
    and r.owner_id = (select dueno_id from perfiles where id = auth.uid());
$$;

create or replace function portal_reservar(
  p_unidad text, p_check_in date, p_check_out date,
  p_huesped text, p_contacto text, p_monto numeric, p_moneda text
) returns text
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_id text;
begin
  select dueno_id into v_owner from perfiles where id = auth.uid();
  if v_owner is null then raise exception 'No autorizado'; end if;
  if p_check_in >= p_check_out then raise exception 'Fechas invalidas'; end if;
  if not exists (select 1 from unidades where id = p_unidad and owner_id = v_owner) then
    raise exception 'Unidad inexistente';
  end if;
  if exists (
    select 1 from reservas r
    where r.unidad_id = p_unidad and r.owner_id = v_owner
      and p_check_in < r.check_out and r.check_in < p_check_out
  ) then
    raise exception 'Esas fechas no estan disponibles';
  end if;
  v_id := gen_random_uuid()::text;
  insert into reservas (id, owner_id, unidad_id, huesped, contacto, check_in, check_out,
    monto_total, monto_mensual, sena, canal, tipo, moneda, actualizacion, indice, porcentaje_manual,
    hora_check_in, hora_check_out, notas, cliente_id, estado)
  values (v_id, v_owner, p_unidad, p_huesped, p_contacto, p_check_in, p_check_out,
    coalesce(p_monto, 0), 0, 0, 'Directo', 'temporal', coalesce(p_moneda, 'ARS'),
    'Sin actualizaci' || chr(243) || 'n', 'ICL', 0,
    '15:00', '11:00', '', auth.uid(), 'confirmada');
  return v_id;
end; $$;

create or replace function portal_pago_sena(p_reserva text, p_monto numeric, p_medio text, p_comprobante text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if not exists (select 1 from reservas where id = p_reserva and cliente_id = auth.uid()) then
    raise exception 'No autorizado';
  end if;
  select dueno_id into v_owner from perfiles where id = auth.uid();
  insert into pagos (id, owner_id, reserva_id, fecha, monto, medio, comprobante, nota)
  values (gen_random_uuid()::text, v_owner, p_reserva, current_date, coalesce(p_monto, 0),
    coalesce(p_medio, 'Transferencia'), p_comprobante, 'Se' || chr(241) || 'a (portal cliente)');
end; $$;

-- ---------- Permisos ----------
grant execute on function registrarse_dueno() to authenticated;
grant execute on function registrarse_cliente(text) to authenticated;
grant execute on function mi_negocio() to authenticated;
grant execute on function renombrar_negocio(text) to authenticated;
grant execute on function negocio_por_slug(text) to anon, authenticated;
grant execute on function portal_unidades() to authenticated;
grant execute on function portal_ocupacion(text) to authenticated;
grant execute on function portal_reservar(text, date, date, text, text, numeric, text) to authenticated;
grant execute on function portal_pago_sena(text, numeric, text, text) to authenticated;
