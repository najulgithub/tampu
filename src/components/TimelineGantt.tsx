"use client";

import Link from "next/link";
import { desdeISO, sumarDias, nombreMes } from "@/lib/fechas";
import { COLOR_CANAL } from "@/lib/types";
import type { Unidad } from "@/lib/types";
import { META_TAREA } from "@/lib/tareas";
import type { Tarea } from "@/lib/tareas";
import type { Reserva } from "@/lib/types";

const difDias = (a: string, b: string) => Math.round((desdeISO(b).getTime() - desdeISO(a).getTime()) / 86400000);

// Timeline horizontal (Gantt): una fila por unidad, reservas como barras y
// eventos (cobros/ajustes) como marcadores, sobre un eje de fechas [desde, hasta].
export default function TimelineGantt({
  unidades,
  reservas,
  eventos,
  desde,
  hasta,
  hoy,
}: {
  unidades: Unidad[];
  reservas: Reserva[];
  eventos: Tarea[];
  desde: string;
  hasta: string;
  hoy: string;
}) {
  const dias = Math.max(1, difDias(desde, hasta) + 1);
  const px = Math.min(30, Math.max(4, Math.round(1100 / dias))); // px por día (adaptativo)
  const ancho = dias * px;
  const leftCol = 128;
  const rowH = 40;

  // Segmentos de mes para el encabezado.
  const meses: { key: string; label: string; left: number; width: number }[] = [];
  let cursor = desde.slice(0, 8) + "01";
  while (cursor <= hasta) {
    const [y, m] = cursor.split("-").map(Number);
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const segStart = cursor < desde ? desde : cursor;
    const segEndExcl = nextMonth <= hasta ? nextMonth : sumarDias(hasta, 1);
    meses.push({
      key: cursor,
      label: `${nombreMes(m - 1)} '${String(y).slice(2)}`,
      left: difDias(desde, segStart) * px,
      width: difDias(segStart, segEndExcl) * px,
    });
    cursor = nextMonth;
  }

  const idxHoy = hoy >= desde && hoy <= hasta ? difDias(desde, hoy) : -1;

  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ width: leftCol + ancho }}>
          {/* Encabezado de meses */}
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <div style={{ width: leftCol }} className="sticky left-0 z-20 bg-white dark:bg-slate-800 shrink-0 border-r border-slate-100 dark:border-slate-700/50" />
            <div className="relative" style={{ width: ancho, height: 28 }}>
              {meses.map((mz) => (
                <div
                  key={mz.key}
                  className="absolute top-0 h-7 flex items-center border-l border-slate-200 dark:border-slate-700 pl-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 capitalize overflow-hidden"
                  style={{ left: mz.left, width: mz.width }}
                >
                  {mz.width > 30 ? mz.label : ""}
                </div>
              ))}
              {idxHoy >= 0 && <div className="absolute top-0 bottom-0 w-px bg-teal-500/70 z-10" style={{ left: idxHoy * px }} />}
            </div>
          </div>

          {/* Filas por unidad */}
          {unidades.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-500">No hay unidades para mostrar.</div>
          ) : (
            unidades.map((u) => {
              const rs = reservas.filter((r) => r.unidadId === u.id);
              const evs = eventos.filter((e) => e.reserva.unidadId === u.id);
              return (
                <div key={u.id} className="flex border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                  <div
                    style={{ width: leftCol }}
                    className="sticky left-0 z-20 bg-white dark:bg-slate-800 shrink-0 px-3 flex items-center border-r border-slate-100 dark:border-slate-700/50"
                  >
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{u.nombre}</span>
                  </div>
                  <div className="relative" style={{ width: ancho, height: rowH }}>
                    {idxHoy >= 0 && <div className="absolute top-0 bottom-0 w-px bg-teal-500/25" style={{ left: idxHoy * px }} />}

                    {/* Reservas (barras) */}
                    {rs.map((r) => {
                      const ini = Math.max(0, difDias(desde, r.checkIn));
                      const finIdx = Math.min(dias, difDias(desde, r.checkOut));
                      if (finIdx <= 0 || ini >= dias || finIdx <= ini) return null;
                      const left = ini * px;
                      const width = Math.max(px * 0.6, (finIdx - ini) * px - 1);
                      return (
                        <Link
                          key={r.id}
                          href={`/unidades/${u.id}`}
                          title={`${r.huesped} · ${r.checkIn} → ${r.checkOut}`}
                          className="absolute rounded-md flex items-center px-1.5 overflow-hidden shadow-sm hover:brightness-110 hover:ring-2 hover:ring-slate-900/15 dark:hover:ring-white/20 transition"
                          style={{ left, width, top: 9, height: 22, background: COLOR_CANAL[r.canal].hex }}
                        >
                          {width > 52 && <span className="text-[10px] font-medium text-white/95 truncate">{r.huesped}</span>}
                        </Link>
                      );
                    })}

                    {/* Eventos (marcadores) */}
                    {evs.map((e, i) => {
                      const idx = difDias(desde, e.fecha);
                      if (idx < 0 || idx >= dias) return null;
                      return (
                        <Link
                          key={`${e.tipo}-${i}`}
                          href={`/unidades/${u.id}`}
                          title={`${META_TAREA[e.tipo].label} · ${e.reserva.huesped} · ${e.fecha}`}
                          className={`absolute w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-800 ${META_TAREA[e.tipo].dot} hover:scale-150 transition z-10`}
                          style={{ left: idx * px + px / 2 - 6, top: 1 }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
