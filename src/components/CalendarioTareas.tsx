"use client";

import { grillaMes, DIAS_SEMANA, nombreMes } from "@/lib/fechas";
import type { Tarea } from "@/lib/tareas";
import { META_TAREA } from "@/lib/tareas";
import { useStore } from "@/lib/store";

// Calendario mensual con marcadores de tareas por día. Al tocar un día se
// selecciona (el detalle se muestra fuera, en la página).
export default function CalendarioTareas({
  anio,
  mes,
  hoy,
  diaSel,
  tareasPorDia,
  onMes,
  onSel,
}: {
  anio: number;
  mes: number; // 0-11
  hoy: string;
  diaSel: string;
  tareasPorDia: Map<string, Tarea[]>;
  onMes: (delta: number) => void;
  onSel: (iso: string) => void;
}) {
  const { t } = useStore();
  const celdas = grillaMes(anio, mes);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => onMes(-1)}
          className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50 transition text-lg"
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <div className="font-display font-semibold text-slate-800 dark:text-slate-100 capitalize">
          {t(nombreMes(mes))} {anio}
        </div>
        <button
          onClick={() => onMes(1)}
          className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50 transition text-lg"
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">{t(d)}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celdas.map((c) => {
          const ts = tareasPorDia.get(c.iso) ?? [];
          const tipos = Array.from(new Set(ts.map((t) => t.tipo)));
          const esHoy = c.iso === hoy;
          const sel = c.iso === diaSel;
          return (
            <button
              key={c.iso}
              onClick={() => onSel(c.iso)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-1 text-sm ring-1 ring-inset transition ${
                sel
                  ? "bg-teal-600 text-white ring-teal-600 shadow-md shadow-teal-600/20 font-semibold"
                  : esHoy
                  ? "bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-teal-300 dark:ring-teal-500/50 font-semibold"
                  : c.delMes
                  ? "bg-slate-50 dark:bg-slate-700/40 text-slate-700 dark:text-slate-100 ring-slate-200/80 dark:ring-slate-600/50 hover:bg-slate-100 dark:hover:bg-slate-700/70 hover:ring-slate-300 dark:hover:ring-slate-500"
                  : "bg-transparent text-slate-300 dark:text-slate-600 ring-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              <span className="leading-none tabular-nums">{c.dia}</span>
              <span className="flex gap-0.5 h-1.5">
                {tipos.slice(0, 4).map((tp) => (
                  <span key={tp} className={`w-1.5 h-1.5 rounded-full ${sel ? "bg-white/90" : META_TAREA[tp].dot}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
