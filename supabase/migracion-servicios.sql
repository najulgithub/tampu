-- ============================================================
-- Servicios a cargo del inquilino (contratos largos):
--   - que servicios paga (config por contrato)
--   - comprobantes mensuales que sube el inquilino
--   - portal del inquilino (vinculado por email)
-- Correr en: Supabase -> SQL Editor.
-- (Requiere migracion-multitenant.sql)
-- ============================================================

alter table reservas add column if not exists servicios_inquilino jsonb not null default '[]'::jsonb;
alter table reservas add column if not exists email_inquilino text;

-- ---------- Comprobantes de servicios (uno por contrato/mes/servicio) ----------
create table if not exists comprobantes_servicio (
  id          text primary key,
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reserva_id  text not null,
  periodo     text not null,   -- yyyy-mm
  servicio    text not null,
  comprobante text,
  monto       numeric not null default 0,
  fecha       date not null default current_date,
  created_at  timestamptz not null default now(),
  unique (reserva_id, periodo, servicio)
);
alter table comprobantes_servicio enable row level security;
drop policy if exists cs_select on comprobantes_servicio;
create policy cs_select on comprobantes_servicio for select using (owner_id = auth.uid());
drop policy if exists cs_insert on comprobantes_servicio;
create policy cs_insert on comprobantes_servicio for insert with check (owner_id = auth.uid());
drop policy if exists cs_update on comprobantes_servicio;
create policy cs_update on comprobantes_servicio for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists cs_delete on comprobantes_servicio;
create policy cs_delete on comprobantes_servicio for delete using (owner_id = auth.uid());

-- ============================================================
-- PORTAL DEL INQUILINO (contratos largos), vinculado por email.
-- ============================================================

-- Email del usuario logueado.
create or replace function mi_email()
returns text language sql security definer set search_path = public, auth as $$
  select email from auth.users where id = auth.uid();
$$;

-- Contratos del inquilino logueado (su email coincide con email_inquilino).
create or replace function portal_mis_contratos()
returns table (id text, unidad text, check_in date, check_out date, servicios jsonb, dia_vencimiento int, monto_mensual numeric, moneda text)
language sql security definer set search_path = public as $$
  select r.id, u.nombre, r.check_in, r.check_out, r.servicios_inquilino, r.dia_vencimiento, r.monto_mensual, r.moneda
  from reservas r
  join unidades u on u.id = r.unidad_id
  where r.owner_id = (select dueno_id from perfiles where id = auth.uid())
    and r.email_inquilino is not null
    and lower(r.email_inquilino) = lower(mi_email())
  order by r.check_in;
$$;

-- Comprobantes ya cargados de un contrato propio del inquilino.
create or replace function portal_servicios(p_reserva text)
returns table (periodo text, servicio text, comprobante text, monto numeric, fecha date)
language sql security definer set search_path = public as $$
  select cs.periodo, cs.servicio, cs.comprobante, cs.monto, cs.fecha
  from comprobantes_servicio cs
  where cs.reserva_id = p_reserva
    and exists (
      select 1 from reservas r
      where r.id = p_reserva
        and r.owner_id = (select dueno_id from perfiles where id = auth.uid())
        and lower(r.email_inquilino) = lower(mi_email())
    );
$$;

-- Cargar/actualizar el comprobante de un servicio de un mes.
create or replace function portal_cargar_servicio(p_reserva text, p_periodo text, p_servicio text, p_comprobante text, p_monto numeric)
returns void
language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select r.owner_id into v_owner from reservas r
   where r.id = p_reserva
     and r.owner_id = (select dueno_id from perfiles where id = auth.uid())
     and lower(r.email_inquilino) = lower(mi_email());
  if v_owner is null then raise exception 'No autorizado'; end if;
  insert into comprobantes_servicio (id, owner_id, reserva_id, periodo, servicio, comprobante, monto, fecha)
  values (gen_random_uuid()::text, v_owner, p_reserva, p_periodo, p_servicio, p_comprobante, coalesce(p_monto, 0), current_date)
  on conflict (reserva_id, periodo, servicio)
  do update set comprobante = excluded.comprobante, monto = excluded.monto, fecha = excluded.fecha;
end; $$;

grant execute on function mi_email() to authenticated;
grant execute on function portal_mis_contratos() to authenticated;
grant execute on function portal_servicios(text) to authenticated;
grant execute on function portal_cargar_servicio(text, text, text, text, numeric) to authenticated;
