-- ============================================================
-- Migración: registro de pagos + horarios de check-in/out
-- Correr en: Supabase → SQL Editor
-- ============================================================

-- Horarios en las reservas (con valores por defecto)
alter table reservas add column if not exists hora_check_in  text not null default '15:00';
alter table reservas add column if not exists hora_check_out text not null default '11:00';

-- Tabla de PAGOS (historial por reserva)
create table if not exists pagos (
  id          text primary key,
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reserva_id  text not null,
  fecha       date not null,
  monto       numeric not null default 0,
  medio       text not null default 'Efectivo',
  comprobante text,            -- imagen del comprobante (data URL), opcional
  nota        text default '',
  created_at  timestamptz not null default now()
);

alter table pagos enable row level security;

create policy pagos_select on pagos for select using (owner_id = auth.uid());
create policy pagos_insert on pagos for insert with check (owner_id = auth.uid());
create policy pagos_update on pagos for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy pagos_delete on pagos for delete using (owner_id = auth.uid());

create index if not exists idx_pagos_reserva on pagos (reserva_id);
