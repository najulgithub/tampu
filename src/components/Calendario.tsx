"use client";

import { useState } from "react";
import type { Reserva, Bloqueo, Canal } from "@/lib/types";
import { COLOR_CANAL } from "@/lib/types";
import { grillaMes, nombreMes, DIAS_SEMANA, diaOcupado, hoyISO } from "@/lib/fechas";

export default function Calendario({
  reservas,
  bloqueos = [],
  onClickDia,
  onClickReserva,
}: {
  reservas: Reserva[];
  bloqueos?: Bloqueo[];
  onClickDia?: (iso: string) => void;
  onClickReserva?: (r: Reserva) => void;
}) {
  const ahora = new Date();
  const [anio, setAnio] = useState(ahora.getFullYear());
  const [mes, setMes] = useState(ahora.getMonth());
  const hoy = hoyISO();

  const celdas = grillaMes(anio, mes);

  function mover(delta: number) {
    const m = mes + delta;
    if (m < 0) {
      setMes(11);
      setAnio((a) => a - 1);
    } else if (m > 11) {
      setMes(0);
      setAnio((a) => a + 1);
    } else {
      setMes(m);
    }
  }

  function reservaEnDia(iso: string): Reserva | undefined {
    return reservas.find((r) => diaOcupado(iso, r.checkIn, r.checkOut));
  }
  function bloqueoEnDia(iso: string): Bloqueo | undefined {
    return bloqueos.find((b) => diaOcupado(iso, b.desde, b.hasta));
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => mover(-1)} className="px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400" aria-label="Mes anterior">
          ‹
        </button>
        <div className="font-semibold text-slate-800 dark:text-slate-100 capitalize">
          {nombreMes(mes)} {anio}
        </div>
        <button onClick={() => mover(1)} className="px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400" aria-label="Mes siguiente">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-slate-400 dark:text-slate-500 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celdas.map((c) => {
          // Quién pasa la noche (ocupa el día) y quién se va esa mañana.
          const noche = reservaEnDia(c.iso);
          const salida = reservas.find((r) => r.checkOut === c.iso) ?? null;
          const bloq = !noche && !salida ? bloqueoEnDia(c.iso) : null;
          const esHoy = c.iso === hoy;
          const corte = noche && salida && noche.id !== salida.id;

          let style: React.CSSProperties | undefined;
          let clases = "bg-slate-50 dark:bg-slate-700/40 ring-1 ring-inset ring-slate-200/80 dark:ring-slate-600/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/70";
          let title = "Libre";

          if (corte) {
            // Día de transición: se va uno (mañana) y entra otro (tarde) → diagonal.
            const a = COLOR_CANAL[salida!.canal].hex;
            const b = COLOR_CANAL[noche!.canal].hex;
            style = {
              background: `linear-gradient(135deg, ${a} 0 48%, transparent 48% 52%, ${b} 52% 100%)`,
              textShadow: "0 1px 2px rgba(0,0,0,0.5)",
            };
            clases = "text-white font-bold";
            title = `Sale ${salida!.huesped} · Entra ${noche!.huesped}`;
          } else if (noche) {
            const col = COLOR_CANAL[noche.canal];
            clases = `${col.bg} ${col.texto} font-semibold`;
            title = `${noche.huesped} · ${noche.canal}`;
          } else if (salida) {
            // Se va alguien y no entra nadie: media celda (mañana ocupada).
            const a = COLOR_CANAL[salida.canal].hex;
            style = { background: `linear-gradient(135deg, ${a}cc 0 48%, transparent 48%)` };
            clases = "text-slate-700 dark:text-slate-200 font-semibold";
            title = `Sale ${salida.huesped}`;
          } else if (bloq) {
            // Día ocupado por un bloqueo importado (Airbnb/Booking…).
            const col = COLOR_CANAL[bloq.plataforma as Canal];
            clases = col ? `${col.bg} ${col.texto} font-semibold` : "bg-slate-300 dark:bg-slate-500 text-slate-700 dark:text-slate-100 font-semibold";
            title = `Bloqueado · ${bloq.plataforma}`;
          }

          const onClick = () => {
            if (noche && onClickReserva) onClickReserva(noche);
            else if (salida && onClickReserva) onClickReserva(salida);
            else if (onClickDia) onClickDia(c.iso);
          };

          return (
            <button
              key={c.iso}
              onClick={onClick}
              style={style}
              className={[
                "aspect-square rounded-lg grid place-items-center text-xs sm:text-sm transition relative",
                c.delMes ? "" : "opacity-30",
                clases,
                esHoy ? "ring-2 ring-teal-500 ring-inset" : "",
              ].join(" ")}
              title={title}
            >
              {c.dia}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
        <span className="text-xs text-slate-400 dark:text-slate-500">Días con color = ocupado:</span>
        {Object.entries(COLOR_CANAL).map(([canal, c]) => (
          <div key={canal} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className={`w-2.5 h-2.5 rounded-full ${c.punto}`} />
            {canal}
          </div>
        ))}
      </div>
    </div>
  );
}
