-- ============================================================
-- Pago multimoneda: cada pago puede entrar en pesos o dólares, sin importar
-- la moneda de la reserva. 'monto' sigue siendo el equivalente en la moneda
-- de la reserva (base del saldo); 'moneda_pago' + 'monto_ingresado' guardan
-- lo que realmente entró, y 'tipo_cambio' el TC usado si hubo conversión.
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

alter table pagos add column if not exists moneda_pago     text;
alter table pagos add column if not exists monto_ingresado numeric;
