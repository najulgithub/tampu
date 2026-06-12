-- ============================================================
-- Atributo "tiene cochera" en las unidades (deptos con/sin cochera).
-- (El tipo de unidad "Cochera" no necesita migración: es solo un valor.)
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

alter table unidades add column if not exists cochera boolean not null default false;
-- Para cocheras (o deptos con cochera): si entra una camioneta/pickup.
alter table unidades add column if not exists apto_camioneta boolean not null default false;
