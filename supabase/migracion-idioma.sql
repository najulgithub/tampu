-- ============================================================
-- Idioma de la interfaz por cuenta (es | de). Por defecto español.
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

alter table configuracion add column if not exists idioma text not null default 'es';
