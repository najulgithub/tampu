-- ============================================================
-- Reservas en USD cobradas en pesos: cada pago guarda los pesos pagados y el
-- tipo de cambio usado. El campo 'monto' del pago queda en USD (equivalente),
-- así el saldo de la reserva se sigue llevando en dólares.
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

alter table pagos add column if not exists monto_ars numeric;
alter table pagos add column if not exists tipo_cambio numeric;
