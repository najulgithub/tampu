"use client";

import { useEffect, useState } from "react";
import type { Reserva } from "@/lib/types";
import { SIMBOLO_MONEDA } from "@/lib/types";
import { hoyISO, formatearFecha } from "@/lib/fechas";
import { proximoAjuste, inicioPeriodoDe } from "@/lib/ajustes";
import { variacionIPC, variacionICL } from "@/lib/indices";
import { Overlay, Campo } from "@/components/ui";

export default function CalculoAjuste({ reserva, onCerrar }: { reserva: Reserva; onCerrar: () => void }) {
  const hoy = hoyISO();
  const fechaAjuste = proximoAjuste(reserva, hoy);
  const inicio = fechaAjuste ? inicioPeriodoDe(fechaAjuste, reserva) : reserva.checkIn;
  const simbolo = SIMBOLO_MONEDA[reserva.moneda];

  // Monto actual sobre el que se aplica el ajuste (el alquiler mensual en contratos largos).
  const [montoActual, setMontoActual] = useState(reserva.montoMensual > 0 ? reserva.montoMensual : reserva.montoTotal);
  const [variacion, setVariacion] = useState<number>(reserva.indice === "Manual" ? reserva.porcentajeManual : 0);
  const [estado, setEstado] = useState<"idle" | "cargando" | "ok" | "manual">(
    reserva.indice === "Manual" ? "ok" : "idle"
  );

  // Para IPC/ICL intentamos traer la variación del período automáticamente.
  useEffect(() => {
    if (reserva.indice === "Manual" || !fechaAjuste) return;
    let activo = true;
    setEstado("cargando");
    const fetcher = reserva.indice === "IPC" ? variacionIPC(inicio, fechaAjuste) : variacionICL();
    fetcher.then((v) => {
      if (!activo) return;
      if (v !== null) {
        setVariacion(v);
        setEstado("ok");
      } else {
        setEstado("manual");
      }
    });
    return () => { activo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const montoNuevo = Math.round(montoActual * (1 + variacion / 100));
  const aumento = montoNuevo - montoActual;

  const mensaje =
    `Hola ${reserva.huesped}, te informo que ${fechaAjuste ? `a partir del ${formatearFecha(fechaAjuste)} ` : ""}` +
    `corresponde la actualización del alquiler por ${reserva.indice} (${variacion}%). ` +
    `El nuevo importe pasa a ser ${simbolo}${montoNuevo.toLocaleString("es-AR")} ` +
    `(antes ${simbolo}${montoActual.toLocaleString("es-AR")}). ¡Gracias!`;

  return (
    <Overlay titulo="Calcular ajuste" onCerrar={onCerrar}>
      <div className="space-y-4">
        <div className="text-sm text-slate-600 dark:text-slate-300">
          <div className="font-medium text-slate-800 dark:text-slate-100">{reserva.huesped}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {reserva.actualizacion} · índice {reserva.indice}
            {fechaAjuste && ` · período ${formatearFecha(inicio)} → ${formatearFecha(fechaAjuste)}`}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Campo label={`Monto actual (${simbolo})`}>
            <input
              type="text" inputMode="numeric"
              value={montoActual > 0 ? montoActual.toLocaleString("es-AR") : ""}
              onChange={(e) => setMontoActual(Number(e.target.value.replace(/\D/g, "")) || 0)}
              className="input text-right"
            />
          </Campo>
          <Campo label="Variación del período (%)">
            <input
              type="number" step="0.01"
              value={variacion}
              onChange={(e) => setVariacion(Number(e.target.value))}
              className="input text-right"
            />
          </Campo>
        </div>

        {estado === "cargando" && (
          <p className="text-xs text-slate-400 dark:text-slate-500">Buscando {reserva.indice} del período…</p>
        )}
        {estado === "manual" && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            No se pudo traer el {reserva.indice} automáticamente. Ingresá la variación a mano.
          </p>
        )}

        <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-4 space-y-1">
          <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
            <span>Aumento</span>
            <span className="text-amber-600 dark:text-amber-400">+{simbolo}{aumento.toLocaleString("es-AR")}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-slate-800 dark:text-slate-100">
            <span>Nuevo importe</span>
            <span>{simbolo}{montoNuevo.toLocaleString("es-AR")}</span>
          </div>
        </div>

        <Campo label="Mensaje para el inquilino">
          <textarea readOnly value={mensaje} className="input min-h-28 text-sm" />
        </Campo>

        <div className="flex justify-end gap-2">
          <button onClick={() => navigator.clipboard?.writeText(mensaje)} className="btn-secundario">
            Copiar mensaje
          </button>
          <button onClick={onCerrar} className="btn-primario">Listo</button>
        </div>
      </div>
    </Overlay>
  );
}
