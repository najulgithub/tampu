-- ============================================================
-- Atributo "tiene cochera" en las unidades (deptos con/sin cochera).
-- (El tipo de unidad "Cochera" no necesita migración: es solo un valor.)
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

alter table unidades add column if not exists cochera boolean not null default false;
-- Para cocheras (o deptos con cochera): si entra una camioneta/pickup.
alter table unidades add column if not exists apto_camioneta boolean not null default false;

-- Tarifa diaria para temporales: valor por día (sin cochera) y con cochera.
alter table unidades add column if not exists precio_dia numeric;
alter table unidades add column if not exists precio_dia_cochera numeric;

-- En la reserva temporal: si se alquila con cochera (para el cálculo).
alter table reservas add column if not exists con_cochera boolean not null default false;

-- Ubicación de la cochera (ej: "Subsuelo 2, lugar 14").
alter table unidades add column if not exists ubicacion_cochera text;
