"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { hoyISO, sumarDias, sumarMeses, formatearFecha, desdeISO, diaOcupado } from "@/lib/fechas";
import { SIMBOLO_MONEDA } from "@/lib/types";
import type { Reserva } from "@/lib/types";
import { generarTareas, agruparPorDia, META_TAREA } from "@/lib/tareas";
import type { Tarea } from "@/lib/tareas";
import CalculoAjuste from "@/components/CalculoAjuste";
import CalendarioTareas from "@/components/CalendarioTareas";
import { Overlay } from "@/components/ui";
import { Monto } from "@/components/Monto";

export default function Agenda() {
  const { unidades, reservas, saldoDe, config, pagos, gastos } = useStore();
  const hoy = hoyISO();

  const [mesAncla, setMesAncla] = useState(hoy.slice(0, 7) + "-01"); // primer día del mes visible
  const [diaSel, setDiaSel] = useState(hoy);
  const [calcular, setCalcular] = useState<Reserva | undefined>();

  const nombreUnidad = (id: string) => unidades.find((u) => u.id === id)?.nombre ?? "—";
  const opts = { saldoDe, ajusteInflacion: config.ajusteInflacion, pagos, gastos };

  // Próximos eventos (timeline): hoy → +14 días
  const tareasProximas = generarTareas(reservas, hoy, sumarDias(hoy, 14), opts);
  const proximasPorDia = agruparPorDia(tareasProximas);

  // Tareas del mes visible (incluye relleno de la grilla, +/- una semana)
  const anio = Number(mesAncla.slice(0, 4));
  const mes0 = Number(mesAncla.slice(5, 7)) - 1;
  const tareasMes = generarTareas(reservas, sumarDias(mesAncla, -7), sumarMeses(mesAncla, 1), opts);
  const mesPorDia = agruparPorDia(tareasMes);
  const tareasDelDia = (mesPorDia.get(diaSel) ?? []).slice().sort((a, b) => a.tipo.localeCompare(b.tipo));

  function cambiarMes(delta: number) {
    setMesAncla((prev) => sumarMeses(prev, delta).slice(0, 7) + "-01");
  }

  // KPIs de hoy
  const ocupadasHoy = unidades.filter((u) =>
    reservas.some((r) => r.unidadId === u.id && r.estado !== "pendiente" && r.estado !== "cancelada" && diaOcupado(hoy, r.checkIn, r.checkOut))
  ).length;
  const llegadasHoy = (proximasPorDia.get(hoy) ?? []).filter((t) => t.tipo === "llegada").length;
  const salidasHoy = (proximasPorDia.get(hoy) ?? []).filter((t) => t.tipo === "salida").length;
  const libres = Math.max(0, unidades.length - ocupadasHoy);

  const fechaHoy = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  function etiquetaDia(iso: string) {
    if (iso === hoy) return "Hoy";
    if (iso === sumarDias(hoy, 1)) return "Mañana";
    return desdeISO(iso).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" });
  }

  // Etiqueta corta para el timeline (columna izquierda).
  function etiquetaCorta(iso: string) {
    if (iso === hoy) return "Hoy";
    if (iso === sumarDias(hoy, 1)) return "Mañana";
    return desdeISO(iso).toLocaleDateString("es-AR", { weekday: "short", day: "numeric" });
  }

  // Detalle a la derecha de cada tarea según su tipo
  function detalleTarea(t: Tarea): React.ReactNode {
    const r = t.reserva;
    const sim = SIMBOLO_MONEDA[r.moneda];
    switch (t.tipo) {
      case "llegada": {
        const saldo = saldoDe(r);
        return (
          <div>
            <div className="text-slate-600 dark:text-slate-300">{r.horaCheckIn}h</div>
            {saldo > 0 && <div className="text-amber-600 dark:text-amber-400">Debe <Monto valor={saldo} simbolo={sim} /></div>}
          </div>
        );
      }
      case "salida":
        return <span className="text-slate-600 dark:text-slate-300">{r.horaCheckOut}h</span>;
      case "cobro": {
        const monto = r.montoMensual > 0 ? r.montoMensual : saldoDe(r);
        return <span className="text-rose-600 dark:text-rose-400"><Monto valor={monto} simbolo={sim} /></span>;
      }
      case "ajuste":
        return <span className="text-violet-600 dark:text-violet-400">{r.indice === "Manual" ? `Manual ${r.porcentajeManual}%` : r.indice}</span>;
      case "contrato":
        return <span className="text-violet-600 dark:text-violet-400">Vence</span>;
    }
  }

  function FilaTarea({ t }: { t: Tarea }) {
    const r = t.reserva;
    const meta = META_TAREA[t.tipo];
    const interior = (
      <>
        <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${meta.dot}`} title={meta.label} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{r.huesped}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
            <span className={meta.texto}>{meta.label}</span> · {nombreUnidad(r.unidadId)}
          </div>
        </div>
        <div className="shrink-0 text-right text-xs">{detalleTarea(t)}</div>
      </>
    );
    const cls = "flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition w-full text-left";
    // El ajuste abre la calculadora; el resto navega a la unidad.
    if (t.tipo === "ajuste") {
      return <button onClick={() => setCalcular(r)} className={cls}>{interior}</button>;
    }
    return <Link href={`/unidades/${r.unidadId}`} className={cls}>{interior}</Link>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">Hoy</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{fechaHoy}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Kpi valor={llegadasHoy} label="Llegadas hoy" tono="teal" />
        <Kpi valor={salidasHoy} label="Salidas hoy" tono="amber" />
        <Kpi valor={ocupadasHoy} label="Ocupadas" tono="rose" />
        <Kpi valor={libres} label="Libres" tono="emerald" />
      </div>

      <BandejaAprobacion />

      {/* Timeline de próximos eventos */}
      <section className="mb-8">
        <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">Próximos eventos</h2>
        {tareasProximas.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Sin eventos en los próximos 14 días. 🧉</p>
        ) : (
          <div className="card p-4">
            {tareasProximas.map((t, i) => {
              const prev = tareasProximas[i - 1];
              const nuevoDia = !prev || prev.fecha !== t.fecha;
              const ultimo = i === tareasProximas.length - 1;
              const meta = META_TAREA[t.tipo];
              const r = t.reserva;
              const cuerpo = (
                <div className="flex items-center gap-3 w-full">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{r.huesped}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      <span className={meta.texto}>{meta.label}</span> · {nombreUnidad(r.unidadId)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs">{detalleTarea(t)}</div>
                </div>
              );
              return (
                <div key={`${t.tipo}-${r.id}-${i}`} className="flex gap-3">
                  {/* Columna fecha */}
                  <div className="w-14 shrink-0 text-right pt-2">
                    {nuevoDia && <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 capitalize leading-tight">{etiquetaCorta(t.fecha)}</div>}
                  </div>
                  {/* Línea + nodo */}
                  <div className="flex flex-col items-center self-stretch w-3 shrink-0">
                    <span className={`w-px h-2 ${prev ? "bg-slate-200 dark:bg-slate-700/70" : "bg-transparent"}`} />
                    <span className={`w-3 h-3 rounded-full shrink-0 ${meta.dot}`} />
                    <span className={`w-px flex-1 ${ultimo ? "bg-transparent" : "bg-slate-200 dark:bg-slate-700/70"}`} />
                  </div>
                  {/* Contenido */}
                  {t.tipo === "ajuste" ? (
                    <button onClick={() => setCalcular(r)} className="flex-1 text-left pb-4 hover:opacity-75 transition">{cuerpo}</button>
                  ) : (
                    <Link href={`/unidades/${r.unidadId}`} className="flex-1 pb-4 hover:opacity-75 transition">{cuerpo}</Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Calendario de tareas */}
      <section>
        <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">Calendario</h2>
        <CalendarioTareas
          anio={anio}
          mes={mes0}
          hoy={hoy}
          diaSel={diaSel}
          tareasPorDia={mesPorDia}
          onMes={cambiarMes}
          onSel={setDiaSel}
        />

        <div className="mt-3">
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 capitalize">{etiquetaDia(diaSel)}</div>
          {tareasDelDia.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 px-1">Sin tareas este día.</p>
          ) : (
            <div className="card divide-y divide-slate-100 dark:divide-slate-700/50 p-1">
              {tareasDelDia.map((t, i) => <FilaTarea key={`${t.tipo}-${t.reserva.id}-${i}`} t={t} />)}
            </div>
          )}
        </div>
      </section>

      {calcular && <CalculoAjuste reserva={calcular} onCerrar={() => setCalcular(undefined)} />}
    </div>
  );
}

function Kpi({
  valor,
  label,
  tono,
}: {
  valor: number;
  label: string;
  tono: "teal" | "amber" | "rose" | "emerald";
}) {
  const colores = {
    teal: { txt: "text-teal-600 dark:text-teal-400", dot: "bg-teal-500" },
    amber: { txt: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
    rose: { txt: "text-rose-600 dark:text-rose-400", dot: "bg-rose-500" },
    emerald: { txt: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  };
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${colores[tono].dot}`} />
        <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <div className={`text-3xl font-semibold mt-1.5 tabular-nums ${colores[tono].txt}`}>{valor}</div>
    </div>
  );
}

// Bandeja de reservas del portal pendientes de aprobación.
// Muestra el comprobante de seña para que el dueño verifique antes de confirmar.
function BandejaAprobacion() {
  const { reservas, unidades, pagosDe, updateReserva, deleteReserva } = useStore();
  const [ver, setVer] = useState<string | null>(null);

  const pendientes = reservas
    .filter((r) => r.estado === "pendiente")
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  if (pendientes.length === 0) return null;

  const nombreUnidad = (id: string) => unidades.find((u) => u.id === id)?.nombre ?? "—";

  return (
    <div className="mb-6 rounded-2xl border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10 overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-amber-200/70 dark:border-amber-500/20">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Reservas por aprobar</span>
        <span className="text-xs text-amber-600 dark:text-amber-400 tabular-nums">{pendientes.length}</span>
      </div>
      <div className="divide-y divide-amber-100 dark:divide-amber-500/10">
        {pendientes.map((r) => {
          const pagos = pagosDe(r.id);
          return (
            <div key={r.id} className="p-4">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{r.huesped}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{nombreUnidad(r.unidadId)}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {formatearFecha(r.checkIn)} → {formatearFecha(r.checkOut)}
                </div>
                {r.contacto && <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{r.contacto}</div>}
              </div>

              {pagos.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {pagos.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-lg bg-white dark:bg-slate-800 p-2 border border-slate-200 dark:border-slate-700/60">
                      {p.comprobante ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <button onClick={() => setVer(p.comprobante!)} className="shrink-0">
                          <img src={p.comprobante} alt="Comprobante" className="w-12 h-12 rounded-md object-cover ring-1 ring-black/5" />
                        </button>
                      ) : (
                        <span className="shrink-0 w-12 h-12 rounded-md grid place-items-center bg-slate-100 dark:bg-slate-700 text-slate-400 text-[10px] text-center leading-tight">sin foto</span>
                      )}
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="font-medium text-slate-700 dark:text-slate-200">
                          Seña <Monto valor={p.monto} simbolo={SIMBOLO_MONEDA[r.moneda]} />
                        </div>
                        <div className="text-slate-400 dark:text-slate-500">{p.medio} · {formatearFecha(p.fecha)}</div>
                      </div>
                      {p.comprobante && (
                        <button onClick={() => setVer(p.comprobante!)} className="text-xs text-teal-600 dark:text-teal-400 hover:underline shrink-0">Ver</button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">Todavía no subió el comprobante de la seña.</p>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => { if (confirm(`¿Rechazar la reserva de ${r.huesped}? Se borrará y se liberarán las fechas.`)) deleteReserva(r.id); }}
                  className="btn-secundario flex-1"
                >
                  Rechazar
                </button>
                <button onClick={() => updateReserva(r.id, { estado: "confirmada" })} className="btn-primario flex-1">
                  Aprobar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {ver && (
        <Overlay titulo="Comprobante de seña" onCerrar={() => setVer(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ver} alt="Comprobante" className="w-full rounded-lg" />
        </Overlay>
      )}
    </div>
  );
}
