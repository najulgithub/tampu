-- ============================================================
-- Cuenta corriente por inquilino: imputar cada pago a un mes/cuota.
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

-- Mes (yyyy-mm) al que se imputa el pago en contratos largos. Vacio = automatico.
alter table pagos add column if not exists periodo text;
