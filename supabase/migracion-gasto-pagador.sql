-- ============================================================
-- Quien pago el gasto: 'dueno' (default) o 'inquilino'.
-- Si lo pago el inquilino, se acredita contra su alquiler (cuenta corriente).
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

alter table gastos add column if not exists pagado_por text not null default 'dueno';
