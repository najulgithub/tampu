-- ============================================================
-- Bloqueos de fechas importados desde calendarios externos (Airbnb,
-- Booking, etc. vía iCal). Marcan la unidad como ocupada en tampu para
-- evitar overbooking. Los escribe el server (sync), por unidad+plataforma.
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

create table if not exists bloqueos (
  id          text primary key default gen_random_uuid()::text,
  owner_id    uuid not null default mi_owner(),
  unidad_id   text not null,
  plataforma  text not null default 'Otro',
  desde       date not null,   -- check-in (incl.)
  hasta       date not null,   -- check-out (excl.)
  created_at  timestamptz not null default now()
);
alter table bloqueos enable row level security;

drop policy if exists bloqueos_sel on bloqueos;
create policy bloqueos_sel on bloqueos for select using (owner_id = mi_owner());
drop policy if exists bloqueos_ins on bloqueos;
create policy bloqueos_ins on bloqueos for insert with check (owner_id = mi_owner());
drop policy if exists bloqueos_del on bloqueos;
create policy bloqueos_del on bloqueos for delete using (owner_id = mi_owner());

create index if not exists idx_bloqueos_unidad on bloqueos (unidad_id);
