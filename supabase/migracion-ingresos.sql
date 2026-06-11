-- ============================================================
-- Otros ingresos (no-alquiler): venta de muebles, electrodomésticos,
-- reintegros, etc. Se imputan a una unidad, un grupo o todo el negocio
-- y suman en el informe económico.
-- Correr en: Supabase -> SQL Editor.
-- (Requiere migracion-colaboradores.sql por mi_owner()/puede_editar())
-- ============================================================

create table if not exists ingresos (
  id          text primary key default gen_random_uuid()::text,
  owner_id    uuid not null default mi_owner(),
  ambito      text not null default 'unidad',  -- unidad | grupo | general
  ref_id      text not null default '',
  fecha       date not null,
  categoria   text not null default 'Otro',
  descripcion text default '',
  monto       numeric not null default 0,
  reparto     jsonb,                            -- snapshot de % por unidad (solo grupo)
  created_at  timestamptz not null default now()
);
alter table ingresos enable row level security;

-- Mismo criterio que gastos: el permiso de edición es el módulo 'gastos'.
drop policy if exists ingresos_sel on ingresos;
create policy ingresos_sel on ingresos for select using (owner_id = mi_owner());
drop policy if exists ingresos_ins on ingresos;
create policy ingresos_ins on ingresos for insert with check (owner_id = mi_owner() and puede_editar('gastos'));
drop policy if exists ingresos_upd on ingresos;
create policy ingresos_upd on ingresos for update using (owner_id = mi_owner() and puede_editar('gastos')) with check (owner_id = mi_owner() and puede_editar('gastos'));
drop policy if exists ingresos_del on ingresos;
create policy ingresos_del on ingresos for delete using (owner_id = mi_owner() and puede_editar('gastos'));

create index if not exists idx_ingresos_owner on ingresos (owner_id);
