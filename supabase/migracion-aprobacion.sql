-- ============================================================
-- Paso de aprobacion: las reservas del portal de clientes nacen
-- como "pendiente". El dueno revisa el comprobante y las aprueba
-- (estado = 'confirmada') o las rechaza (las borra) desde la app.
-- Correr en: Supabase -> SQL Editor.
-- (Requiere haber corrido antes: migracion-multitenant.sql)
-- ============================================================

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
    '15:00', '11:00', '', auth.uid(), 'pendiente');
  return v_id;
end; $$;

grant execute on function portal_reservar(text, date, date, text, text, numeric, text) to authenticated;
