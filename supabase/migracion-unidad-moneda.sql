-- ============================================================
-- Moneda por defecto de cada unidad (ARS, USD, etc.). La tarifa por día y
-- las reservas nuevas de esa unidad salen en esta moneda.
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

alter table unidades add column if not exists moneda text;
