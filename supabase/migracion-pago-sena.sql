-- ============================================================
-- Permite marcar un PAGO como la "seña" (con su fecha real). Donde haya un
-- pago marcado, la app ignora el campo 'sena' de la reserva para no duplicar.
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

alter table pagos add column if not exists es_sena boolean not null default false;
