-- ============================================================
-- Guía del huésped por unidad (se ve escaneando el QR de la unidad):
-- wifi, encargado, instrucciones y puntos de interés.
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

alter table unidades add column if not exists wifi_nombre text;
alter table unidades add column if not exists wifi_clave text;
alter table unidades add column if not exists encargado_nombre text;
alter table unidades add column if not exists encargado_tel text;
alter table unidades add column if not exists instrucciones text;
alter table unidades add column if not exists puntos_interes jsonb not null default '[]'::jsonb;
