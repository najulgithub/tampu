-- ============================================================
-- Aumentos del alquiler (nuevo importe vigente desde un mes).
-- Correr en: Supabase -> SQL Editor.
-- (Requiere haber corrido antes: migracion-servicios.sql)
-- ============================================================

alter table reservas add column if not exists aumentos jsonb not null default '[]'::jsonb;

-- Se redefine portal_mis_contratos para devolver tambien los aumentos.
-- (drop necesario: cambia el tipo de retorno de la funcion)
drop function if exists portal_mis_contratos();
create or replace function portal_mis_contratos()
returns table (id text, unidad text, check_in date, check_out date, servicios jsonb, dia_vencimiento int, monto_mensual numeric, moneda text, aumentos jsonb)
language sql security definer set search_path = public as $$
  select r.id, u.nombre, r.check_in, r.check_out, r.servicios_inquilino, r.dia_vencimiento, r.monto_mensual, r.moneda, r.aumentos
  from reservas r
  join unidades u on u.id = r.unidad_id
  where r.owner_id = (select dueno_id from perfiles where id = auth.uid())
    and r.email_inquilino is not null
    and lower(r.email_inquilino) = lower(mi_email())
  order by r.check_in;
$$;

grant execute on function portal_mis_contratos() to authenticated;
