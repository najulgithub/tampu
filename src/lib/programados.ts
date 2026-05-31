import type { GastoProgramado, Gasto, Reserva, Unidad, RepartoItem } from "./types";
import { sumarDias, sumarMeses } from "./fechas";

const MESES_FREQ: Record<string, number> = { Mensual: 1, Bimestral: 2, Trimestral: 3, Anual: 12 };

// Genera los Gastos reales que correspondan a los programados, hasta hoy,
// sin duplicar (cada ocurrencia tiene una claveOrigen única).
export function generarGastos(
  programados: GastoProgramado[],
  reservas: Reserva[],
  unidades: Unidad[],
  gastosExistentes: Gasto[],
  hoy: string,
  nuevoId: () => string
): Gasto[] {
  const claves = new Set(gastosExistentes.map((g) => g.claveOrigen).filter(Boolean) as string[]);
  const nuevos: Gasto[] = [];

  const repartoEquit = (grupoId: string): RepartoItem[] | undefined => {
    const us = unidades.filter((u) => u.grupoId === grupoId);
    if (us.length === 0) return undefined;
    const base = Math.floor((100 / us.length) * 100) / 100;
    const r = us.map((u) => ({ unidadId: u.id, porcentaje: base }));
    const resto = Math.round((100 - base * us.length) * 100) / 100;
    r[r.length - 1].porcentaje = Math.round((base + resto) * 100) / 100;
    return r;
  };

  for (const p of programados) {
    if (!p.activo) continue;

    if (p.frecuencia === "Por check-out") {
      // Un gasto en cada check-out (ya ocurrido) de la unidad o de las unidades del grupo.
      const objetivo = reservas.filter((r) =>
        p.ambito === "unidad"
          ? r.unidadId === p.refId
          : unidades.some((u) => u.grupoId === p.refId && u.id === r.unidadId)
      );
      for (const r of objetivo) {
        if (r.checkOut > hoy) continue;
        const clave = `${p.id}|${r.id}`;
        if (claves.has(clave)) continue;
        claves.add(clave);
        nuevos.push({
          id: nuevoId(),
          ambito: "unidad",
          refId: r.unidadId,
          fecha: r.checkOut,
          categoria: p.categoria,
          descripcion: p.descripcion,
          monto: p.monto,
          proveedor: p.proveedor,
          claveOrigen: clave,
        });
      }
    } else {
      const pasoMeses = MESES_FREQ[p.frecuencia];
      let f = p.fechaInicio;
      let guard = 0;
      while (f <= hoy && guard < 2000) {
        const clave = `${p.id}|${f}`;
        if (!claves.has(clave)) {
          claves.add(clave);
          nuevos.push({
            id: nuevoId(),
            ambito: p.ambito,
            refId: p.refId,
            fecha: f,
            categoria: p.categoria,
            descripcion: p.descripcion,
            monto: p.monto,
            proveedor: p.proveedor,
            reparto: p.ambito === "grupo" ? repartoEquit(p.refId) : undefined,
            claveOrigen: clave,
          });
        }
        f = p.frecuencia === "Quincenal" ? sumarDias(f, 15) : sumarMeses(f, pasoMeses);
        guard++;
      }
    }
  }
  return nuevos;
}
