-- ============================================================
-- Paso 2 de Personal: comisiones por reserva.
--  - reservas.comisiones: hasta 2 líneas [{personalId, modo, valor, tc}].
--  - gastos.personal_id: vincula el gasto-comisión a la persona (para la
--    cuenta corriente del paso 3). Cada línea genera un gasto "Comisión {rol}
--    — {nombre}" en la unidad, pendiente de pago.
-- Correr en: Supabase -> SQL Editor. (Requiere migracion-personal.sql)
-- ============================================================

alter table reservas add column if not exists comisiones jsonb not null default '[]'::jsonb;
alter table gastos   add column if not exists personal_id text;
