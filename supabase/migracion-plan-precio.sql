-- ============================================================
-- Guarda el precio mensual que está pagando cada suscripción, para
-- detectar cuándo el dueño creció de tramo y ofrecerle subir de plan.
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

alter table suscripciones add column if not exists precio int;
