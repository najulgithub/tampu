-- ============================================================
-- Configuracion regional (por dueno) + vencimientos de pago.
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

-- ---------- Configuracion regional ----------
create table if not exists configuracion (
  owner_id         uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  pais             text not null default 'AR',
  moneda_default   text not null default 'ARS',
  ajuste_inflacion boolean not null default true,
  dia_vencimiento  int,
  created_at       timestamptz not null default now()
);
alter table configuracion enable row level security;
drop policy if exists configuracion_select on configuracion;
create policy configuracion_select on configuracion for select using (owner_id = auth.uid());
drop policy if exists configuracion_insert on configuracion;
create policy configuracion_insert on configuracion for insert with check (owner_id = auth.uid());
drop policy if exists configuracion_update on configuracion;
create policy configuracion_update on configuracion for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------- Vencimientos de pago en reservas ----------
-- vencimiento: fecha puntual del saldo (temporal). dia_vencimiento: dia del mes (largo plazo).
alter table reservas add column if not exists vencimiento date;
alter table reservas add column if not exists dia_vencimiento int;
