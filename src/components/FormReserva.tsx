"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { CANALES, TIPOS_ALQUILER, TIPOS_ACTUALIZACION, MONEDAS, SIMBOLO_MONEDA, INDICES_AJUSTE, esLargoPlazo, SERVICIOS_DEFAULT } from "@/lib/types";
import type { Canal, Reserva, TipoAlquiler, TipoActualizacion, Moneda, IndiceAjuste, ServicioComprobante } from "@/lib/types";
import { noches, formatearFecha, hoyISO, nombreMes } from "@/lib/fechas";
import { mesesContrato, vencimientosMensuales } from "@/lib/ajustes";
import { cuentaCorriente } from "@/lib/cuentaCorriente";
import type { Cuota, EstadoCuota } from "@/lib/cuentaCorriente";
import { archivoADataUrl } from "@/lib/imagen";
import { Overlay, Campo } from "@/components/ui";
import InputMonto from "@/components/InputMonto";
import SelectMedio from "@/components/SelectMedio";

export default function FormReserva({
  unidadId,
  reserva,
  fechaInicial,
  onCerrar,
}: {
  unidadId: string;
  reserva?: Reserva; // si viene, es edición
  fechaInicial?: string;
  onCerrar: () => void;
}) {
  const { addReserva, updateReserva, deleteReserva, conflicto, pagosDe, config, puedeEditar } = useStore();
  const esEdicion = Boolean(reserva);
  const puedeEdit = puedeEditar("reservas");

  const [huesped, setHuesped] = useState(reserva?.huesped ?? "");
  const [contacto, setContacto] = useState(reserva?.contacto ?? "");
  const [checkIn, setCheckIn] = useState(reserva?.checkIn ?? fechaInicial ?? "");
  const [checkOut, setCheckOut] = useState(reserva?.checkOut ?? "");
  const [montoTotal, setMontoTotal] = useState(reserva?.montoTotal ?? 0);
  const [montoMensual, setMontoMensual] = useState(reserva?.montoMensual ?? 0);
  const [sena, setSena] = useState(reserva?.sena ?? 0);
  const [canal, setCanal] = useState<Canal>(reserva?.canal ?? "Directo");
  const [tipo, setTipo] = useState<TipoAlquiler>(reserva?.tipo ?? "temporal");
  const [moneda, setMoneda] = useState<Moneda>(reserva?.moneda ?? config.monedaDefault);
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

  const toggleServicio = (s: string) =>
    setServiciosInquilino((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const simbolo = SIMBOLO_MONEDA[moneda];
  const esLargo = tipo !== "temporal";

  const fechasOk = checkIn && checkOut && checkIn < checkOut;
  const choque = fechasOk ? conflicto(unidadId, checkIn, checkOut, reserva?.id) : null;
  const valido = huesped.trim() && fechasOk && !choque;
  const cantNoches = fechasOk ? noches(checkIn, checkOut) : 0;
  // Para largo plazo, el total del contrato se deriva del mensual × meses.
  const cantMeses = fechasOk ? mesesContrato(checkIn, checkOut) : 0;
  const totalContrato = montoMensual * cantMeses;
  const totalEfectivo = esLargo ? totalContrato : montoTotal;
  const totalPagos = reserva ? pagosDe(reserva.id).reduce((a, p) => a + p.monto, 0) : 0;
  const saldo = Math.max(0, totalEfectivo - sena - totalPagos);

  function guardar() {
    if (!valido) return;
    const datos = {
      unidadId,
      huesped: huesped.trim(),
      contacto: contacto.trim(),
      checkIn,
      checkOut,
      montoTotal: esLargo ? totalContrato : montoTotal,
      montoMensual: esLargo ? montoMensual : 0,
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
      notas: notas.trim(),
    };
    if (esEdicion && reserva) updateReserva(reserva.id, datos);
    else addReserva(datos);
    onCerrar();
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
                <InputMonto value={montoMensual} onChange={setMontoMensual} />
              </Campo>
              <Campo label={`Depósito (${simbolo})`}>
                <InputMonto value={sena} onChange={setSena} />
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
            <div className="grid grid-cols-2 gap-4">
              <Campo label={`Monto total (${simbolo})`}>
                <InputMonto value={montoTotal} onChange={setMontoTotal} />
              </Campo>
              <Campo label={`Seña (${simbolo})`}>
                <InputMonto value={sena} onChange={setSena} />
              </Campo>
            </div>
            {montoTotal > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Saldo pendiente: <b className={saldo > 0 ? "text-amber-600" : "text-emerald-600"}>
                  {simbolo}{saldo.toLocaleString("es-AR")}
                </b>
              </p>
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
    const img = await archivoADataUrl(file, 1000);
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
  const { pagosDe, addPago, deletePago, mediosPago, gastos, updateReserva } = useStore();
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
  const pagado = sena + totalPagos;
  const saldo = Math.max(0, total - pagado);

  const [abrir, setAbrir] = useState(false);
  const [modo, setModo] = useState<"$" | "%">("$");
  const [monto, setMonto] = useState(0);
  const [pct, setPct] = useState(0);
  const [medio, setMedio] = useState<string>(mediosPago[0]?.nombre ?? "Efectivo");
  const [fecha, setFecha] = useState(hoy);
  const [periodo, setPeriodo] = useState<string>(cc?.proxima?.periodo ?? "");
  const [comprobante, setComprobante] = useState<string | undefined>();
  const [nota, setNota] = useState("");

  const montoEfectivo = modo === "%" ? Math.round((total * pct) / 100) : monto;

  function registrar() {
    if (montoEfectivo <= 0) return;
    addPago({ reservaId: reserva.id, fecha, monto: montoEfectivo, medio, comprobante, nota: nota.trim(), periodo: largo ? (periodo || undefined) : undefined });
    setMonto(0); setPct(0); setComprobante(undefined); setNota(""); setAbrir(false);
  }

  // Abre el formulario precargado para saldar una cuota puntual.
  function pagarCuota(c: Cuota) {
    setModo("$");
    setMonto(c.saldo);
    setPeriodo(c.periodo);
    setAbrir(true);
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{largo ? "Cuenta corriente" : "Pagos"}</span>
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
              <span className="text-slate-700 dark:text-slate-200 font-medium">{simbolo}{p.monto.toLocaleString("es-AR")}</span>
              {p.periodo && <span className="text-teal-600 dark:text-teal-400 capitalize">{labelPeriodo(p.periodo)}</span>}
              <span className="text-slate-500 dark:text-slate-400">{p.medio}</span>
              <span className="text-slate-400 dark:text-slate-500">{formatearFecha(p.fecha)}</span>
              {p.comprobante && (
                <a href={p.comprobante} target="_blank" rel="noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline">comprobante</a>
              )}
              <button type="button" onClick={() => deletePago(p.id)} className="ml-auto text-slate-400 hover:text-rose-600 dark:hover:text-rose-400">×</button>
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
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-slate-300 dark:border-slate-600 overflow-hidden text-xs">
              <button type="button" onClick={() => setModo("$")} className={modo === "$" ? "px-2 py-1 bg-teal-600 text-white" : "px-2 py-1 text-slate-500 dark:text-slate-400"}>$</button>
              <button type="button" onClick={() => setModo("%")} className={modo === "%" ? "px-2 py-1 bg-teal-600 text-white" : "px-2 py-1 text-slate-500 dark:text-slate-400"}>%</button>
            </div>
            {modo === "$" ? (
              <InputMonto value={monto} onChange={setMonto} className="flex-1" />
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <input type="number" min={0} max={100} value={pct} onChange={(e) => setPct(Math.max(0, Math.min(100, Number(e.target.value))))} className="input w-20 text-right" />
                <span className="text-xs text-slate-400">% = {simbolo}{montoEfectivo.toLocaleString("es-AR")}</span>
              </div>
            )}
            <button type="button" onClick={() => { setModo("$"); setMonto(largo && cc ? (cc.proxima?.saldo ?? saldo) : saldo); }} className="text-xs text-teal-600 dark:text-teal-400 hover:underline whitespace-nowrap">Saldar</button>
          </div>

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

          <div className="flex items-center gap-2">
            <label className="btn-secundario cursor-pointer text-xs">
              {comprobante ? "Comprobante ✓" : "Adjuntar comprobante"}
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setComprobante(await archivoADataUrl(f, 1000));
                e.target.value = "";
              }} />
            </label>
            {comprobante && <button type="button" onClick={() => setComprobante(undefined)} className="text-xs text-slate-400 hover:text-rose-600">quitar</button>}
          </div>

          <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota (opcional)" className="input" />

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAbrir(false)} className="btn-secundario">Cancelar</button>
            <button type="button" onClick={registrar} disabled={montoEfectivo <= 0} className="btn-primario">Registrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
