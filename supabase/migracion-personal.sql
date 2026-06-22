-- ============================================================
-- Personal: gente que cobra una comisión por reserva (recepcionista,
-- gestor, limpieza…). NO son colaboradores (no se loguean) ni proveedores
-- (no prestan un servicio que se factura). Se llevan un % del neto o un fijo.
-- Acá va solo el ABM; las comisiones por reserva y la cuenta corriente
-- se agregan en una migración posterior.
-- Correr en: Supabase -> SQL Editor. (Requiere migracion-multitenant.sql)
-- ============================================================

create table if not exists personal (
  id         text primary key,
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre     text not null,
  rol        text default 'Otro',          -- Recepcionista | Gestor | Limpieza | Otro
  telefono   text default '',
  alias      text default '',              -- alias/CBU para pagarle
  notas      text default '',
  modo       text default 'porcentaje',    -- porcentaje | fijo (default de la comisión)
  valor      numeric not null default 0,   -- % o monto fijo por defecto
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table personal enable row level security;
drop policy if exists personal_all on personal;
create policy personal_all on personal for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
