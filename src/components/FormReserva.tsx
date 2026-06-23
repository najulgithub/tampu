"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { CANALES, TIPOS_ALQUILER, TIPOS_ACTUALIZACION, MONEDAS, SIMBOLO_MONEDA, INDICES_AJUSTE, esLargoPlazo, SERVICIOS_DEFAULT } from "@/lib/types";
import type { Canal, Reserva, TipoAlquiler, TipoActualizacion, Moneda, IndiceAjuste, ServicioComprobante, ComisionPersonal, ModoComision } from "@/lib/types";
import { noches, formatearFecha, hoyISO, nombreMes } from "@/lib/fechas";
import { mesesContrato, vencimientosMensuales } from "@/lib/ajustes";
import { cuentaCorriente } from "@/lib/cuentaCorriente";
import type { Cuota, EstadoCuota } from "@/lib/cuentaCorriente";
import { subirArchivo } from "@/lib/storage";
import { Overlay, Campo } from "@/components/ui";
import InputMonto from "@/components/InputMonto";
import SelectMedio from "@/components/SelectMedio";

export default function FormReserva({
  unidadId,
  reserva,
  fechaInicial,
  checkOutInicial,
  canalInicial,
  sobreBloqueo = false,
  onCerrar,
}: {
  unidadId: string;
  reserva?: Reserva; // si viene, es edición
  fechaInicial?: string;
  checkOutInicial?: string; // prefill de check-out (convertir un bloqueo importado)
  canalInicial?: Canal;     // prefill de canal (Airbnb/Booking…)
  sobreBloqueo?: boolean;   // permite superponerse con el bloqueo que se está convirtiendo
  onCerrar: () => void;
}) {
  const { addReserva, updateReserva, deleteReserva, conflicto, pagosDe, config, puedeEditar, getUnidad, gastos, addGasto, updateGasto, deleteGasto, dolarOficial, personal } = useStore();
  const unidad = getUnidad(unidadId);
  const esEdicion = Boolean(reserva);
  const puedeEdit = puedeEditar("reservas");

  const [huesped, setHuesped] = useState(reserva?.huesped ?? "");
  const [contacto, setContacto] = useState(reserva?.contacto ?? "");
  const [checkIn, setCheckIn] = useState(reserva?.checkIn ?? fechaInicial ?? "");
  const [checkOut, setCheckOut] = useState(reserva?.checkOut ?? checkOutInicial ?? "");
  const [montoTotal, setMontoTotal] = useState(reserva?.montoTotal ?? 0);
  const [montoMensual, setMontoMensual] = useState(reserva?.montoMensual ?? 0);
  const [conCochera, setConCochera] = useState(reserva?.conCochera ?? false);
  const [comision, setComision] = useState(reserva?.comision ?? 0);
  const [sena, setSena] = useState(reserva?.sena ?? 0);
  const [canal, setCanal] = useState<Canal>(reserva?.canal ?? canalInicial ?? "Directo");
  const [tipo, setTipo] = useState<TipoAlquiler>(reserva?.tipo ?? "temporal");
  const [moneda, setMoneda] = useState<Moneda>(reserva?.moneda ?? unidad?.moneda ?? config.monedaDefault);
  const [actualizacion, setActualizacion] = useState<TipoActualizacion>(reserva?.actualizacion ?? "Sin actualización");
  const [indice, setIndice] = useState<IndiceAjuste>(reserva?.indice ?? "ICL");
  const [porcentajeManual, setPorcentajeManual] = useState(reserva?.porcentajeManual ?? 0);
  const [horaCheckIn, setHoraCheckIn] = useState(reserva?.horaCheckIn ?? "15:00");
  const [horaCheckOut, setHoraCheckOut] = useState(reserva?.horaCheckOut ?? "11:00");
  const [vencimiento, setVencimiento] = useState(reserva?.vencimiento ?? "");
  const [diaVencimiento, setDiaVencimiento] = useState<number | "">(reserva?.diaVencimiento ?? config.diaVencimiento ?? "");
  const [serviciosInquilino, setServiciosInquilino] = useState<string[]>(reserva?.serviciosInquilino ?? []);
  const [emailInquilino, setEmailInquilino] = useState(reserva?.emailInquilino ?? "");
  const [nuevoServicio, setNuevoServicio] = useState("");
  const [notas, setNotas] = useState(reserva?.notas ?? "");
  const [comisiones, setComisiones] = useState<ComisionPersonal[]>(reserva?.comisiones ?? []);

  const toggleServicio = (s: string) =>
    setServiciosInquilino((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const simbolo = SIMBOLO_MONEDA[moneda];
  const esLargo = tipo !== "temporal";
  // Canales con comisión (plataformas OTA).
  const esOTA = canal === "Booking" || canal === "Airbnb" || canal === "Vrbo";

  const fechasOk = checkIn && checkOut && checkIn < checkOut;
  // Al convertir un bloqueo o al editar una reserva existente, ignoramos los bloqueos
  // importados (el bloqueo "gemelo" de Airbnb/Booking no es un conflicto real).
  const choque = fechasOk ? conflicto(unidadId, checkIn, checkOut, reserva?.id, sobreBloqueo || esEdicion) : null;
  const valido = huesped.trim() && fechasOk && !choque;
  const cantNoches = fechasOk ? noches(checkIn, checkOut) : 0;
  // Para largo plazo, el total del contrato se deriva del mensual × meses.
  const cantMeses = fechasOk ? mesesContrato(checkIn, checkOut) : 0;
  const totalContrato = montoMensual * cantMeses;

  // Tarifa por día: si la unidad la tiene cargada, el total temporal se calcula solo
  // (noches × tarifa, con o sin cochera). Si no, se usa el monto total manual.
  const tieneCocheraTarifa = !!(unidad?.cochera && (unidad.precioDiaCochera ?? 0) > 0 && unidad.precioDiaCochera !== unidad.precioDia);
  const tarifaDia = (conCochera && tieneCocheraTarifa ? unidad!.precioDiaCochera! : unidad?.precioDia) ?? 0;
  const usaTarifaDia = !esLargo && tarifaDia > 0;
  const totalPorDia = usaTarifaDia ? cantNoches * tarifaDia : 0;

  const totalEfectivo = esLargo ? totalContrato : usaTarifaDia ? totalPorDia : montoTotal;
  const totalPagos = reserva ? pagosDe(reserva.id).reduce((a, p) => a + p.monto, 0) : 0;
  const saldo = Math.max(0, totalEfectivo - sena - totalPagos);

  // ----- Comisiones a Personal -----
  const personalActivo = personal.filter((p) => p.activo);
  // Neto sobre el que se calculan los %: alquiler − comisión de plataforma. En la moneda de la reserva.
  const netoComision = Math.max(0, totalEfectivo - (esOTA ? comision : 0));
  // Monto de una línea de comisión, en la moneda de la reserva (para % ) — para mostrar.
  function montoComisionMoneda(c: ComisionPersonal): number {
    if (c.modo === "fijo") return c.valor || 0; // ya en pesos
    return Math.round((netoComision * (c.valor || 0)) / 100 * 100) / 100;
  }
  // Monto de una línea, ya convertido a pesos (lo que se guarda como gasto).
  function montoComisionPesos(c: ComisionPersonal): number {
    if (c.modo === "fijo") return Math.round(c.valor || 0);
    const enMoneda = (netoComision * (c.valor || 0)) / 100;
    return moneda === "USD" ? Math.round(enMoneda * (c.tc || dolarOficial || 0)) : Math.round(enMoneda);
  }
  function agregarComision() {
    setComisiones((prev) => [...prev, { personalId: "", modo: "porcentaje", valor: 0, tc: moneda === "USD" ? (dolarOficial ?? undefined) : undefined }]);
  }
  function quitarComision(i: number) {
    setComisiones((prev) => prev.filter((_, idx) => idx !== i));
  }
  function setLineaComision(i: number, cambios: Partial<ComisionPersonal>) {
    setComisiones((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...cambios } : c)));
  }
  // Al elegir persona, toma sus valores por defecto (modo + valor).
  function elegirPersona(i: number, personalId: string) {
    const p = personal.find((x) => x.id === personalId);
    setLineaComision(i, p ? { personalId, modo: p.modo, valor: p.valor } : { personalId: "" });
  }

  function guardar() {
    if (!valido) return;
    const datos = {
      unidadId,
      huesped: huesped.trim(),
      contacto: contacto.trim(),
      checkIn,
      checkOut,
      montoTotal: esLargo ? totalContrato : usaTarifaDia ? totalPorDia : montoTotal,
      montoMensual: esLargo ? montoMensual : 0,
      conCochera: !esLargo ? conCochera : false,
      sena,
      canal,
      tipo,
      moneda,
      actualizacion,
      indice,
      porcentajeManual,
      horaCheckIn,
      horaCheckOut,
      vencimiento: !esLargo ? (vencimiento || undefined) : undefined,
      diaVencimiento: esLargo ? (diaVencimiento ? Number(diaVencimiento) : undefined) : undefined,
      serviciosInquilino: esLargo ? serviciosInquilino : [],
      emailInquilino: esLargo ? (emailInquilino.trim() || undefined) : undefined,
      comision: esOTA ? comision : undefined,
      comisiones: comisiones.filter((c) => c.personalId),
      notas: notas.trim(),
    };
    const reservaId = esEdicion && reserva ? (updateReserva(reserva.id, datos), reserva.id) : addReserva(datos);
    sincronizarComision(reservaId);
    sincronizarComisionesPersonal(reservaId);
    onCerrar();
  }

  // Mantiene en sync los gastos "Comisión {rol} — {nombre}" de cada línea (sin tope).
  function sincronizarComisionesPersonal(reservaId: string) {
    const lineas = comisiones.filter((c) => c.personalId);
    const clavesUsadas = new Set<string>();
    lineas.forEach((c, i) => {
      const clave = `personal|${reservaId}|${i}`;
      const existente = gastos.find((g) => g.claveOrigen === clave);
      const persona = personal.find((p) => p.id === c.personalId);
      const montoPesos = persona ? montoComisionPesos(c) : 0;
      if (persona && montoPesos > 0) {
        clavesUsadas.add(clave);
        const enUSD = moneda === "USD" && c.modo === "porcentaje";
        const descripcion = `Comisión ${persona.rol} — ${persona.nombre}` + (enUSD ? ` (US$${montoComisionMoneda(c).toLocaleString("es-AR")})` : "");
        const gdatos = {
          ambito: "unidad" as const, refId: unidadId, fecha: checkIn || hoyISO(),
          categoria: "Comisión" as const, descripcion,
          monto: montoPesos, proveedor: persona.nombre, claveOrigen: clave, personalId: persona.id,
        };
        if (existente) updateGasto(existente.id, gdatos);
        else addGasto(gdatos);
      } else if (existente) {
        deleteGasto(existente.id);
      }
    });
    // Borrar gastos-comisión de slots que ya no existen (quedaron de una versión anterior).
    gastos
      .filter((g) => g.claveOrigen?.startsWith(`personal|${reservaId}|`) && !clavesUsadas.has(g.claveOrigen))
      .forEach((g) => deleteGasto(g.id));
  }

  // Mantiene en sync el gasto "Comisión {canal}" de la unidad con el valor cargado.
  function sincronizarComision(reservaId: string) {
    const clave = `comision|${reservaId}`;
    const existente = gastos.find((g) => g.claveOrigen === clave);
    if (esOTA && comision > 0) {
      // Si la reserva es en USD, el gasto se guarda en pesos (al dólar oficial),
      // dejando el monto en dólares en el concepto. Los gastos/reportes son en pesos.
      const enUSD = moneda === "USD";
      const tc = dolarOficial ?? 0;
      const montoGasto = enUSD && tc > 0 ? Math.round(comision * tc) : comision;
      const descripcion = enUSD ? `Comisión ${canal} (US$${comision.toLocaleString("es-AR")})` : `Comisión ${canal}`;
      const gdatos = {
        ambito: "unidad" as const, refId: unidadId, fecha: checkIn || hoyISO(),
        categoria: "Comisión" as const, descripcion,
        monto: montoGasto, proveedor: canal, claveOrigen: clave,
      };
      if (existente) updateGasto(existente.id, gdatos);
      else addGasto(gdatos);
    } else if (existente) {
      deleteGasto(existente.id);
    }
  }

  return (
    <Overlay titulo={esEdicion ? "Editar reserva" : "Nueva reserva"} onCerrar={onCerrar}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          guardar();
        }}
        className="space-y-4"
      >
        <Campo label="Huésped">
          <input value={huesped} onChange={(e) => setHuesped(e.target.value)} className="input" autoFocus placeholder="Nombre y apellido" />
        </Campo>
        <Campo label="Contacto (tel / email)">
          <input value={contacto} onChange={(e) => setContacto(e.target.value)} className="input" placeholder="+54 9 223…" />
        </Campo>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Check-in">
            <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="input" />
          </Campo>
          <Campo label="Check-out">
            <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="input" />
          </Campo>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Hora check-in">
            <input type="time" value={horaCheckIn} onChange={(e) => setHoraCheckIn(e.target.value)} className="input" />
          </Campo>
          <Campo label="Hora check-out">
            <input type="time" value={horaCheckOut} onChange={(e) => setHoraCheckOut(e.target.value)} className="input" />
          </Campo>
        </div>

        {checkIn && checkOut && checkIn >= checkOut && (
          <p className="text-sm text-amber-600">El check-out debe ser posterior al check-in.</p>
        )}
        {fechasOk && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {cantNoches} {cantNoches === 1 ? "noche" : "noches"}
          </p>
        )}
        {choque && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3">
            ⚠ Se superpone con la reserva de <b>{choque.huesped}</b> (
            {formatearFecha(choque.checkIn)} → {formatearFecha(choque.checkOut)}). No se puede
            guardar para evitar un <b>doble booking</b>.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Canal">
            <select value={canal} onChange={(e) => setCanal(e.target.value as Canal)} className="input">
              {CANALES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Tipo">
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoAlquiler)} className="input">
              {TIPOS_ALQUILER.map((t) => (
                <option key={t.valor} value={t.valor}>{t.label}</option>
              ))}
            </select>
          </Campo>
        </div>

        {esOTA && (
          <Campo label={`Comisión ${canal} (${simbolo})`}>
            <InputMonto value={comision} onChange={setComision} decimales={moneda === "USD"} />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Se carga como gasto de la unidad (concepto «Comisión {canal}»).</p>
          </Campo>
        )}

        {moneda === "USD" && (
          <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
            💵 Dólar oficial hoy: <b>{dolarOficial ? `$${dolarOficial.toLocaleString("es-AR")}` : "—"}</b>
            {dolarOficial && totalEfectivo > 0 && <> · Total ≈ <b>${Math.round(totalEfectivo * dolarOficial).toLocaleString("es-AR")}</b></>}
            <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Al cobrar (Registrar pago) podés editar el tipo de cambio.</span>
          </div>
        )}

        {/* Comisiones a Personal (recepción, gestión, limpieza). Hasta 2 por reserva. */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Comisiones a personal</span>
            {personalActivo.length > 0 && (
              <button type="button" onClick={agregarComision} className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline">+ Agregar</button>
            )}
          </div>

          {personalActivo.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">Cargá personas en Gastos → Personal para poder asignarles comisiones.</p>
          ) : comisiones.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">Sin comisiones. Sumá quién recibe, gestiona o limpia y cuánto se lleva.</p>
          ) : (
            <>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Neto base: <b>{simbolo}{netoComision.toLocaleString("es-AR")}</b> (alquiler − comisión de plataforma)</p>
              {comisiones.map((c, i) => (
                <div key={i} className="rounded-md bg-slate-50 dark:bg-slate-900 p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <select value={c.personalId} onChange={(e) => elegirPersona(i, e.target.value)} className="input flex-1">
                      <option value="">— Elegí a la persona —</option>
                      {personalActivo.map((p) => <option key={p.id} value={p.id}>{p.nombre} · {p.rol}</option>)}
                    </select>
                    <button type="button" onClick={() => quitarComision(i)} className="text-rose-500 hover:text-rose-600 text-sm px-1" aria-label="Quitar">✕</button>
                  </div>
                  {c.personalId && (
                    <>
                      <div className="flex items-center gap-2">
                        <select value={c.modo} onChange={(e) => setLineaComision(i, { modo: e.target.value as ModoComision })} className="input w-28 shrink-0">
                          <option value="porcentaje">% del neto</option>
                          <option value="fijo">$ fijo</option>
                        </select>
                        <div className="relative w-24 shrink-0">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{c.modo === "porcentaje" ? "%" : "$"}</span>
                          <input type="number" inputMode="decimal" min={0} step={c.modo === "porcentaje" ? 0.5 : 100} value={c.valor || ""} onChange={(e) => setLineaComision(i, { valor: Number(e.target.value) })} className="input pl-6" placeholder="0" />
                        </div>
                        {moneda === "USD" && c.modo === "porcentaje" && (
                          <div className="relative flex-1">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">TC</span>
                            <input type="number" inputMode="decimal" min={0} value={c.tc ?? ""} onChange={(e) => setLineaComision(i, { tc: Number(e.target.value) })} className="input pl-7" placeholder={dolarOficial ? dolarOficial.toLocaleString("es-AR") : "$"} />
                          </div>
                        )}
                      </div>
                      <div className="text-right text-xs text-slate-600 dark:text-slate-300">
                        = <b>${montoComisionPesos(c).toLocaleString("es-AR")}</b>
                        {moneda === "USD" && c.modo === "porcentaje" && <span className="text-slate-400 dark:text-slate-500"> (US${montoComisionMoneda(c).toLocaleString("es-AR")})</span>}
                      </div>
                    </>
                  )}
                </div>
              ))}
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Cada comisión se carga como gasto de la unidad y queda en la cuenta corriente de la persona.</p>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Moneda">
            <select value={moneda} onChange={(e) => setMoneda(e.target.value as Moneda)} className="input">
              {MONEDAS.map((m) => (
                <option key={m.valor} value={m.valor}>{m.label}</option>
              ))}
            </select>
          </Campo>
          {esLargo && config.ajusteInflacion && (
            <Campo label="Actualización">
              <select value={actualizacion} onChange={(e) => setActualizacion(e.target.value as TipoActualizacion)} className="input">
                {TIPOS_ACTUALIZACION.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </Campo>
          )}
        </div>

        {esLargo && config.ajusteInflacion && actualizacion !== "Sin actualización" && (
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Índice de ajuste">
              <select value={indice} onChange={(e) => setIndice(e.target.value as IndiceAjuste)} className="input">
                {INDICES_AJUSTE.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </Campo>
            {indice === "Manual" && (
              <Campo label="% por período">
                <input
                  type="number" min={0} step="0.1"
                  value={porcentajeManual}
                  onChange={(e) => setPorcentajeManual(Math.max(0, Number(e.target.value)))}
                  className="input text-right"
                />
              </Campo>
            )}
          </div>
        )}

        {esLargo ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Campo label={`Alquiler mensual (${simbolo})`}>
                <InputMonto value={montoMensual} onChange={setMontoMensual} decimales={moneda === "USD"} />
              </Campo>
              <Campo label={`Depósito (${simbolo})`}>
                <InputMonto value={sena} onChange={setSena} decimales={moneda === "USD"} />
              </Campo>
            </div>
            {montoMensual > 0 && cantMeses > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Total del contrato: <b>{simbolo}{totalContrato.toLocaleString("es-AR")}</b> ({cantMeses} meses × {simbolo}{montoMensual.toLocaleString("es-AR")})
              </p>
            )}
          </>
        ) : (
          <>
            {tieneCocheraTarifa && (
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={conCochera} onChange={(e) => setConCochera(e.target.checked)} />
                Incluye cochera (🅿 ${(unidad!.precioDiaCochera ?? 0).toLocaleString("es-AR")}/día vs ${(unidad?.precioDia ?? 0).toLocaleString("es-AR")}/día)
              </label>
            )}
            {usaTarifaDia ? (
              <>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3 text-sm">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{cantNoches} {cantNoches === 1 ? "noche" : "noches"} × {simbolo}{tarifaDia.toLocaleString("es-AR")}{conCochera && tieneCocheraTarifa ? " (con cochera)" : ""}</span>
                    <b className="text-slate-800 dark:text-slate-100">{simbolo}{totalPorDia.toLocaleString("es-AR")}</b>
                  </div>
                  {totalPorDia > 0 && (
                    <div className="flex justify-between mt-1 text-xs text-slate-400 dark:text-slate-500">
                      <span>Saldo pendiente</span>
                      <b className={saldo > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>{simbolo}{saldo.toLocaleString("es-AR")}</b>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Campo label={`Monto total (${simbolo})`}>
                  <InputMonto value={montoTotal} onChange={setMontoTotal} decimales={moneda === "USD"} />
                </Campo>
                {montoTotal > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Saldo pendiente: <b className={saldo > 0 ? "text-amber-600" : "text-emerald-600"}>
                      {simbolo}{saldo.toLocaleString("es-AR")}
                    </b>
                  </p>
                )}
              </>
            )}
          </>
        )}

        {esLargo ? (
          <Campo label="Día de vencimiento mensual">
            <select
              value={diaVencimiento}
              onChange={(e) => setDiaVencimiento(e.target.value ? Number(e.target.value) : "")}
              className="input"
            >
              <option value="">Sin vencimiento fijo</option>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>Día {d} de cada mes</option>
              ))}
            </select>
          </Campo>
        ) : (
          <Campo label="Vencimiento del saldo (opcional)">
            <input type="date" value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} className="input" />
          </Campo>
        )}

        {esLargo && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Servicios a cargo del inquilino</span>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set([...SERVICIOS_DEFAULT, ...serviciosInquilino])).map((s) => {
                const activo = serviciosInquilino.includes(s);
                return (
                  <button
                    type="button" key={s} onClick={() => toggleServicio(s)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${activo ? "bg-teal-600 text-white border-teal-600" : "border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-teal-400"}`}
                  >
                    {activo ? "✓ " : ""}{s}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                value={nuevoServicio} onChange={(e) => setNuevoServicio(e.target.value)}
                placeholder="Agregar otro servicio…" className="input flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const n = nuevoServicio.trim(); if (n && !serviciosInquilino.includes(n)) setServiciosInquilino((p) => [...p, n]); setNuevoServicio(""); } }}
              />
            </div>
            <Campo label="Email del inquilino (para su portal)">
              <input type="email" value={emailInquilino} onChange={(e) => setEmailInquilino(e.target.value)} className="input" placeholder="inquilino@email.com" />
            </Campo>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Con este email, el inquilino entra al portal (con el link/QR de tu negocio) y carga los comprobantes de estos servicios cada mes.
            </p>
          </div>
        )}

        {esEdicion && reserva && esLargo && serviciosInquilino.length > 0 && (
          <ServiciosTablero reserva={reserva} servicios={serviciosInquilino} simbolo={simbolo} />
        )}

        {esEdicion && reserva && (
          <SeccionPagos reserva={reserva} simbolo={simbolo} total={totalEfectivo} sena={sena} />
        )}

        {!esEdicion && (
          <p className="text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-700 pt-3">
            💡 Guardá la reserva y volvé a abrirla para registrar los pagos —incluida la seña (con el check «Es la seña»)— cada uno con su fecha, y ver el saldo actualizado.
          </p>
        )}

        {esEdicion && reserva && <ChatReserva reservaId={reserva.id} />}

        <Campo label="Notas">
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} className="input min-h-20" placeholder="Horario de llegada, pedidos especiales, garante…" />
        </Campo>

        <div className="flex justify-between items-center pt-2">
          {esEdicion && puedeEdit ? (
            <button
              type="button"
              onClick={() => {
                if (reserva && confirm("¿Eliminar esta reserva?")) {
                  deleteReserva(reserva.id);
                  onCerrar();
                }
              }}
              className="text-sm text-rose-600 hover:text-rose-700"
            >
              Eliminar
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onCerrar} className="btn-secundario">Cerrar</button>
            {puedeEdit && <button type="submit" disabled={!valido} className="btn-primario">Guardar</button>}
          </div>
        </div>
      </form>
    </Overlay>
  );
}

const COLOR_ESTADO_CUOTA: Record<EstadoCuota, string> = {
  pagada: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  parcial: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  pendiente: "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
  vencida: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
};
const labelPeriodo = (p: string) => {
  const [y, m] = p.split("-").map(Number);
  return `${nombreMes(m - 1).slice(0, 3)} ${y}`;
};

// Chat con el inquilino (lado dueño).
function ChatReserva({ reservaId }: { reservaId: string }) {
  const { mensajesDe, enviarMensaje } = useStore();
  const msgs = mensajesDe(reservaId);
  const [texto, setTexto] = useState("");

  function enviar() {
    const t = texto.trim();
    if (!t) return;
    enviarMensaje(reservaId, t);
    setTexto("");
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Mensajes con el inquilino</span>
      <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
        {msgs.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">Sin mensajes. Escribile por el canal de la app (no hace falta WhatsApp).</p>
        ) : msgs.map((m) => (
          <div key={m.id} className={`flex ${m.autor === "dueno" ? "justify-end" : "justify-start"}`}>
            <span className={`text-xs px-2.5 py-1.5 rounded-2xl max-w-[80%] ${m.autor === "dueno" ? "bg-teal-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"}`}>{m.texto}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <input value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); enviar(); } }} className="input flex-1" placeholder="Escribir mensaje…" />
        <button type="button" onClick={enviar} disabled={!texto.trim()} className="btn-primario disabled:opacity-50">Enviar</button>
      </div>
    </div>
  );
}

// Tablero mensual de comprobantes de servicios (lado dueño). Puede ver y también
// cargar en nombre del inquilino. El inquilino carga lo mismo desde su portal.
function ServiciosTablero({ reserva, servicios, simbolo }: { reserva: Reserva; servicios: string[]; simbolo: string }) {
  const { serviciosDe, guardarServicioComprobante, deleteServicioComprobante } = useStore();
  const comps = serviciosDe(reserva.id);
  const hoyMes = hoyISO().slice(0, 7);
  const [ver, setVer] = useState<ServicioComprobante | null>(null);
  const meses = vencimientosMensuales(reserva.checkIn, reserva.checkOut);

  const compDe = (periodo: string, servicio: string) => comps.find((c) => c.periodo === periodo && c.servicio === servicio);

  async function subir(periodo: string, servicio: string, file: File) {
    const img = await subirArchivo(file, "comprobantes");
    guardarServicioComprobante({ reservaId: reserva.id, periodo, servicio, comprobante: img, monto: 0, fecha: hoyISO() });
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Comprobantes de servicios</span>
        <span className="text-xs text-slate-400 dark:text-slate-500">verde = cargado</span>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {meses.map((ini) => {
          const periodo = ini.slice(0, 7);
          const [y, m] = periodo.split("-").map(Number);
          const esActual = periodo === hoyMes;
          return (
            <div key={periodo} className="flex items-start gap-2">
              <span className={`w-16 shrink-0 text-xs capitalize pt-0.5 ${esActual ? "font-semibold text-teal-600 dark:text-teal-400" : "text-slate-500 dark:text-slate-400"}`}>
                {nombreMes(m - 1).slice(0, 3)} {y}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {servicios.map((s) => {
                  const c = compDe(periodo, s);
                  if (c?.comprobante) {
                    return (
                      <button type="button" key={s} onClick={() => setVer(c)} className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                        ✓ {s}
                      </button>
                    );
                  }
                  return (
                    <label key={s} className="text-[11px] px-2 py-0.5 rounded-full border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 cursor-pointer hover:border-teal-400 hover:text-teal-500">
                      + {s}
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) await subir(periodo, s, f); e.target.value = ""; }} />
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {ver && (
        <Overlay titulo={`${ver.servicio} · ${ver.periodo}`} onCerrar={() => setVer(null)}>
          {ver.monto > 0 && <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Monto: {simbolo}{ver.monto.toLocaleString("es-AR")}</p>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {ver.comprobante && <img src={ver.comprobante} alt="Comprobante" className="w-full rounded-lg" />}
          <div className="flex justify-end pt-3">
            <button
              type="button"
              onClick={() => { deleteServicioComprobante(reserva.id, ver.periodo, ver.servicio); setVer(null); }}
              className="text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400"
            >
              Quitar comprobante
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function SeccionPagos({ reserva, simbolo, total, sena }: { reserva: Reserva; simbolo: string; total: number; sena: number }) {
  const { pagosDe, addPago, updatePago, deletePago, mediosPago, gastos, updateReserva, dolarOficial } = useStore();
  const esUSD = reserva.moneda === "USD";
  const pagos = pagosDe(reserva.id);
  const largo = esLargoPlazo(reserva.tipo);
  const hoy = hoyISO();
  const [aumentos, setAumentos] = useState(reserva.aumentos ?? []);
  const cc = largo ? cuentaCorriente({ ...reserva, aumentos }, pagos, hoy, gastos) : null;

  // Form de "aplicar aumento"
  const [abrirAum, setAbrirAum] = useState(false);
  const [aumDesde, setAumDesde] = useState("");
  const [aumMonto, setAumMonto] = useState(0);

  function aplicarAumento() {
    if (!aumDesde || aumMonto <= 0) return;
    const next = [...aumentos.filter((a) => a.desde !== aumDesde), { desde: aumDesde, monto: aumMonto }].sort((x, y) => x.desde.localeCompare(y.desde));
    setAumentos(next);
    updateReserva(reserva.id, { aumentos: next });
    setAbrirAum(false);
    setAumMonto(0);
  }

  const totalPagos = pagos.reduce((a, p) => a + p.monto, 0);
  // Si la seña está registrada como pago, no sumamos también el campo 'sena'.
  const haySenaPago = pagos.some((p) => p.esSena);
  const pagado = (haySenaPago ? 0 : sena) + totalPagos;
  const saldo = Math.max(0, total - pagado);

  const [abrir, setAbrir] = useState(false);
  // La moneda en que entra el pago (pesos o dólares) es independiente de la moneda
  // de la reserva. Arranca en la de la reserva. El % y "Saldar" llenan el importe.
  const [modo, setModo] = useState<"ARS" | "USD">(esUSD ? "USD" : "ARS");
  const [monto, setMonto] = useState(0);
  const [medio, setMedio] = useState<string>(mediosPago[0]?.nombre ?? "Efectivo");
  const [fecha, setFecha] = useState(hoy);
  const [periodo, setPeriodo] = useState<string>(cc?.proxima?.periodo ?? "");
  const [comprobante, setComprobante] = useState<string | undefined>();
  const [nota, setNota] = useState("");
  const [esSena, setEsSena] = useState(false);
  const [tipoCambio, setTipoCambio] = useState(0);
  const [editId, setEditId] = useState<string | null>(null);

  // Prefill del tipo de cambio con el dólar oficial cuando llega.
  useEffect(() => { if (tipoCambio === 0 && dolarOficial) setTipoCambio(dolarOficial); }, [dolarOficial, tipoCambio]);

  const r2 = (n: number) => Math.round(n * 100) / 100;
  // Tipo de cambio efectivo: lo que el usuario cargó, o el oficial como respaldo.
  const tc = tipoCambio || dolarOficial || 0;
  // ¿La moneda del pago difiere de la de la reserva? (requiere tipo de cambio)
  const cruzada = modo !== reserva.moneda;
  const montoIngresado = monto;        // lo que entró, en la moneda elegida
  const monedaPagoSel: Moneda = modo;  // moneda del pago
  // montoReserva = equivalente en la moneda de la reserva (lo que se guarda en pago.monto y arma el saldo).
  let montoReserva = 0;
  if (!cruzada) montoReserva = monto;
  else if (esUSD) montoReserva = tc > 0 ? r2(monto / tc) : 0; // entró en pesos, reserva USD
  else montoReserva = Math.round(monto * tc); // entró en dólares, reserva en pesos

  // Convierte un importe expresado en la moneda de la reserva a la moneda elegida del pago.
  function aMonedaPago(montoEnReserva: number): number {
    if (!cruzada) return esUSD ? r2(montoEnReserva) : Math.round(montoEnReserva);
    if (esUSD) return Math.round(montoEnReserva * tc);          // reserva USD → pesos
    return tc > 0 ? r2(montoEnReserva / tc) : 0;                // reserva ARS → dólares
  }
  const saldoTarget = largo && cc ? (cc.proxima?.saldo ?? saldo) : saldo;
  // Cambiar la moneda del pago resetea el importe (50 USD no son 50 pesos).
  function cambiarModo(m: "ARS" | "USD") { if (m !== modo) { setModo(m); setMonto(0); } }

  // El tipo de cambio editable solo tiene sentido cuando la moneda del pago difiere
  // de la de la reserva (ej. pago en pesos una reserva USD: para saber cuántos USD cubre).
  const mostrarTC = cruzada;
  // Si pagás en USD una reserva USD, mostramos la equivalencia en pesos como referencia
  // (al oficial), sin pedir nada.
  const equivPesos = esUSD && !cruzada && tc > 0 ? Math.round(montoReserva * tc) : null;

  function registrar() {
    if (montoReserva <= 0) return;
    const datos = {
      reservaId: reserva.id, fecha, monto: montoReserva, medio, comprobante, nota: nota.trim(),
      periodo: !esSena && largo ? (periodo || undefined) : undefined, esSena,
      monedaPago: monedaPagoSel, montoIngresado,
      tipoCambio: tipoCambio > 0 && (cruzada || esUSD) ? tipoCambio : undefined,
      montoArs: undefined,
    };
    if (editId) updatePago(editId, datos);
    else addPago(datos);
    setEditId(null); setMonto(0); setComprobante(undefined); setNota(""); setEsSena(false); setAbrir(false);
  }

  // Abre el formulario precargado para editar un pago existente.
  function editarPago(p: typeof pagos[number]) {
    setEditId(p.id);
    // Moneda en que entró: nueva (monedaPago), o inferida de pagos viejos (montoArs => pesos).
    const mp: "ARS" | "USD" = (p.monedaPago as "ARS" | "USD") ?? (p.montoArs != null ? "ARS" : (reserva.moneda === "USD" ? "USD" : "ARS"));
    setModo(mp);
    setMonto(p.montoIngresado ?? p.montoArs ?? p.monto);
    if (p.tipoCambio) setTipoCambio(p.tipoCambio);
    setMedio(p.medio);
    setFecha(p.fecha);
    setComprobante(p.comprobante);
    setNota(p.nota ?? "");
    setEsSena(p.esSena ?? false);
    setPeriodo(p.periodo ?? "");
    setAbrir(true);
  }

  // Abre el formulario precargado para saldar una cuota puntual (en la moneda de la reserva).
  function pagarCuota(c: Cuota) {
    setModo(reserva.moneda === "USD" ? "USD" : "ARS");
    setMonto(c.saldo);
    setPeriodo(c.periodo);
    setAbrir(true);
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{largo ? "Cuenta corriente" : "Pagos"} <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">v2</span></span>
        {largo && cc ? (
          <span className={`text-sm font-semibold ${cc.saldoVencido > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {cc.saldoVencido > 0 ? `Vencido ${simbolo}${cc.saldoVencido.toLocaleString("es-AR")}` : "Al día ✓"}
          </span>
        ) : (
          <span className={`text-sm font-semibold ${saldo > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {saldo > 0 ? `Saldo ${simbolo}${saldo.toLocaleString("es-AR")}` : "Pagado ✓"}
          </span>
        )}
      </div>

      {largo && cc ? (
        <div className="text-xs text-slate-400 dark:text-slate-500 mb-2">
          Devengado {simbolo}{cc.devengado.toLocaleString("es-AR")} · Cobrado {simbolo}{cc.totalPagado.toLocaleString("es-AR")}
          {cc.totalCredito > 0 && <span className="text-violet-500 dark:text-violet-400"> · crédito inquilino {simbolo}{cc.totalCredito.toLocaleString("es-AR")}</span>}
          {sena > 0 && ` · depósito ${simbolo}${sena.toLocaleString("es-AR")}`}
        </div>
      ) : (
        <div className="text-xs text-slate-400 dark:text-slate-500 mb-2">
          Total {simbolo}{total.toLocaleString("es-AR")} · Pagado {simbolo}{pagado.toLocaleString("es-AR")}
          {sena > 0 && ` (seña ${simbolo}${sena.toLocaleString("es-AR")})`}
        </div>
      )}

      {/* Cuotas (contratos largos) */}
      {largo && cc && (
        <div className="space-y-1 mb-2 max-h-44 overflow-y-auto pr-1">
          {cc.cuotas.map((c) => (
            <button
              type="button"
              key={c.periodo}
              onClick={() => c.saldo > 0 && pagarCuota(c)}
              className={`w-full flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5 text-left ${c.saldo > 0 ? "hover:bg-slate-50 dark:hover:bg-slate-700/40" : ""} ${c.saldo > 0 ? "cursor-pointer" : "cursor-default"}`}
            >
              <span className="w-16 shrink-0 capitalize text-slate-600 dark:text-slate-300">{labelPeriodo(c.periodo)}</span>
              <span className="text-slate-500 dark:text-slate-400 tabular-nums">{simbolo}{c.monto.toLocaleString("es-AR")}</span>
              {c.credito > 0 && <span className="text-violet-500 dark:text-violet-400 tabular-nums">gasto −{simbolo}{c.credito.toLocaleString("es-AR")}</span>}
              {c.pagado > 0 && c.estado !== "pagada" && <span className="text-slate-400 dark:text-slate-500 tabular-nums">pagó {simbolo}{c.pagado.toLocaleString("es-AR")}</span>}
              <span className={`ml-auto shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${COLOR_ESTADO_CUOTA[c.estado]}`}>{c.estado}</span>
            </button>
          ))}
        </div>
      )}

      {/* Aplicar aumento (nuevo importe desde un mes) */}
      {largo && cc && (
        <div className="mb-2">
          {!abrirAum ? (
            <button type="button" onClick={() => { setAumDesde(cc.proxima?.periodo ?? hoy.slice(0, 7)); setAbrirAum(true); }} className="text-xs text-teal-600 dark:text-teal-400 hover:underline">
              + Aplicar aumento
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-700 pt-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Desde</span>
              <select value={aumDesde} onChange={(e) => setAumDesde(e.target.value)} className="input w-auto py-1 text-xs">
                {cc.cuotas.map((c) => <option key={c.periodo} value={c.periodo}>{labelPeriodo(c.periodo)}</option>)}
              </select>
              <span className="text-xs text-slate-500 dark:text-slate-400">nuevo importe</span>
              <InputMonto value={aumMonto} onChange={setAumMonto} className="w-32" />
              <button type="button" onClick={aplicarAumento} disabled={aumMonto <= 0} className="btn-primario text-xs disabled:opacity-50">Aplicar</button>
              <button type="button" onClick={() => setAbrirAum(false)} className="btn-secundario text-xs">Cancelar</button>
            </div>
          )}
          {aumentos.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {aumentos.map((a) => (
                <span key={a.desde} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                  desde {labelPeriodo(a.desde)}: {simbolo}{a.monto.toLocaleString("es-AR")}
                  <button type="button" onClick={() => { const next = aumentos.filter((x) => x.desde !== a.desde); setAumentos(next); updateReserva(reserva.id, { aumentos: next }); }} className="ml-1 text-slate-400 hover:text-rose-500">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Historial de pagos */}
      {pagos.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {pagos.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-slate-900 rounded-lg px-2.5 py-1.5">
              {p.monedaPago && p.monedaPago !== reserva.moneda ? (
                // Entró en otra moneda: mostramos lo que entró y el equivalente en la moneda de la reserva.
                <span className="text-slate-700 dark:text-slate-200 font-medium">{SIMBOLO_MONEDA[p.monedaPago]}{(p.montoIngresado ?? p.monto).toLocaleString("es-AR")} <span className="text-slate-400 dark:text-slate-500 font-normal">· {simbolo}{p.monto.toLocaleString("es-AR")}</span></span>
              ) : p.montoArs != null ? (
                // Legado: reserva USD cobrada en pesos.
                <span className="text-slate-700 dark:text-slate-200 font-medium">${p.montoArs.toLocaleString("es-AR")} <span className="text-slate-400 dark:text-slate-500 font-normal">· US${p.monto.toLocaleString("es-AR")}</span></span>
              ) : (
                <span className="text-slate-700 dark:text-slate-200 font-medium">{simbolo}{p.monto.toLocaleString("es-AR")}
                  {esUSD && p.tipoCambio ? <span className="text-slate-400 dark:text-slate-500 font-normal"> · ≈ ${Math.round(p.monto * p.tipoCambio).toLocaleString("es-AR")}</span> : null}
                </span>
              )}
              {p.esSena && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">seña</span>}
              {p.periodo && <span className="text-teal-600 dark:text-teal-400 capitalize">{labelPeriodo(p.periodo)}</span>}
              <span className="text-slate-500 dark:text-slate-400">{p.medio}</span>
              <span className="text-slate-400 dark:text-slate-500">{formatearFecha(p.fecha)}</span>
              {p.comprobante && (
                <a href={p.comprobante} target="_blank" rel="noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline">comprobante</a>
              )}
              <button type="button" onClick={() => editarPago(p)} className="ml-auto text-slate-400 hover:text-teal-600 dark:hover:text-teal-400">editar</button>
              <button type="button" onClick={() => deletePago(p.id)} className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400">×</button>
            </div>
          ))}
        </div>
      )}

      {!abrir ? (
        <button type="button" onClick={() => setAbrir(true)} className="text-sm text-teal-600 dark:text-teal-400 hover:underline">
          + Registrar pago
        </button>
      ) : (
        <div className="space-y-2 border-t border-slate-100 dark:border-slate-700 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border border-slate-300 dark:border-slate-600 overflow-hidden text-xs">
              <button type="button" onClick={() => cambiarModo("ARS")} className={modo === "ARS" ? "px-2 py-1 bg-teal-600 text-white" : "px-2 py-1 text-slate-500 dark:text-slate-400"}>pesos</button>
              <button type="button" onClick={() => cambiarModo("USD")} className={modo === "USD" ? "px-2 py-1 bg-teal-600 text-white" : "px-2 py-1 text-slate-500 dark:text-slate-400"}>US$</button>
            </div>
            <InputMonto value={monto} onChange={setMonto} decimales={modo === "USD"} className="flex-1" />
            <button type="button" onClick={() => setMonto(aMonedaPago(total * 0.3))} className="text-xs text-teal-600 dark:text-teal-400 hover:underline whitespace-nowrap">Seña 30%</button>
            <button type="button" onClick={() => setMonto(aMonedaPago(saldoTarget))} className="text-xs text-teal-600 dark:text-teal-400 hover:underline whitespace-nowrap">Saldar</button>
          </div>

          {/* Tipo de cambio: cuando hay dólares de por medio (pago en otra moneda o reserva USD). */}
          {mostrarTC && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">Dólar $</span>
              <input type="number" min={0} value={tipoCambio} onChange={(e) => setTipoCambio(Math.max(0, Number(e.target.value)))} className="input w-28 text-right" />
              <span className="text-[10px] text-slate-400 dark:text-slate-500">{dolarOficial ? "oficial sugerido, editable" : "cargá el valor"}</span>
            </div>
          )}
          {(cruzada || equivPesos != null) && montoReserva > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              = <b>{simbolo}{montoReserva.toLocaleString("es-AR")}</b> en la moneda de la reserva
              {cruzada && <> · entró <b>{SIMBOLO_MONEDA[monedaPagoSel]}{montoIngresado.toLocaleString("es-AR")}</b></>}
              {equivPesos != null && <> · ≈ <b>${equivPesos.toLocaleString("es-AR")}</b> en pesos</>}
            </p>
          )}

          {largo && cc && (
            <label className="block">
              <span className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Imputar al mes</span>
              <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="input">
                <option value="">Automático (el más antiguo impago)</option>
                {cc.cuotas.map((c) => (
                  <option key={c.periodo} value={c.periodo}>{labelPeriodo(c.periodo)} · saldo {simbolo}{c.saldo.toLocaleString("es-AR")}</option>
                ))}
              </select>
            </label>
          )}

          <div className="grid grid-cols-2 gap-2">
            <SelectMedio value={medio} onChange={setMedio} />
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input" />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={esSena} onChange={(e) => setEsSena(e.target.checked)} />
            Es la seña (queda registrada con su fecha)
          </label>

          <div className="flex items-center gap-2">
            <label className="btn-secundario cursor-pointer text-xs">
              {comprobante ? "Comprobante ✓" : "Adjuntar comprobante"}
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setComprobante(await subirArchivo(f, "comprobantes"));
                e.target.value = "";
              }} />
            </label>
            {comprobante && <button type="button" onClick={() => setComprobante(undefined)} className="text-xs text-slate-400 hover:text-rose-600">quitar</button>}
          </div>

          <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota (opcional)" className="input" />

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setAbrir(false); setEditId(null); }} className="btn-secundario">Cancelar</button>
            <button type="button" onClick={registrar} disabled={montoReserva <= 0} className="btn-primario">{editId ? "Guardar" : "Registrar"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
