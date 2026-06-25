"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { COLOR_CANAL, TIPO_LABEL, SIMBOLO_MONEDA, esLargoPlazo } from "@/lib/types";
import type { Reserva, Bloqueo, Canal } from "@/lib/types";
import { formatearFecha, noches, hoyISO } from "@/lib/fechas";
import Calendario from "@/components/Calendario";
import FormReserva from "@/components/FormReserva";
import AvatarUnidad from "@/components/AvatarUnidad";

export default function DetalleUnidad() {
  const params = useParams<{ id: string }>();
  const { cargado, getUnidad, reservasDe, nombreGrupo, getGrupo, bloqueosDe, t } = useStore();

  const [abrirNueva, setAbrirNueva] = useState(false);
  const [fechaInicial, setFechaInicial] = useState<string | undefined>();
  const [editando, setEditando] = useState<Reserva | undefined>();
  const [convertir, setConvertir] = useState<Bloqueo | undefined>(); // bloqueo importado a convertir en reserva

  if (!cargado) return null;
  const uni = getUnidad(params.id);

  if (!uni) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 dark:text-slate-400 mb-4">{t("No se encontró esta unidad.")}</p>
        <Link href="/unidades" className="text-teal-600 hover:underline">← {t("Volver a unidades")}</Link>
      </div>
    );
  }

  const reservas = reservasDe(uni.id);
  const hoy = hoyISO();
  const proximas = reservas.filter((r) => r.checkOut >= hoy);
  const pasadas = reservas.filter((r) => r.checkOut < hoy);

  return (
    <div>
      <div className="mb-5">
        <Link href="/unidades" className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">← {t("Unidades")}</Link>
        <div className="flex flex-col gap-3 mt-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <AvatarUnidad unidad={uni} size={52} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">{uni.nombre}</h1>
                {getGrupo(uni.grupoId) && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {nombreGrupo(uni.grupoId)}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{uni.tipoUnidad} · {uni.direccion} · {uni.localidad}</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/unidades/${uni.id}/config`} className="btn-secundario flex-1 sm:flex-none text-center">{t("Configuración")}</Link>
            <button
              onClick={() => { setFechaInicial(undefined); setAbrirNueva(true); }}
              className="btn-primario flex-1 sm:flex-none"
            >
              + {t("Reserva")}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Calendario
          reservas={reservas}
          bloqueos={bloqueosDe(uni.id)}
          onClickDia={(iso) => { setFechaInicial(iso); setAbrirNueva(true); }}
          onClickBloqueo={(b) => setConvertir(b)}
          onClickReserva={(r) => setEditando(r)}
        />

        <div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
            {t("Próximas reservas")} ({proximas.length})
          </h2>
          <div className="space-y-2">
            {proximas.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500">{t("Sin reservas próximas.")}</p>
            )}
            {proximas.map((r) => (
              <FilaReserva key={r.id} r={r} onClick={() => setEditando(r)} />
            ))}
          </div>

          {pasadas.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-5 mb-2">
                {t("Pasadas")} ({pasadas.length})
              </h2>
              <div className="space-y-2 opacity-70">
                {pasadas.map((r) => (
                  <FilaReserva key={r.id} r={r} onClick={() => setEditando(r)} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {abrirNueva && (
        <FormReserva
          unidadId={uni.id}
          fechaInicial={fechaInicial}
          onCerrar={() => setAbrirNueva(false)}
        />
      )}
      {editando && (
        <FormReserva
          unidadId={uni.id}
          reserva={editando}
          onCerrar={() => setEditando(undefined)}
        />
      )}
      {convertir && (
        <FormReserva
          unidadId={uni.id}
          fechaInicial={convertir.desde}
          checkOutInicial={convertir.hasta}
          canalInicial={convertir.plataforma as Canal}
          sobreBloqueo
          onCerrar={() => setConvertir(undefined)}
        />
      )}
    </div>
  );
}

function FilaReserva({ r, onClick }: { r: Reserva; onClick: () => void }) {
  const { saldoDe, t } = useStore();
  const color = COLOR_CANAL[r.canal];
  const saldo = saldoDe(r);
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-3 hover:border-teal-400 dark:hover:border-teal-500 transition"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">{r.huesped}</span>
        <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded ${color.bg} ${color.texto}`}>
          {r.canal}
        </span>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        {formatearFecha(r.checkIn)} → {formatearFecha(r.checkOut)} · {noches(r.checkIn, r.checkOut)} {t("noches")}
      </div>
      <div className="text-xs mt-1 flex items-center gap-2">
        {esLargoPlazo(r.tipo) && (
          <span className="text-violet-600 dark:text-violet-400">
            {TIPO_LABEL[r.tipo]}
            {r.actualizacion !== "Sin actualización" &&
              ` · ${r.actualizacion} (${r.indice === "Manual" ? `${r.porcentajeManual}%` : r.indice})`}
          </span>
        )}
        {esLargoPlazo(r.tipo) ? (
          r.montoMensual > 0 && (
            <span className="text-slate-500 dark:text-slate-400">
              {SIMBOLO_MONEDA[r.moneda]}{r.montoMensual.toLocaleString("es-AR")}/{t("mes")}
            </span>
          )
        ) : (
          r.montoTotal > 0 && (
            <span className={saldo > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
              {saldo > 0 ? `${t("Saldo")} ${SIMBOLO_MONEDA[r.moneda]}${saldo.toLocaleString("es-AR")}` : t("Pagado")}
            </span>
          )
        )}
      </div>
    </button>
  );
}
