-- ============================================================
-- Comisión de plataforma (Booking/Airbnb…) en la reserva. Se vuelca como
-- gasto de la unidad con el concepto "Comisión {canal}" (clave_origen único).
-- Correr en: Supabase -> SQL Editor.
-- ============================================================

alter table reservas add column if not exists comision numeric;
