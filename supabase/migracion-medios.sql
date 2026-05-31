-- ============================================================
-- Migración: medios de pago (entidad configurable)
-- Correr en: Supabase → SQL Editor
-- ============================================================

create table if not exists medios_pago (
  id         text primary key,
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre     text not null,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Por si la tabla ya existía sin la columna:
alter table medios_pago add column if not exists activo boolean not null default true;

alter table medios_pago enable row level security;

create policy medios_select on medios_pago for select using (owner_id = auth.uid());
create policy medios_insert on medios_pago for insert with check (owner_id = auth.uid());
create policy medios_update on medios_pago for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy medios_delete on medios_pago for delete using (owner_id = auth.uid());
