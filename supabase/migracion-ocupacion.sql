-- ============================================================
-- Disponibilidad para reservar desde el link (slug):
--  1) unidad_ocupacion_slug: devuelve los rangos ocupados (reservas no
--     canceladas + bloqueos importados) para mostrar el calendario al huésped.
--  2) reservar_en_slug: ahora valida que las fechas no se solapen (la verdad
--     vive en el servidor, aunque el front ya avise).
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

-- Rangos ocupados de todas las unidades del negocio del slug.
-- desde = check-in (incl.), hasta = check-out (excl., esa noche queda libre).
create or replace function unidad_ocupacion_slug(p_slug text)
returns table (unidad_id text, desde date, hasta date)
language sql security definer set search_path = public as $$
  select r.unidad_id, r.check_in, r.check_out
  from reservas r
  join negocios n on n.owner_id = r.owner_id
  where n.slug = p_slug and coalesce(r.estado, 'confirmada') <> 'cancelada'
  union all
  select b.unidad_id, b.desde, b.hasta
  from bloqueos b
  join negocios n on n.owner_id = b.owner_id
  where n.slug = p_slug;
$$;
grant execute on function unidad_ocupacion_slug(text) to authenticated;

-- Crear una reserva (pendiente de aprobación) en el negocio del slug,
-- validando que las fechas estén libres.
create or replace function reservar_en_slug(
  p_slug text, p_unidad text, p_check_in date, p_check_out date, p_huesped text, p_contacto text
) returns text language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_id text;
begin
  select owner_id into v_owner from negocios where slug = p_slug;
  if v_owner is null then raise exception 'Link inválido'; end if;
  if not exists (select 1 from unidades where id = p_unidad and owner_id = v_owner) then
    raise exception 'Unidad inexistente';
  end if;
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'Las fechas no son válidas';
  end if;

  -- Solapamiento con otra reserva no cancelada.
  if exists (
    select 1 from reservas
    where unidad_id = p_unidad and owner_id = v_owner
      and coalesce(estado, 'confirmada') <> 'cancelada'
      and p_check_in < check_out and check_in < p_check_out
  ) then
    raise exception 'Esas fechas ya están reservadas';
  end if;
  -- Solapamiento con un bloqueo importado (Airbnb/Booking…).
  if exists (
    select 1 from bloqueos
    where unidad_id = p_unidad and p_check_in < hasta and desde < p_check_out
  ) then
    raise exception 'Esas fechas no están disponibles';
  end if;

  v_id := gen_random_uuid()::text;
  insert into reservas (
    id, owner_id, unidad_id, huesped, contacto, check_in, check_out,
    monto_total, monto_mensual, sena, canal, tipo, moneda,
    actualizacion, indice, porcentaje_manual, estado, cliente_id
  ) values (
    v_id, v_owner, p_unidad, coalesce(nullif(trim(p_huesped), ''), 'Huésped'), p_contacto, p_check_in, p_check_out,
    0, 0, 0, 'Directo', 'temporal', 'ARS',
    'Sin actualización', 'IPC', 0, 'pendiente', auth.uid()
  );

  insert into perfiles (id, tipo, nombre)
  values (auth.uid(), 'cliente', coalesce((select email from auth.users where id = auth.uid()), ''))
  on conflict (id) do nothing;
  insert into cliente_duenos (cliente_id, owner_id) values (auth.uid(), v_owner) on conflict do nothing;

  return v_id;
end; $$;
grant execute on function reservar_en_slug(text, text, date, date, text, text) to authenticated;
