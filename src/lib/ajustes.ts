import type { Reserva } from "./types";
import { esLargoPlazo, mesesActualizacion } from "./types";
import { sumarMeses } from "./fechas";

// Próxima fecha de ajuste de un contrato (checkIn + k·frecuencia) posterior a `hoy`,
// siempre que caiga dentro del contrato. Null si no aplica.
export function proximoAjuste(r: Reserva, hoy: string): string | null {
  const meses = mesesActualizacion(r.actualizacion);
  if (!esLargoPlazo(r.tipo) || meses === 0) return null;
  let f = r.checkIn;
  let guard = 0;
  while (f <= hoy && guard < 600) {
    f = sumarMeses(f, meses);
    guard++;
  }
  return f < r.checkOut ? f : null;
}

// Inicio del período que se está por ajustar (la fecha de ajuste menos la frecuencia).
export function inicioPeriodoDe(fechaAjuste: string, r: Reserva): string {
  return sumarMeses(fechaAjuste, -mesesActualizacion(r.actualizacion));
}

// Fechas de vencimiento mensual de un contrato (checkIn, +1 mes, … mientras < checkOut).
export function vencimientosMensuales(checkIn: string, checkOut: string): string[] {
  const fechas: string[] = [];
  let f = checkIn;
  let guard = 0;
  while (f < checkOut && guard < 600) {
    fechas.push(f);
    f = sumarMeses(f, 1);
    guard++;
  }
  return fechas;
}

// Cantidad de meses del contrato.
export function mesesContrato(checkIn: string, checkOut: string): number {
  return vencimientosMensuales(checkIn, checkOut).length;
}
