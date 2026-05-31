-- ============================================================
-- Comprobante / factura del gasto (imagen en data URL).
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

alter table gastos add column if not exists comprobante text;
