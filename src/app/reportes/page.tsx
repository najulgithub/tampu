"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { noches, sumarDias, hoyISO, sumarMeses, nombreMes, formatearFecha } from "@/lib/fechas";
import { esLargoPlazo, CATEGORIAS_GASTO, COLOR_CATEGORIA, SIMBOLO_MONEDA } from "@/lib/types";
import type { Unidad, Reserva, Pago, Gasto } from "@/lib/types";
import { generarTareas } from "@/lib/tareas";
import type { Tarea } from "@/lib/tareas";
import { Overlay } from "@/components/ui";
import TimelineGantt from "@/components/TimelineGantt";

type Tab = "economico" | "ocupacion" | "cobranzas" | "cronograma" | "timeline";
type TipoGrafico = "barras" | "dona";
type Negocio = "todos" | "temporal" | "largo";

const PALETA = ["#14b8a6", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#10b981", "#ef4444", "#64748b", "#0ea5e9", "#a855f7"];

interface Metricas {
  ingARS: number;
  ingTemp: number; // ingresos temporarios (ARS)
  ingLargo: number; // ingresos largo plazo devengados (ARS)
  ingOtros: number; // otros ingresos no-alquiler (ARS)
  ingUSD: number;
  gastos: number;
  resultado: number;
  nochesOcup: number;
  reservas: number;
  estadia: number;
  ocupacion: number; // %
}

const pesos = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

export default function Reportes() {
  const { unidades, reservas, gastos, ingresos, grupos, getGrupo, getUnidad, pagos, saldoDe, config, puedeEditar, t } = useStore();
  const puedeVerReportes = puedeEditar("reportes");
  const reservaPorId = new Map(reservas.map((r) => [r.id, r]));
  // Reservas cuya seña ya está registrada como un pago (con fecha): no imputar también el campo 'sena'.
  const reservasConSenaPago = new Set(pagos.filter((p) => p.esSena).map((p) => p.reservaId));
  const anio = new Date().getFullYear();
  const [desde, setDesde] = useState(`${anio}-01-01`);
  const [hasta, setHasta] = useState(`${anio}-12-31`);
  const [tab, setTab] = useState<Tab>("economico");
  const [vista, setVista] = useState<"grafico" | "tabla">("grafico");
  const [negocio, setNegocio] = useState<Negocio>("todos");
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>("dona");
  const [verGastos, setVerGastos] = useState(false);
  const [verMedios, setVerMedios] = useState(false);

  // Gastos por categoría dentro del período (para el detalle clickeable).
  const gastosPorCategoria = CATEGORIAS_GASTO
    .map((c) => ({
      label: c,
      valor: gastos.filter((g) => g.fecha >= desde && g.fecha <= hasta && g.categoria === c && g.pagadoPor !== "inquilino").reduce((a, g) => a + g.monto, 0),
      color: COLOR_CATEGORIA[c].hex,
    }))
    .filter((d) => d.valor > 0);

  const periodEndExcl = sumarDias(hasta, 1);
  const periodDays = Math.max(1, noches(desde, periodEndExcl));

  const nUnidades = Math.max(1, unidades.length);
  function gastosUnidad(uid: string): number {
    let acc = 0;
    for (const g of gastos) {
      if (g.fecha < desde || g.fecha > hasta) continue;
      if (g.pagadoPor === "inquilino") continue; // lo pagó el inquilino (se descuenta del alquiler), no es egreso del dueño
      if (g.ambito === "unidad" && g.refId === uid) acc += g.monto;
      else if (g.ambito === "grupo" && g.reparto) {
        const it = g.reparto.find((r) => r.unidadId === uid);
        if (it) acc += (g.monto * it.porcentaje) / 100;
      } else if (g.ambito === "general") {
        acc += g.monto / nUnidades; // gasto del negocio: se reparte en partes iguales entre todas las unidades
      }
    }
    return Math.round(acc);
  }

  // Otros ingresos (venta de muebles, etc.) imputados a la unidad (mismo prorrateo que gastos).
  function otrosIngresosUnidad(uid: string): number {
    let acc = 0;
    for (const i of ingresos) {
      if (i.fecha < desde || i.fecha > hasta) continue;
      if (i.ambito === "unidad" && i.refId === uid) acc += i.monto;
      else if (i.ambito === "grupo" && i.reparto) {
        const it = i.reparto.find((r) => r.unidadId === uid);
        if (it) acc += (i.monto * it.porcentaje) / 100;
      } else if (i.ambito === "general") {
        acc += i.monto / nUnidades;
      }
    }
    return Math.round(acc);
  }

  const incluyeTemporal = negocio === "todos" || negocio === "temporal";
  const incluyeLargo = negocio === "todos" || negocio === "largo";

  const incluyeTipo = (largo: boolean) => (largo ? incluyeLargo : incluyeTemporal);

  function metricas(uid: string): Metricas {
    const todas = reservas.filter((r) => r.unidadId === uid);
    let ingTemp = 0, ingLargo = 0, ingUSD = 0, nochesOcup = 0;

    // Ocupación: noches que caen dentro del período (según filtro de negocio).
    for (const r of todas) {
      const largo = esLargoPlazo(r.tipo);
      if (!incluyeTipo(largo)) continue;
      const ini = r.checkIn > desde ? r.checkIn : desde;
      const finExcl = r.checkOut < periodEndExcl ? r.checkOut : periodEndExcl;
      nochesOcup += Math.max(0, noches(ini, finExcl));
    }

    // Ingresos COBRADOS (caja): la seña se imputa al check-in y los pagos por su fecha.
    const sumar = (largo: boolean, moneda: string, monto: number) => {
      if (moneda === "USD") ingUSD += monto;
      else if (largo) ingLargo += monto;
      else ingTemp += monto;
    };
    for (const r of todas) {
      const largo = esLargoPlazo(r.tipo);
      if (!incluyeTipo(largo)) continue;
      if (r.sena > 0 && r.checkIn >= desde && r.checkIn <= hasta && !reservasConSenaPago.has(r.id)) sumar(largo, r.moneda, r.sena);
    }
    for (const p of pagos) {
      if (p.fecha < desde || p.fecha > hasta) continue;
      const r = reservaPorId.get(p.reservaId);
      if (!r || r.unidadId !== uid) continue;
      const largo = esLargoPlazo(r.tipo);
      if (!incluyeTipo(largo)) continue;
      sumar(largo, r.moneda, p.monto);
    }

    // Estadía promedio y cantidad: reservas con check-in en el período (según filtro).
    const rsPeriodo = todas.filter((r) => incluyeTipo(esLargoPlazo(r.tipo)) && r.checkIn >= desde && r.checkIn <= hasta);
    const totalNoches = rsPeriodo.reduce((a, r) => a + noches(r.checkIn, r.checkOut), 0);

    const otros = otrosIngresosUnidad(uid);
    const ingARS = ingTemp + ingLargo + otros;
    const gastosU = gastosUnidad(uid);
    return {
      ingARS, ingTemp, ingLargo, ingOtros: otros, ingUSD,
      gastos: gastosU, resultado: ingARS - gastosU,
      nochesOcup, reservas: rsPeriodo.length,
      estadia: rsPeriodo.length ? Math.round(totalNoches / rsPeriodo.length) : 0,
      ocupacion: (nochesOcup / periodDays) * 100,
    };
  }

  // Ingresos cobrados por medio de pago (ARS), en el período y según filtro de negocio.
  const ingresosPorMedio = (() => {
    const map = new Map<string, number>();
    for (const p of pagos) {
      if (p.fecha < desde || p.fecha > hasta) continue;
      const r = reservaPorId.get(p.reservaId);
      if (!r || r.moneda === "USD" || !incluyeTipo(esLargoPlazo(r.tipo))) continue;
      map.set(p.medio, (map.get(p.medio) ?? 0) + p.monto);
    }
    let senas = 0;
    for (const r of reservas) {
      if (r.moneda === "USD" || !incluyeTipo(esLargoPlazo(r.tipo))) continue;
      if (r.sena > 0 && r.checkIn >= desde && r.checkIn <= hasta && !reservasConSenaPago.has(r.id)) senas += r.sena;
    }
    if (senas > 0) map.set(t("Seña"), senas);
    return [...map.entries()]
      .map(([label, valor], i) => ({ label, valor, color: PALETA[i % PALETA.length] }))
      .filter((d) => d.valor > 0)
      .sort((a, b) => b.valor - a.valor);
  })();

  // Agrupamos las unidades por grupo (igual que en la pantalla de unidades).
  const porGrupo = new Map<string, Unidad[]>();
  for (const u of unidades) {
    const clave = getGrupo(u.grupoId) ? u.grupoId : "";
    if (!porGrupo.has(clave)) porGrupo.set(clave, []);
    porGrupo.get(clave)!.push(u);
  }
  const gruposOrdenados = [...porGrupo.entries()].sort((a, b) => {
    if (a[0] === "") return 1;
    if (b[0] === "") return -1;
    return (getGrupo(a[0])?.nombre ?? "").localeCompare(getGrupo(b[0])?.nombre ?? "");
  });

  if (!puedeVerReportes) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-2">{t("Reportes")}</h1>
        <div className="card p-10 text-center text-slate-500 dark:text-slate-400">
          {t("No tenés acceso a los reportes. La información económica es sensible; pedile al propietario que te habilite el permiso \"Ver reportes\".")}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">{t("Reportes")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {tab === "cobranzas"
              ? t("Lo que falta cobrar, por inquilino.")
              : tab === "cronograma"
              ? t("Previsión de cobranzas: vencimientos por fecha.")
              : tab === "timeline"
              ? t("Línea de tiempo: reservas y eventos por unidad.")
              : t("Ingresos = lo cobrado (pagos + seña), por unidad y grupo.")}
          </p>
        </div>
        {(tab === "economico" || tab === "ocupacion" || tab === "timeline") && (
          <div className="flex items-end gap-2">
            <label className="text-xs text-slate-500 dark:text-slate-400">
              {t("Desde")}
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="input mt-1" />
            </label>
            <label className="text-xs text-slate-500 dark:text-slate-400">
              {t("Hasta")}
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="input mt-1" />
            </label>
          </div>
        )}
      </div>

      {/* Tabs + toggle de vista */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5 border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-1 overflow-x-auto -mb-px">
          <TabBtn activo={tab === "economico"} onClick={() => setTab("economico")}>{t("Económico")}</TabBtn>
          <TabBtn activo={tab === "ocupacion"} onClick={() => setTab("ocupacion")}>{t("Ocupación")}</TabBtn>
          <TabBtn activo={tab === "cobranzas"} onClick={() => setTab("cobranzas")}>{t("Por cobrar")}</TabBtn>
          <TabBtn activo={tab === "cronograma"} onClick={() => setTab("cronograma")}>{t("Cronograma")}</TabBtn>
          <TabBtn activo={tab === "timeline"} onClick={() => setTab("timeline")}>{t("Timeline")}</TabBtn>
        </div>
        {(tab === "economico" || tab === "ocupacion") && (
          <div className="flex items-center gap-2 pb-2">
            {vista === "grafico" && (
              <select value={tipoGrafico} onChange={(e) => setTipoGrafico(e.target.value as TipoGrafico)} className="input py-1 text-xs w-auto">
                <option value="dona">{t("Dona")}</option>
                <option value="barras">{t("Barras")}</option>
              </select>
            )}
            <Toggle
              opciones={[{ v: "grafico", label: t("Gráfico") }, { v: "tabla", label: t("Tabla") }]}
              valor={vista}
              onCambio={(v) => setVista(v as "grafico" | "tabla")}
            />
          </div>
        )}
      </div>

      {/* Selector de tipo de negocio */}
      <div className="mb-5">
        <Toggle
          opciones={[
            { v: "todos", label: t("Todos") },
            { v: "temporal", label: t("Temporario") },
            { v: "largo", label: t("Largo plazo") },
          ]}
          valor={negocio}
          onCambio={(v) => setNegocio(v as Negocio)}
        />
      </div>

      {tab === "cobranzas" ? (
        <Cobranzas reservas={reservas} saldoDe={saldoDe} getUnidad={getUnidad} incluyeTipo={incluyeTipo} />
      ) : tab === "cronograma" ? (
        <Cronograma reservas={reservas} pagos={pagos} gastos={gastos} saldoDe={saldoDe} getUnidad={getUnidad} incluyeTipo={incluyeTipo} ajusteInflacion={config.ajusteInflacion} />
      ) : tab === "timeline" ? (
        <>
          <TimelineGantt
            unidades={gruposOrdenados.flatMap(([, items]) => items)}
            reservas={reservas.filter((r) => incluyeTipo(esLargoPlazo(r.tipo)))}
            eventos={generarTareas(reservas.filter((r) => incluyeTipo(esLargoPlazo(r.tipo))), desde, hasta, { saldoDe, ajusteInflacion: config.ajusteInflacion, pagos, gastos }).filter((tarea) => tarea.tipo === "cobro" || tarea.tipo === "ajuste")}
            desde={desde}
            hasta={hasta}
            hoy={hoyISO()}
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> {t("Cobro")}</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-500" /> {t("Ajuste")}</span>
            <span className="ml-auto">{t("Las barras son reservas (color por canal). La línea teal es hoy.")}</span>
          </div>
        </>
      ) : tab === "economico" ? (
        <>
          <ResumenNegocios unidades={unidades} metricas={metricas} negocio={negocio} tipo={vista === "grafico" ? tipoGrafico : "barras"} onGastosClick={() => setVerGastos(true)} onIngresosClick={() => setVerMedios(true)} />
          {vista === "grafico" ? (
            <GraficoEconomico gruposOrdenados={gruposOrdenados} getGrupo={getGrupo} metricas={metricas} tipo={tipoGrafico} negocio={negocio} />
          ) : (
            <TablaEconomica gruposOrdenados={gruposOrdenados} getGrupo={getGrupo} metricas={metricas} />
          )}
        </>
      ) : vista === "grafico" ? (
        <GraficoOcupacion gruposOrdenados={gruposOrdenados} getGrupo={getGrupo} metricas={metricas} tipo={tipoGrafico} periodDays={periodDays} />
      ) : (
        <TablaOcupacion gruposOrdenados={gruposOrdenados} getGrupo={getGrupo} metricas={metricas} periodDays={periodDays} />
      )}

      {verGastos && (
        <Overlay titulo={t("Gastos por tipo")} onCerrar={() => setVerGastos(false)}>
          {gastosPorCategoria.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">{t("No hay gastos en el período.")}</p>
          ) : (
            <GraficoTorta datos={gastosPorCategoria} dona />
          )}
        </Overlay>
      )}

      {verMedios && (
        <Overlay titulo={t("Ingresos por medio de pago")} onCerrar={() => setVerMedios(false)}>
          {ingresosPorMedio.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">{t("No hay cobros en el período.")}</p>
          ) : (
            <GraficoTorta datos={ingresosPorMedio} dona />
          )}
        </Overlay>
      )}
    </div>
  );
}

// ---------- Por cobrar (obligaciones de inquilinos) ----------
function Cobranzas({
  reservas,
  saldoDe,
  getUnidad,
  incluyeTipo,
}: {
  reservas: Reserva[];
  saldoDe: (r: Reserva) => number;
  getUnidad: (id: string) => Unidad | undefined;
  incluyeTipo: (largo: boolean) => boolean;
}) {
  const { t } = useStore();
  const items = reservas
    .filter((r) => incluyeTipo(esLargoPlazo(r.tipo)) && saldoDe(r) > 0)
    .map((r) => ({ r, saldo: saldoDe(r) }))
    .sort((a, b) => b.saldo - a.saldo);

  const totalARS = items.filter((i) => i.r.moneda !== "USD").reduce((a, i) => a + i.saldo, 0);
  const totalUSD = items.filter((i) => i.r.moneda === "USD").reduce((a, i) => a + i.saldo, 0);

  if (items.length === 0) {
    return (
      <div className="card p-10 text-center text-slate-500 dark:text-slate-400">
        {t("Nadie debe nada. Todo cobrado")} 🎉
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="card p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t("Por cobrar (pesos)")}</div>
          <div className="text-xl sm:text-2xl font-semibold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">{pesos(totalARS)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t("Por cobrar (dólares)")}</div>
          <div className="text-xl sm:text-2xl font-semibold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">US${Math.round(totalUSD).toLocaleString("es-AR")}</div>
        </div>
      </div>

      <div className="space-y-2">
        {items.map(({ r, saldo }) => {
          const simbolo = SIMBOLO_MONEDA[r.moneda];
          const pagado = r.montoTotal - saldo;
          return (
            <div key={r.id} className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{r.huesped}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {getUnidad(r.unidadId)?.nombre ?? "—"} · {t("pagó")} {simbolo}{Math.round(pagado).toLocaleString("es-AR")} {t("de")} {simbolo}{r.montoTotal.toLocaleString("es-AR")}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold text-amber-600 dark:text-amber-400 tabular-nums">{simbolo}{saldo.toLocaleString("es-AR")}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500">{t("debe")}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Cronograma de cobranzas (previsión de vencimientos) ----------
function Cronograma({
  reservas,
  pagos,
  gastos,
  saldoDe,
  getUnidad,
  incluyeTipo,
  ajusteInflacion,
}: {
  reservas: Reserva[];
  pagos: Pago[];
  gastos: Gasto[];
  saldoDe: (r: Reserva) => number;
  getUnidad: (id: string) => Unidad | undefined;
  incluyeTipo: (largo: boolean) => boolean;
  ajusteInflacion: boolean;
}) {
  const { t } = useStore();
  const [meses, setMeses] = useState(6);
  const hoy = hoyISO();
  const inicio = hoy.slice(0, 7) + "-01"; // desde el inicio del mes actual
  const finExcl = sumarMeses(inicio, meses);

  const rs = reservas.filter((r) => incluyeTipo(esLargoPlazo(r.tipo)));
  const tareas = generarTareas(rs, inicio, sumarDias(finExcl, -1), { saldoDe, ajusteInflacion, pagos, gastos })
    .filter((tarea) => tarea.tipo === "cobro");

  // Monto a cobrar de cada tarea: el alquiler mensual (largo) o el saldo (temporal).
  const montoDe = (tarea: Tarea) => (tarea.reserva.montoMensual > 0 ? tarea.reserva.montoMensual : saldoDe(tarea.reserva));

  // Agrupar por mes (preservando el orden cronológico).
  const porMes = new Map<string, Tarea[]>();
  for (const tarea of tareas) {
    const k = tarea.fecha.slice(0, 7);
    (porMes.get(k) ?? porMes.set(k, []).get(k)!).push(tarea);
  }

  const totalARS = tareas.filter((tarea) => tarea.reserva.moneda !== "USD").reduce((a, tarea) => a + montoDe(tarea), 0);
  const totalUSD = tareas.filter((tarea) => tarea.reserva.moneda === "USD").reduce((a, tarea) => a + montoDe(tarea), 0);
  const vencidoARS = tareas.filter((tarea) => tarea.fecha < hoy && tarea.reserva.moneda !== "USD").reduce((a, tarea) => a + montoDe(tarea), 0);

  const etiquetaMes = (k: string) => {
    const [y, m] = k.split("-").map(Number);
    return `${nombreMes(m - 1)} ${y}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {t("Previsión sobre lo pactado (devengado). El alquiler mensual aparece en cada vencimiento; el temporario, según el saldo a cobrar.")}
        </p>
        <Toggle
          opciones={[{ v: "3", label: t("3 m") }, { v: "6", label: t("6 m") }, { v: "12", label: t("12 m") }]}
          valor={String(meses)}
          onCambio={(v) => setMeses(Number(v))}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="card p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t("A cobrar")} ({meses} {t("meses")})</div>
          <div className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100 mt-1 tabular-nums">{pesos(totalARS)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">{t("Vencido a hoy")}</div>
          <div className={`text-xl sm:text-2xl font-semibold mt-1 tabular-nums ${vencidoARS > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>{pesos(vencidoARS)}</div>
        </div>
        {totalUSD > 0 && (
          <div className="card p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">{t("A cobrar (dólares)")}</div>
            <div className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100 mt-1 tabular-nums">US${Math.round(totalUSD).toLocaleString("es-AR")}</div>
          </div>
        )}
      </div>

      {tareas.length === 0 ? (
        <div className="card p-10 text-center text-slate-500 dark:text-slate-400">
          {t("No hay vencimientos en los próximos")} {meses} {t("meses")}.
        </div>
      ) : (
        <div className="space-y-5">
          {[...porMes.entries()].map(([mesK, items]) => {
            const subARS = items.filter((tarea) => tarea.reserva.moneda !== "USD").reduce((a, tarea) => a + montoDe(tarea), 0);
            return (
              <div key={mesK}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 capitalize">{etiquetaMes(mesK)}</h3>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300 tabular-nums">{pesos(subARS)}</span>
                </div>
                <div className="space-y-2">
                  {items.map((tarea, i) => {
                    const r = tarea.reserva;
                    const sim = SIMBOLO_MONEDA[r.moneda];
                    const vencido = tarea.fecha < hoy;
                    return (
                      <div key={`${r.id}-${i}`} className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-3">
                        <div className="shrink-0 w-12 text-center">
                          <div className={`text-lg font-semibold tabular-nums leading-none ${vencido ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-200"}`}>{Number(tarea.fecha.slice(8, 10))}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">{nombreMes(Number(tarea.fecha.slice(5, 7)) - 1).slice(0, 3)}</div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{r.huesped}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {getUnidad(r.unidadId)?.nombre ?? "—"}
                            {vencido && <span className="text-rose-500 dark:text-rose-400"> · {t("vencido")}</span>}
                          </div>
                        </div>
                        <div className="shrink-0 text-right text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                          {sim}{Math.round(montoDe(tarea)).toLocaleString("es-AR")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Toggle({
  opciones,
  valor,
  onCambio,
}: {
  opciones: { v: string; label: string }[];
  valor: string;
  onCambio: (v: string) => void;
}) {
  return (
    <div className="flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden text-xs">
      {opciones.map((o) => (
        <button
          key={o.v}
          onClick={() => onCambio(o.v)}
          className={valor === o.v
            ? "px-3 py-1.5 bg-teal-600 text-white"
            : "px-3 py-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Barra horizontal reutilizable.
function BarraH({
  label,
  sub,
  pct,
  valorTexto,
  tono,
}: {
  label: string;
  sub?: string;
  pct: number;
  valorTexto: string;
  tono: string;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-36 shrink-0 truncate text-sm text-slate-700 dark:text-slate-200">
        {label}
        {sub && <span className="text-xs text-slate-400 dark:text-slate-500"> · {sub}</span>}
      </div>
      <div className="flex-1 h-6 rounded-full bg-slate-100 dark:bg-slate-700/40 overflow-hidden">
        <div
          className={`h-6 rounded-full ${tono} shadow-sm transition-[width] duration-700 ease-out`}
          style={{ width: `${Math.max(1.5, Math.min(100, pct))}%` }}
        />
      </div>
      <div className="w-28 shrink-0 text-right text-sm font-medium text-slate-700 dark:text-slate-200 tabular-nums">
        {valorTexto}
      </div>
    </div>
  );
}

function TabBtn({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        activo
          ? "px-4 py-2 text-sm font-medium whitespace-nowrap shrink-0 text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400 -mb-px"
          : "px-4 py-2 text-sm whitespace-nowrap shrink-0 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
      }
    >
      {children}
    </button>
  );
}

// ---------- Resumen por unidad de negocio ----------
function ResumenNegocios({ unidades, metricas, negocio, tipo, onGastosClick, onIngresosClick }: { unidades: Unidad[]; metricas: (uid: string) => Metricas; negocio: Negocio; tipo: TipoGrafico; onGastosClick: () => void; onIngresosClick: () => void }) {
  const { t } = useStore();
  let temp = 0, largo = 0, otros = 0, gastos = 0;
  for (const u of unidades) {
    const m = metricas(u.id);
    temp += m.ingTemp;
    largo += m.ingLargo;
    otros += m.ingOtros;
    gastos += m.gastos;
  }
  const totalIng = temp + largo + otros;

  if (negocio === "todos") {
    const maxIng = Math.max(temp, largo, otros, 1);
    const datosTipo = [
      { label: t("Temporario"), valor: temp, color: "#14b8a6" },
      { label: t("Largo plazo"), valor: largo, color: "#8b5cf6" },
      ...(otros > 0 ? [{ label: t("Otros ingresos"), valor: otros, color: "#f59e0b" }] : []),
    ];
    return (
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Tarjeta titulo={t("Ingresos")} valor={pesos(totalIng)} sub={t("ver por medio →")} onClick={onIngresosClick} />
          <Tarjeta titulo={t("Gastos")} valor={pesos(gastos)} sub={t("ver por tipo →")} tono="amber" onClick={onGastosClick} />
          <Tarjeta titulo={t("Resultado")} valor={pesos(totalIng - gastos)} sub={t("ingresos − gastos")} tono={totalIng - gastos >= 0 ? "emerald" : "rose"} />
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">{t("Ingresos por tipo")}</h3>
          {tipo === "dona" ? (
            <GraficoTorta dona datos={datosTipo} />
          ) : (
            <>
              <BarraH label={t("Temporario")} pct={(temp / maxIng) * 100} valorTexto={pesos(temp)} tono="bg-teal-500" />
              <BarraH label={t("Largo plazo")} pct={(largo / maxIng) * 100} valorTexto={pesos(largo)} tono="bg-violet-500" />
              {otros > 0 && <BarraH label={t("Otros ingresos")} pct={(otros / maxIng) * 100} valorTexto={pesos(otros)} tono="bg-amber-500" />}
            </>
          )}
        </div>
      </div>
    );
  }

  // Filtrado a un solo negocio.
  const ing = negocio === "temporal" ? temp : largo;
  const titulo = negocio === "temporal" ? t("Ingresos temporario") : t("Ingresos largo plazo");
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <Tarjeta titulo={titulo} valor={pesos(ing)} sub={t("ver por medio →")} onClick={onIngresosClick} />
      <Tarjeta titulo={t("Gastos")} valor={pesos(gastos)} sub={t("ver por tipo →")} tono="amber" onClick={onGastosClick} />
    </div>
  );
}

function Tarjeta({ titulo, valor, sub, tono, onClick }: { titulo: string; valor: string; sub: string; tono?: "amber" | "emerald" | "rose"; onClick?: () => void }) {
  const color = tono === "amber" ? "text-amber-600 dark:text-amber-400"
    : tono === "emerald" ? "text-emerald-600 dark:text-emerald-400"
    : tono === "rose" ? "text-rose-600 dark:text-rose-400"
    : "text-slate-800 dark:text-slate-100";
  const clases = `bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-4 text-left w-full ${onClick ? "hover:border-teal-400 dark:hover:border-teal-500 transition cursor-pointer" : ""}`;
  const contenido = (
    <>
      <div className="text-xs text-slate-500 dark:text-slate-400">{titulo}</div>
      <div className={`text-xl font-semibold mt-1 ${color}`}>{valor}</div>
      <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</div>
    </>
  );
  return onClick ? (
    <button onClick={onClick} className={clases}>{contenido}</button>
  ) : (
    <div className={clases}>{contenido}</div>
  );
}

// ---------- Torta / Dona (SVG) ----------
function GraficoTorta({
  datos,
  dona,
  formato = "moneda",
}: {
  datos: { label: string; valor: number; color?: string }[];
  dona: boolean;
  formato?: "moneda" | "numero";
}) {
  const { t } = useStore();
  const total = datos.reduce((a, d) => a + d.valor, 0);
  const r = dona ? 46 : 30;
  const sw = dona ? 26 : 60;
  const C = 2 * Math.PI * r;
  const fmt = (n: number) => (formato === "numero" ? Math.round(n).toLocaleString("es-AR") : pesos(n));
  let acumulado = 0;

  if (total <= 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500">{t("Sin datos para graficar.")}</p>;
  }

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="relative shrink-0">
        <svg viewBox="0 0 120 120" className="w-44 h-44">
          {/* anillo de fondo */}
          <circle cx="60" cy="60" r={r} fill="none" strokeWidth={sw} className="stroke-slate-100 dark:stroke-slate-700/40" />
          <g transform="rotate(-90 60 60)">
            {datos.map((d, i) => {
              if (d.valor <= 0) return null;
              const seg = (d.valor / total) * C;
              const el = (
                <circle
                  key={i}
                  cx="60" cy="60" r={r}
                  fill="none"
                  stroke={d.color ?? PALETA[i % PALETA.length]}
                  strokeWidth={sw}
                  strokeDasharray={`${seg} ${C - seg}`}
                  strokeDashoffset={-acumulado}
                />
              );
              acumulado += seg;
              return el;
            })}
          </g>
        </svg>
        {dona && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="text-center">
              <div className="text-base font-semibold text-slate-800 dark:text-slate-100 tabular-nums leading-none">{fmt(total)}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">{t("total")}</div>
            </div>
          </div>
        )}
      </div>
      <div className="space-y-2 min-w-[200px] flex-1">
        {datos.map((d, i) => (
          <div key={i} className="flex items-center gap-2.5 text-sm">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: d.color ?? PALETA[i % PALETA.length] }} />
            <span className="text-slate-600 dark:text-slate-300 flex-1 truncate">{d.label}</span>
            <span className="text-slate-700 dark:text-slate-200 font-medium tabular-nums">{fmt(d.valor)}</span>
            <span className="w-10 text-right text-xs text-slate-400 dark:text-slate-500 tabular-nums">{((d.valor / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Gráfico económico ----------
function GraficoEconomico({
  gruposOrdenados,
  getGrupo,
  metricas,
  tipo,
  negocio,
}: {
  gruposOrdenados: [string, Unidad[]][];
  getGrupo: (id: string) => { nombre: string } | undefined;
  metricas: (uid: string) => Metricas;
  tipo: TipoGrafico;
  negocio: Negocio;
}) {
  const { t } = useStore();
  const Card = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-5 mb-4">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">{titulo}</h3>
      {children}
    </div>
  );

  if (tipo === "dona") {
    // Dona: proporción de INGRESOS (no admiten negativos).
    const porGrupo = gruposOrdenados.map(([grupoId, items]) => ({
      label: getGrupo(grupoId)?.nombre ?? t("Sin grupo"),
      valor: items.reduce((a, u) => a + metricas(u.id).ingARS, 0),
    }));
    const porUnidad = gruposOrdenados.flatMap(([, items]) =>
      items.map((u) => ({ label: u.nombre, valor: metricas(u.id).ingARS }))
    );
    // Nivel intermedio: desglose de las unidades dentro de cada grupo (solo si tiene más de una).
    const gruposConVarias = gruposOrdenados.filter(([, items]) => items.length > 1);
    return (
      <>
        <Card titulo={t("Ingresos por grupo")}><GraficoTorta datos={porGrupo} dona /></Card>
        {gruposConVarias.length > 0 && (
          <Card titulo={t("Ingresos por unidad dentro de cada grupo")}>
            <div className="space-y-5">
              {gruposConVarias.map(([grupoId, items]) => (
                <div key={grupoId}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
                    {getGrupo(grupoId)?.nombre ?? t("Sin grupo")}
                  </div>
                  <GraficoTorta datos={items.map((u) => ({ label: u.nombre, valor: metricas(u.id).ingARS }))} dona />
                </div>
              ))}
            </div>
          </Card>
        )}
        <Card titulo={t("Ingresos por unidad")}><GraficoTorta datos={porUnidad} dona /></Card>
      </>
    );
  }

  // Barras: resultado (con signo) cuando es "Todos"; ingresos cuando hay un negocio filtrado
  // (el resultado por negocio no se puede separar porque los gastos son compartidos).
  const usarResultado = negocio === "todos";
  const valorDe = (m: Metricas) => (usarResultado ? m.resultado : m.ingARS);
  const titGrupo = usarResultado ? t("Resultado por grupo") : t("Ingresos por grupo");
  const titUnidad = usarResultado ? t("Resultado por unidad") : t("Ingresos por unidad");

  const porGrupo = gruposOrdenados.map(([grupoId, items]) => ({
    label: getGrupo(grupoId)?.nombre ?? t("Sin grupo"),
    valor: items.reduce((a, u) => a + valorDe(metricas(u.id)), 0),
  }));
  const maxGrupo = Math.max(1, ...porGrupo.map((g) => Math.abs(g.valor)));
  const maxUnidad = Math.max(1, ...gruposOrdenados.flatMap(([, items]) => items.map((u) => Math.abs(valorDe(metricas(u.id))))));

  return (
    <>
      <Card titulo={titGrupo}>
        {porGrupo.map((g) => (
          <BarraH key={g.label} label={g.label} pct={(Math.abs(g.valor) / maxGrupo) * 100} valorTexto={pesos(g.valor)} tono={g.valor >= 0 ? "bg-emerald-500" : "bg-rose-500"} />
        ))}
      </Card>
      <Card titulo={titUnidad}>
        {gruposOrdenados.map(([grupoId, items]) => (
          <div key={grupoId || "sin"} className="mb-4 last:mb-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
              {getGrupo(grupoId)?.nombre ?? t("Sin grupo")}
            </div>
            {items.map((u) => {
              const valor = valorDe(metricas(u.id));
              return (
                <BarraH key={u.id} label={u.nombre} pct={(Math.abs(valor) / maxUnidad) * 100} valorTexto={pesos(valor)} tono={valor >= 0 ? "bg-emerald-500" : "bg-rose-500"} />
              );
            })}
          </div>
        ))}
      </Card>
    </>
  );
}

// ---------- Gráfico de ocupación ----------
function GraficoOcupacion({
  gruposOrdenados,
  getGrupo,
  metricas,
  tipo,
  periodDays,
}: {
  gruposOrdenados: [string, Unidad[]][];
  getGrupo: (id: string) => { nombre: string } | undefined;
  metricas: (uid: string) => Metricas;
  tipo: TipoGrafico;
  periodDays: number;
}) {
  const { t } = useStore();
  const Card = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-5 mb-4">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">{titulo}</h3>
      {children}
    </div>
  );

  if (tipo === "dona") {
    // Reparto de las noches ocupadas, mismo drill-down que el económico.
    const porGrupo = gruposOrdenados.map(([grupoId, items]) => ({
      label: getGrupo(grupoId)?.nombre ?? t("Sin grupo"),
      valor: items.reduce((a, u) => a + metricas(u.id).nochesOcup, 0),
    }));
    const porUnidad = gruposOrdenados.flatMap(([, items]) =>
      items.map((u) => ({ label: u.nombre, valor: metricas(u.id).nochesOcup }))
    );
    const gruposConVarias = gruposOrdenados.filter(([, items]) => items.length > 1);
    return (
      <>
        <Card titulo={t("Noches ocupadas por grupo")}><GraficoTorta datos={porGrupo} dona formato="numero" /></Card>
        {gruposConVarias.length > 0 && (
          <Card titulo={t("Noches por unidad dentro de cada grupo")}>
            <div className="space-y-5">
              {gruposConVarias.map(([grupoId, items]) => (
                <div key={grupoId}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
                    {getGrupo(grupoId)?.nombre ?? t("Sin grupo")}
                  </div>
                  <GraficoTorta datos={items.map((u) => ({ label: u.nombre, valor: metricas(u.id).nochesOcup }))} dona formato="numero" />
                </div>
              ))}
            </div>
          </Card>
        )}
        <Card titulo={t("Noches ocupadas por unidad")}><GraficoTorta datos={porUnidad} dona formato="numero" /></Card>
      </>
    );
  }

  const tono = (pct: number) => (pct >= 55 ? "bg-emerald-500" : pct >= 20 ? "bg-amber-500" : "bg-rose-500");
  const porGrupoPct = gruposOrdenados.map(([grupoId, items]) => {
    const gNoches = items.reduce((a, u) => a + metricas(u.id).nochesOcup, 0);
    return {
      label: getGrupo(grupoId)?.nombre ?? t("Sin grupo"),
      pct: (gNoches / (periodDays * Math.max(1, items.length))) * 100,
    };
  });

  return (
    <>
      <Card titulo={t("Ocupación por grupo")}>
        {porGrupoPct.map((g) => (
          <BarraH key={g.label} label={g.label} pct={g.pct} valorTexto={`${g.pct.toFixed(0)}%`} tono={tono(g.pct)} />
        ))}
      </Card>
      <Card titulo={t("Ocupación por unidad")}>
        {gruposOrdenados.map(([grupoId, items]) => (
          <div key={grupoId || "sin"} className="mb-4 last:mb-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
              {getGrupo(grupoId)?.nombre ?? t("Sin grupo")}
            </div>
            {items.map((u) => {
              const m = metricas(u.id);
              return (
                <BarraH key={u.id} label={u.nombre} sub={`${m.estadia} ${t("n prom")}`} pct={m.ocupacion} valorTexto={`${m.ocupacion.toFixed(0)}%`} tono={tono(m.ocupacion)} />
              );
            })}
          </div>
        ))}
      </Card>
    </>
  );
}

// ---------- Reporte económico ----------
function TablaEconomica({
  gruposOrdenados,
  getGrupo,
  metricas,
}: {
  gruposOrdenados: [string, Unidad[]][];
  getGrupo: (id: string) => { nombre: string } | undefined;
  metricas: (uid: string) => Metricas;
}) {
  const { t } = useStore();
  let totIng = 0, totGastos = 0, totRes = 0, totUSD = 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
            <th className="py-2 font-medium">{t("Unidad")}</th>
            <th className="py-2 font-medium text-right">{t("Ingresos")}</th>
            <th className="py-2 font-medium text-right">{t("Gastos")}</th>
            <th className="py-2 font-medium text-right">{t("Resultado")}</th>
          </tr>
        </thead>
        {gruposOrdenados.map(([grupoId, items]) => {
          let gIng = 0, gGastos = 0, gRes = 0, gUSD = 0;
          const filas = items.map((u) => {
            const m = metricas(u.id);
            gIng += m.ingARS; gGastos += m.gastos; gRes += m.resultado; gUSD += m.ingUSD;
            return { u, m };
          });
          totIng += gIng; totGastos += gGastos; totRes += gRes; totUSD += gUSD;
          return (
            <tbody key={grupoId || "sin"}>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td colSpan={4} className="pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {getGrupo(grupoId)?.nombre ?? t("Sin grupo")}
                </td>
              </tr>
              {filas.map(({ u, m }) => (
                <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 text-slate-700 dark:text-slate-200">
                    {u.nombre}
                    {m.ingUSD > 0 && <span className="text-xs text-slate-400 dark:text-slate-500"> · US${m.ingUSD.toLocaleString("es-AR")}</span>}
                  </td>
                  <td className="py-2 text-right text-slate-600 dark:text-slate-300">{pesos(m.ingARS)}</td>
                  <td className="py-2 text-right text-amber-600 dark:text-amber-400">{pesos(m.gastos)}</td>
                  <td className={`py-2 text-right font-medium ${m.resultado >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {pesos(m.resultado)}
                  </td>
                </tr>
              ))}
              <tr className="border-b border-slate-200 dark:border-slate-700 text-xs">
                <td className="py-1.5 text-slate-400 dark:text-slate-500">{t("Subtotal")} {getGrupo(grupoId)?.nombre ?? t("Sin grupo")}</td>
                <td className="py-1.5 text-right text-slate-500 dark:text-slate-400">{pesos(gIng)}</td>
                <td className="py-1.5 text-right text-slate-500 dark:text-slate-400">{pesos(gGastos)}</td>
                <td className="py-1.5 text-right text-slate-500 dark:text-slate-400">{pesos(gRes)}</td>
              </tr>
            </tbody>
          );
        })}
        <tfoot>
          <tr className="font-semibold text-slate-800 dark:text-slate-100">
            <td className="py-3">{t("Total")}</td>
            <td className="py-3 text-right">{pesos(totIng)}</td>
            <td className="py-3 text-right text-amber-600 dark:text-amber-400">{pesos(totGastos)}</td>
            <td className={`py-3 text-right ${totRes >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{pesos(totRes)}</td>
          </tr>
        </tfoot>
      </table>
      {totUSD > 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
          {t("Ingresos en dólares (no incluidos en el resultado en pesos):")} <b>US${totUSD.toLocaleString("es-AR")}</b>.
        </p>
      )}
    </div>
  );
}

// ---------- Reporte de ocupación ----------
function TablaOcupacion({
  gruposOrdenados,
  getGrupo,
  metricas,
  periodDays,
}: {
  gruposOrdenados: [string, Unidad[]][];
  getGrupo: (id: string) => { nombre: string } | undefined;
  metricas: (uid: string) => Metricas;
  periodDays: number;
}) {
  const { t } = useStore();
  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">{t("Período de")} {periodDays} {t("noches")}.</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
            <th className="py-2 font-medium">{t("Unidad")}</th>
            <th className="py-2 font-medium text-right">{t("Ocupación")}</th>
            <th className="py-2 font-medium text-right">{t("Noches")}</th>
            <th className="py-2 font-medium text-right">{t("Reservas")}</th>
            <th className="py-2 font-medium text-right">{t("Estadía prom.")}</th>
          </tr>
        </thead>
        {gruposOrdenados.map(([grupoId, items]) => {
          let gNoches = 0, gReservas = 0, gTotalEstadia = 0;
          const filas = items.map((u) => {
            const m = metricas(u.id);
            gNoches += m.nochesOcup; gReservas += m.reservas; gTotalEstadia += m.estadia * m.reservas;
            return { u, m };
          });
          const gOcup = (gNoches / (periodDays * Math.max(1, items.length))) * 100;
          const gEstadia = gReservas ? Math.round(gTotalEstadia / gReservas) : 0;
          return (
            <tbody key={grupoId || "sin"}>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td colSpan={5} className="pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {getGrupo(grupoId)?.nombre ?? t("Sin grupo")}
                </td>
              </tr>
              {filas.map(({ u, m }) => (
                <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 text-slate-700 dark:text-slate-200">{u.nombre}</td>
                  <td className="py-2 text-right text-slate-600 dark:text-slate-300">{m.ocupacion.toFixed(0)}%</td>
                  <td className="py-2 text-right text-slate-600 dark:text-slate-300">{m.nochesOcup}</td>
                  <td className="py-2 text-right text-slate-600 dark:text-slate-300">{m.reservas}</td>
                  <td className="py-2 text-right text-slate-600 dark:text-slate-300">{m.estadia} {m.estadia === 1 ? t("noche") : t("noches")}</td>
                </tr>
              ))}
              <tr className="border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                <td className="py-1.5">{t("Subtotal")} {getGrupo(grupoId)?.nombre ?? t("Sin grupo")}</td>
                <td className="py-1.5 text-right">{gOcup.toFixed(0)}%</td>
                <td className="py-1.5 text-right">{gNoches}</td>
                <td className="py-1.5 text-right">{gReservas}</td>
                <td className="py-1.5 text-right">{gEstadia} {t("noches")}</td>
              </tr>
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
