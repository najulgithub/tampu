// Cuenta corriente de un contrato largo: genera las cuotas mensuales e imputa
// los pagos (los que tienen periodo van a su mes; el resto, FIFO al más viejo).
import type { Reserva, Pago, Gasto } from "./types";
import { mesesActualizacion } from "./types";
import { vencimientosMensuales } from "./ajustes";

export type EstadoCuota = "pagada" | "parcial" | "pendiente" | "vencida";

export interface Cuota {
  periodo: string; // "yyyy-mm"
  inicio: string;  // ISO: inicio del mes de alquiler
  vence: string;   // ISO: fecha de vencimiento
  monto: number;   // alquiler del mes (con ajuste manual aplicado si corresponde)
  pagado: number;  // cobrado en efectivo/transferencia
  credito: number; // gastos que pagó el inquilino, descontados de este mes
  saldo: number;   // monto − pagado − credito
  estado: EstadoCuota;
}

export interface CtaCte {
  cuotas: Cuota[];
  totalContrato: number;
  totalPagado: number;   // suma de todos los pagos
  totalCredito: number;  // suma de gastos pagados por el inquilino
  devengado: number;     // suma de cuotas ya vencidas (vence <= hoy)
  saldoVencido: number;  // saldo impago de cuotas con vencimiento pasado
  proxima?: Cuota;       // primera cuota con saldo
}

const pad = (n: number) => String(n).padStart(2, "0");

// Importe vigente para un mes: el último aumento con desde <= periodo, o null si no hay.
export function aumentoVigente(aumentos: { desde: string; monto: number }[] | undefined, periodo: string): number | null {
  let m: number | null = null;
  for (const a of (aumentos ?? []).slice().sort((x, y) => x.desde.localeCompare(y.desde))) {
    if (a.desde <= periodo) m = a.monto;
  }
  return m;
}

// Gastos que pagó el inquilino de esta unidad, dentro de la vigencia del contrato.
function creditosDe(r: Reserva, gastos: Gasto[]): { periodo: string; monto: number }[] {
  return gastos
    .filter((g) => g.pagadoPor === "inquilino" && g.ambito === "unidad" && g.refId === r.unidadId && g.fecha >= r.checkIn && g.fecha < r.checkOut)
    .map((g) => ({ periodo: g.fecha.slice(0, 7), monto: g.monto }));
}

export function cuentaCorriente(r: Reserva, pagos: Pago[], hoy: string, gastos: Gasto[] = []): CtaCte {
  const inicios = vencimientosMensuales(r.checkIn, r.checkOut);
  const base = r.montoMensual > 0 ? r.montoMensual : 0;
  const freq = mesesActualizacion(r.actualizacion);
  const pct = r.indice === "Manual" ? r.porcentajeManual : 0;

  const cuotas: Cuota[] = inicios.map((ini, i) => {
    const periodo = ini.slice(0, 7);
    // Si hay un aumento aplicado vigente, manda ese importe; si no, base (+ % manual).
    const periodosAjuste = freq > 0 && pct > 0 ? Math.floor(i / freq) : 0;
    const override = aumentoVigente(r.aumentos, periodo);
    const monto = override ?? Math.round(base * Math.pow(1 + pct / 100, periodosAjuste));
    const vence = r.diaVencimiento ? `${periodo}-${pad(Math.min(r.diaVencimiento, 28))}` : ini;
    return { periodo, inicio: ini, vence, monto, pagado: 0, credito: 0, saldo: monto, estado: "pendiente" };
  });

  const porPeriodo = new Map(cuotas.map((c) => [c.periodo, c]));

  // 1) Créditos (gastos que pagó el inquilino) → al mes del gasto; excedente al pool.
  let poolCredito = 0;
  for (const cr of creditosDe(r, gastos)) {
    const c = porPeriodo.get(cr.periodo);
    if (c) {
      const aplica = Math.min(cr.monto, c.monto - c.credito - c.pagado);
      c.credito += Math.max(0, aplica);
      poolCredito += cr.monto - Math.max(0, aplica);
    } else {
      poolCredito += cr.monto;
    }
  }
  for (const c of cuotas) {
    if (poolCredito <= 0) break;
    const falta = c.monto - c.credito - c.pagado;
    if (falta <= 0) continue;
    const aplica = Math.min(poolCredito, falta);
    c.credito += aplica;
    poolCredito -= aplica;
  }

  // 2) Pagos en efectivo → al mes indicado o FIFO al más viejo con saldo.
  let pool = 0;
  for (const p of pagos) {
    const c = p.periodo ? porPeriodo.get(p.periodo) : undefined;
    if (c) {
      const aplica = Math.min(p.monto, Math.max(0, c.monto - c.credito - c.pagado));
      c.pagado += aplica;
      pool += p.monto - aplica;
    } else {
      pool += p.monto;
    }
  }
  for (const c of cuotas) {
    if (pool <= 0) break;
    const falta = c.monto - c.credito - c.pagado;
    if (falta <= 0) continue;
    const aplica = Math.min(pool, falta);
    c.pagado += aplica;
    pool -= aplica;
  }

  let devengado = 0, saldoVencido = 0;
  let proxima: Cuota | undefined;
  for (const c of cuotas) {
    c.saldo = Math.max(0, c.monto - c.pagado - c.credito);
    if (c.saldo <= 0) c.estado = "pagada";
    else if (c.vence < hoy) c.estado = "vencida";
    else if (c.pagado > 0 || c.credito > 0) c.estado = "parcial";
    else c.estado = "pendiente";
    if (c.vence <= hoy) devengado += c.monto;
    if (c.saldo > 0 && c.vence < hoy) saldoVencido += c.saldo;
    if (!proxima && c.saldo > 0) proxima = c;
  }

  return {
    cuotas,
    totalContrato: cuotas.reduce((a, c) => a + c.monto, 0),
    totalPagado: pagos.reduce((a, p) => a + p.monto, 0),
    totalCredito: cuotas.reduce((a, c) => a + c.credito, 0),
    devengado,
    saldoVencido,
    proxima,
  };
}
