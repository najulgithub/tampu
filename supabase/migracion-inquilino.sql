-- ============================================================
-- Inquilino 360: cuenta corriente, registrar pagos, y chat dueno<->inquilino.
-- Correr en: Supabase -> SQL Editor. (Requiere migracion-servicios.sql y migracion-aumentos.sql)
-- ============================================================

-- Devuelve el owner_id si el usuario logueado es el inquilino del contrato
-- (vinculado por cliente_id o por email). NULL si no corresponde.
create or replace function contrato_owner(p_reserva text)
returns uuid language sql security definer set search_path = public as $$
  select r.owner_id from reservas r
  where r.id = p_reserva
    and r.owner_id = (select dueno_id from perfiles where id = auth.uid())
    and (r.cliente_id = auth.uid() or lower(coalesce(r.email_inquilino, '')) = lower(mi_email()));
$$;

-- portal_mis_contratos: ahora incluye los datos de actualizacion para calcular la cuenta corriente.
drop function if exists portal_mis_contratos();
create or replace function portal_mis_contratos()
returns table (id text, unidad text, check_in date, check_out date, servicios jsonb, dia_vencimiento int, monto_mensual numeric, moneda text, aumentos jsonb, actualizacion text, indice text, porcentaje_manual numeric)
language sql security definer set search_path = public as $$
  select r.id, u.nombre, r.check_in, r.check_out, r.servicios_inquilino, r.dia_vencimiento, r.monto_mensual, r.moneda, r.aumentos, r.actualizacion, r.indice, r.porcentaje_manual
  from reservas r join unidades u on u.id = r.unidad_id
  where r.owner_id = (select dueno_id from perfiles where id = auth.uid())
    and r.email_inquilino is not null
    and lower(r.email_inquilino) = lower(mi_email())
  order by r.check_in;
$$;

-- Pagos del contrato (para la cuenta corriente del inquilino).
create or replace function portal_pagos(p_reserva text)
returns table (id text, fecha date, monto numeric, medio text, periodo text, comprobante text, nota text)
language sql security definer set search_path = public as $$
  select p.id, p.fecha, p.monto, p.medio, p.periodo, p.comprobante, p.nota
  from pagos p
  where p.reserva_id = p_reserva and contrato_owner(p_reserva) is not null
  order by p.fecha;
$$;

-- Creditos: gastos que pago el inquilino de su unidad (se descuentan del alquiler).
create or replace function portal_creditos(p_reserva text)
returns table (fecha date, monto numeric)
language sql security definer set search_path = public as $$
  select g.fecha, g.monto
  from gastos g
  join reservas r on r.id = p_reserva
  where contrato_owner(p_reserva) is not null
    and g.pagado_por = 'inquilino' and g.ambito = 'unidad' and g.ref_id = r.unidad_id
    and g.fecha >= r.check_in and g.fecha < r.check_out;
$$;

-- El inquilino registra un pago de alquiler con su comprobante (queda marcado).
create or replace function portal_registrar_pago(p_reserva text, p_periodo text, p_monto numeric, p_medio text, p_comprobante text)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  v_owner := contrato_owner(p_reserva);
  if v_owner is null then raise exception 'No autorizado'; end if;
  insert into pagos (id, owner_id, reserva_id, fecha, monto, medio, comprobante, nota, periodo)
  values (gen_random_uuid()::text, v_owner, p_reserva, current_date, coalesce(p_monto, 0),
    coalesce(p_medio, 'Transferencia'), p_comprobante, 'Registrado por inquilino', nullif(p_periodo, ''));
end; $$;

-- ---------- Chat dueno <-> inquilino ----------
create table if not exists mensajes (
  id          text primary key,
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reserva_id  text not null,
  autor       text not null,  -- 'dueno' | 'inquilino'
  texto       text not null,
  created_at  timestamptz not null default now()
);
alter table mensajes enable row level security;
drop policy if exists mensajes_owner on mensajes;
create policy mensajes_owner on mensajes for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function portal_mensajes(p_reserva text)
returns table (autor text, texto text, created_at timestamptz)
language sql security definer set search_path = public as $$
  select m.autor, m.texto, m.created_at
  from mensajes m
  where m.reserva_id = p_reserva and contrato_owner(p_reserva) is not null
  order by m.created_at;
$$;

create or replace function portal_enviar_mensaje(p_reserva text, p_texto text)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  v_owner := contrato_owner(p_reserva);
  if v_owner is null then raise exception 'No autorizado'; end if;
  insert into mensajes (id, owner_id, reserva_id, autor, texto)
  values (gen_random_uuid()::text, v_owner, p_reserva, 'inquilino', trim(p_texto));
end; $$;

grant execute on function contrato_owner(text) to authenticated;
grant execute on function portal_mis_contratos() to authenticated;
grant execute on function portal_pagos(text) to authenticated;
grant execute on function portal_creditos(text) to authenticated;
grant execute on function portal_registrar_pago(text, text, numeric, text, text) to authenticated;
grant execute on function portal_mensajes(text) to authenticated;
grant execute on function portal_enviar_mensaje(text, text) to authenticated;
