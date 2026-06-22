-- ============================================================
-- Paso 3 de Personal: cuenta corriente.
-- Marca de pago sobre el gasto-comisión: 'pagado' = ya le pagué a la persona.
-- (Es independiente de 'pendiente', que significa "gasto variable sin importe".)
-- La cuenta corriente se calcula agrupando los gastos por personal_id.
-- Correr en: Supabase -> SQL Editor. (Requiere migracion-personal-comision.sql)
-- ============================================================

alter table gastos add column if not exists pagado boolean not null default false;
alter table gastos add column if not exists pagado_fecha date;
