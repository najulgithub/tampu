// Utilidades de fechas. Trabajamos con strings ISO "yyyy-mm-dd" para evitar
// problemas de zona horaria (las reservas son por día, no por hora).

export function hoyISO(): string {
  return aISO(new Date());
}

export function aISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

// Parsea "yyyy-mm-dd" como fecha local (mediodía para evitar saltos de día por TZ).
export function desdeISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function formatearFecha(iso: string): string {
  if (!iso) return "";
  const d = desdeISO(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatearFechaCorta(iso: string): string {
  if (!iso) return "";
  const d = desdeISO(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

export function sumarDias(iso: string, n: number): string {
  const d = desdeISO(iso);
  d.setDate(d.getDate() + n);
  return aISO(d);
}

export function sumarMeses(iso: string, n: number): string {
  const d = desdeISO(iso);
  d.setMonth(d.getMonth() + n);
  return aISO(d);
}

export function noches(checkIn: string, checkOut: string): number {
  const a = desdeISO(checkIn).getTime();
  const b = desdeISO(checkOut).getTime();
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

// ¿Se solapan dos rangos? Las noches ocupadas van de checkIn (incl.) a checkOut (excl.).
// Dos reservas chocan si: aIn < bOut && bIn < aOut.
export function solapan(aIn: string, aOut: string, bIn: string, bOut: string): boolean {
  return aIn < bOut && bIn < aOut;
}

// ¿La fecha (día) está ocupada por una reserva [checkIn, checkOut)?
export function diaOcupado(diaISO: string, checkIn: string, checkOut: string): boolean {
  return diaISO >= checkIn && diaISO < checkOut;
}

const NOMBRES_MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function nombreMes(mes: number): string {
  return NOMBRES_MES[mes];
}

export interface CeldaCalendario {
  iso: string;
  dia: number;
  delMes: boolean; // false para días de relleno del mes anterior/siguiente
}

// Devuelve una grilla de 6 semanas (42 celdas) empezando en lunes.
export function grillaMes(anio: number, mes: number): CeldaCalendario[] {
  const primero = new Date(anio, mes, 1);
  // getDay(): 0=domingo..6=sábado. Queremos lunes como inicio.
  const offset = (primero.getDay() + 6) % 7;
  const inicio = new Date(anio, mes, 1 - offset);

  const celdas: CeldaCalendario[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
    celdas.push({
      iso: aISO(d),
      dia: d.getDate(),
      delMes: d.getMonth() === mes,
    });
  }
  return celdas;
}

export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
