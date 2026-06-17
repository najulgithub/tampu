-- ============================================================
-- Gastos programados de importe VARIABLE (luz, gas, expensas, agua):
-- se sabe que vienen cada mes, pero el monto se carga mes a mes.
-- El programado marca 'variable'; cada ocurrencia nace 'pendiente' (monto 0)
-- hasta que el dueño le carga el importe real.
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

alter table gastos_programados add column if not exists variable boolean not null default false;
alter table gastos add column if not exists pendiente boolean not null default false;
