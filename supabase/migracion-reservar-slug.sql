-- ============================================================
-- Reservar en otro dueño desde su link, aunque ya tengas cuenta (incluso si sos
-- dueño de otro negocio). Guiado por el slug del link, no por el rol.
-- Correr en: Supabase -> SQL Editor. (Requiere migracion-multi-dueno.sql)
-- ============================================================

-- Unidades del dueño dueño del slug (para mostrar el portal de ese negocio).
drop function if exists negocio_unidades_slug(text);
create or replace function negocio_unidades_slug(p_slug text)
returns table (id text, nombre text, tipo_unidad text, color text, foto text, localidad text, capacidad int, ambientes int, precio_dia numeric, moneda text)
language sql security definer set search_path = public as $$
  select u.id, u.nombre, u.tipo_unidad, u.color, u.foto, u.localidad, u.capacidad, u.ambientes, u.precio_dia, u.moneda
  from unidades u
  join negocios n on n.owner_id = u.owner_id
  where n.slug = p_slug
  order by u.nombre;
$$;
grant execute on function negocio_unidades_slug(text) to authenticated;

-- Crear una reserva (pendiente de aprobación) en el negocio del slug.
-- Vincula a quien reserva como cliente de ese dueño, sin cambiarle su rol.
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

  -- Queda vinculado como cliente de ese dueño (no le cambia el rol si ya es dueño).
  insert into perfiles (id, tipo, nombre)
  values (auth.uid(), 'cliente', coalesce((select email from auth.users where id = auth.uid()), ''))
  on conflict (id) do nothing;
  insert into cliente_duenos (cliente_id, owner_id) values (auth.uid(), v_owner) on conflict do nothing;

  return v_id;
end; $$;
grant execute on function reservar_en_slug(text, text, date, date, text, text) to authenticated;
