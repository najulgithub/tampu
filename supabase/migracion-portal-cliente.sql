-- ============================================================
-- Portal de clientes: perfiles + negocio + funciones seguras (RPC)
-- Correr en: Supabase → SQL Editor
--
-- IMPORTANTE: antes de correr, reemplazá  TU-USER-ID-AQUI  por tu UID.
-- Lo encontrás en: Supabase → Authentication → Users → (tu email) → User UID.
-- ============================================================

-- ---------- Perfiles (tipo de usuario) ----------
create table if not exists perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  tipo       text not null default 'cliente',   -- 'dueno' | 'cliente'
  nombre     text default '',
  created_at timestamptz not null default now()
);
alter table perfiles enable row level security;
create policy perfiles_select on perfiles for select using (id = auth.uid());
create policy perfiles_insert on perfiles for insert with check (id = auth.uid());
create policy perfiles_update on perfiles for update using (id = auth.uid());

-- ---------- Negocio (quién es el dueño; single-tenant) ----------
create table if not exists negocio (
  id        int primary key default 1,
  owner_id  uuid not null references auth.users (id),
  nombre    text default 'Alquileres'
);
alter table negocio enable row level security;
create policy negocio_read on negocio for select using (auth.role() = 'authenticated');

-- ---------- Marcas de cliente en reservas ----------
alter table reservas add column if not exists cliente_id uuid;
alter table reservas add column if not exists estado text not null default 'confirmada';
-- el cliente puede ver SOLO las reservas que él creó (el dueño ya ve todas)
drop policy if exists reservas_cliente_select on reservas;
create policy reservas_cliente_select on reservas for select using (cliente_id = auth.uid());

-- ============================================================
-- DATOS INICIALES: marcá quién sos dueño (reemplazá el UID)
-- ============================================================
insert into negocio (id, owner_id, nombre)
values (1, 'TU-USER-ID-AQUI', 'Alquileres')
on conflict (id) do update set owner_id = excluded.owner_id;

insert into perfiles (id, tipo, nombre)
values ('TU-USER-ID-AQUI', 'dueno', 'Propietario')
on conflict (id) do update set tipo = 'dueno';

-- ============================================================
-- FUNCIONES SEGURAS (RPC) que usa el portal del cliente
-- Corren con privilegios elevados pero exponen solo lo necesario.
-- ============================================================

-- Unidades del negocio (datos públicos, sin notas ni iCal)
create or replace function portal_unidades()
returns table (id text, nombre text, tipo_unidad text, color text, foto text, localidad text, capacidad int, ambientes int, grupo_nombre text)
language sql security definer set search_path = public as $$
  select u.id, u.nombre, u.tipo_unidad, u.color, u.foto, u.localidad, u.capacidad, u.ambientes, coalesce(g.nombre, '')
  from unidades u
  left join grupos g on g.id = u.grupo_id
  where u.owner_id = (select owner_id from negocio where id = 1)
  order by u.nombre;
$$;

-- Días ocupados de una unidad (solo rangos, sin datos del huésped)
create or replace function portal_ocupacion(p_unidad text)
returns table (check_in date, check_out date)
language sql security definer set search_path = public as $$
  select r.check_in, r.check_out
  from reservas r
  where r.unidad_id = p_unidad
    and r.owner_id = (select owner_id from negocio where id = 1);
$$;

-- Crear una reserva como cliente (valida solapamiento). Devuelve el id.
create or replace function portal_reservar(
  p_unidad text, p_check_in date, p_check_out date,
  p_huesped text, p_contacto text, p_monto numeric, p_moneda text
) returns text
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_id text;
begin
  select owner_id into v_owner from negocio where id = 1;
  if p_check_in >= p_check_out then raise exception 'Fechas inválidas'; end if;
  -- la unidad debe ser del negocio
  if not exists (select 1 from unidades where id = p_unidad and owner_id = v_owner) then
    raise exception 'Unidad inexistente';
  end if;
  -- no se debe pisar con otra reserva (las noches no se superponen)
  if exists (
    select 1 from reservas r
    where r.unidad_id = p_unidad and p_check_in < r.check_out and r.check_in < p_check_out
  ) then
    raise exception 'Esas fechas no están disponibles';
  end if;
  v_id := gen_random_uuid()::text;
  insert into reservas (id, owner_id, unidad_id, huesped, contacto, check_in, check_out,
    monto_total, monto_mensual, sena, canal, tipo, moneda, actualizacion, indice, porcentaje_manual,
    hora_check_in, hora_check_out, notas, cliente_id, estado)
  values (v_id, v_owner, p_unidad, p_huesped, p_contacto, p_check_in, p_check_out,
    coalesce(p_monto, 0), 0, 0, 'Directo', 'temporal', coalesce(p_moneda, 'ARS'), 'Sin actualización', 'ICL', 0,
    '15:00', '11:00', '', auth.uid(), 'confirmada');
  return v_id;
end; $$;

-- Registrar el pago/comprobante de la seña (solo sobre la reserva propia del cliente)
create or replace function portal_pago_sena(p_reserva text, p_monto numeric, p_medio text, p_comprobante text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if not exists (select 1 from reservas where id = p_reserva and cliente_id = auth.uid()) then
    raise exception 'No autorizado';
  end if;
  select owner_id into v_owner from negocio where id = 1;
  insert into pagos (id, owner_id, reserva_id, fecha, monto, medio, comprobante, nota)
  values (gen_random_uuid()::text, v_owner, p_reserva, current_date, coalesce(p_monto, 0), coalesce(p_medio, 'Transferencia'), p_comprobante, 'Seña (portal cliente)');
end; $$;

grant execute on function portal_unidades() to authenticated;
grant execute on function portal_ocupacion(text) to authenticated;
grant execute on function portal_reservar(text, date, date, text, text, numeric, text) to authenticated;
grant execute on function portal_pago_sena(text, numeric, text, text) to authenticated;
