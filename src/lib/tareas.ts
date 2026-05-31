// Modelo de "tareas" de la agenda: eventos accionables con fecha, derivados de
// las reservas (llegadas, salidas, cobros/vencimientos, ajustes, fin de contrato).
import type { Reserva, Pago, Gasto } from "./types";
import { esLargoPlazo } from "./types";
import { proximoAjuste } from "./ajustes";
import { cuentaCorriente } from "./cuentaCorriente";

export type TipoTarea = "llegada" | "salida" | "cobro" | "ajuste" | "contrato";

export interface Tarea {
  fecha: string; // ISO yyyy-mm-dd
  tipo: TipoTarea;
  reserva: Reserva;
}

export const META_TAREA: Record<TipoTarea, { label: string; dot: string; texto: string }> = {
  llegada:  { label: "Llegada",         dot: "bg-teal-500",   texto: "text-teal-600 dark:text-teal-400" },
  salida:   { label: "Salida / limpieza", dot: "bg-amber-500",  texto: "text-amber-600 dark:text-amber-400" },
  cobro:    { label: "Cobro",           dot: "bg-rose-500",   texto: "text-rose-600 dark:text-rose-400" },
  ajuste:   { label: "Ajuste",          dot: "bg-violet-500", texto: "text-violet-600 dark:text-violet-400" },
  contrato: { label: "Fin de contrato", dot: "bg-violet-500", texto: "text-violet-600 dark:text-violet-400" },
};

const pad = (n: number) => String(n).padStart(2, "0");

// Ocurrencias de un vencimiento mensual (día del mes) dentro de [desde, hasta],
// acotadas a la vigencia del contrato [iniContrato, finContrato].
function vencimientosMensuales(diaMes: number, desde: string, hasta: string, iniContrato: string, finContrato: string): string[] {
  const out: string[] = [];
  const ini = desde < iniContrato ? iniContrato : desde;
  const fin = hasta < finContrato ? hasta : finContrato;
  if (ini > fin) return out;
  const [y0, m0] = ini.split("-").map(Number);
  let y = y0, m = m0;
  for (let i = 0; i < 60; i++) {
    const f = `${y}-${pad(m)}-${pad(Math.min(diaMes, 28))}`;
    if (f > fin) break;
    if (f >= ini) out.push(f);
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
}

export function generarTareas(
  reservas: Reserva[],
  desde: string,
  hasta: string,
  opts: { saldoDe: (r: Reserva) => number; ajusteInflacion: boolean; pagos?: Pago[]; gastos?: Gasto[] }
): Tarea[] {
  const tareas: Tarea[] = [];
  const enRango = (f: string) => f >= desde && f <= hasta;

  // Si nos pasan los pagos, agrupamos por reserva para omitir cuotas ya saldadas.
  const pagosPorReserva = new Map<string, Pago[]>();
  if (opts.pagos) {
    for (const p of opts.pagos) {
      const arr = pagosPorReserva.get(p.reservaId) ?? [];
      arr.push(p);
      pagosPorReserva.set(p.reservaId, arr);
    }
  }

  for (const r of reservas) {
    if (r.estado === "pendiente" || r.estado === "cancelada") continue;
    const largo = esLargoPlazo(r.tipo);

    if (enRango(r.checkIn)) tareas.push({ fecha: r.checkIn, tipo: "llegada", reserva: r });
    if (enRango(r.checkOut)) tareas.push({ fecha: r.checkOut, tipo: largo ? "contrato" : "salida", reserva: r });

    // Cobros / vencimientos
    if (largo && r.diaVencimiento) {
      if (opts.pagos) {
        // Con pagos: solo las cuotas con saldo pendiente.
        const cc = cuentaCorriente(r, pagosPorReserva.get(r.id) ?? [], desde, opts.gastos ?? []);
        for (const c of cc.cuotas) {
          if (c.saldo > 0 && enRango(c.vence)) tareas.push({ fecha: c.vence, tipo: "cobro", reserva: r });
        }
      } else {
        for (const f of vencimientosMensuales(r.diaVencimiento, desde, hasta, r.checkIn, r.checkOut)) {
          tareas.push({ fecha: f, tipo: "cobro", reserva: r });
        }
      }
    } else if (!largo && r.vencimiento && enRango(r.vencimiento) && opts.saldoDe(r) > 0) {
      tareas.push({ fecha: r.vencimiento, tipo: "cobro", reserva: r });
    }

    // Ajustes por índice
    if (opts.ajusteInflacion && largo) {
      const pa = proximoAjuste(r, desde);
      if (pa && enRango(pa)) tareas.push({ fecha: pa, tipo: "ajuste", reserva: r });
    }
  }

  return tareas.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function agruparPorDia(tareas: Tarea[]): Map<string, Tarea[]> {
  const m = new Map<string, Tarea[]>();
  for (const t of tareas) {
    const arr = m.get(t.fecha) ?? [];
    arr.push(t);
    m.set(t.fecha, arr);
  }
  return m;
}
