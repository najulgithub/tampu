-- ============================================================
-- Marca de leido (lado dueno) para la bandeja de mensajes.
-- Correr en: Supabase -> SQL Editor. (Requiere migracion-inquilino.sql)
-- ============================================================

alter table mensajes add column if not exists leido_dueno boolean not null default false;

-- El mensaje del inquilino sigue entrando como no leido (default false).
-- Los del dueno se marcan leidos desde la app al enviarlos.
