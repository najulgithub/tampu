"use client";

import { useState, useEffect, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { IconoUnidad } from "@/components/iconos";
import { Overlay, Campo } from "@/components/ui";
import { subirArchivo } from "@/lib/storage";
import { aumentoVigente, cuentaCorriente } from "@/lib/cuentaCorriente";
import { ChatWidgetInquilino } from "@/components/ChatWidget";
import { CampanaInquilino } from "@/components/Campana";
import { LogoTampu } from "@/components/Logo";
import { traducir, idiomaDispositivo } from "@/lib/i18n";
import type { TipoUnidad, Reserva, Pago, Gasto } from "@/lib/types";

// ---------- Tipos del portal (lo que devuelven las RPC) ----------
type UnidadPortal = {
  id: string;
  nombre: string;
  tipo_unidad: string;
  color: string;
  foto: string | null;
  localidad: string;
  capacidad: number;
  ambientes: number;
  grupo_nombre: string;
};

type Ocupacion = { check_in: string; check_out: string };

type ReservaCliente = {
  id: string;
  unidad_id: string;
  check_in: string;
  check_out: string;
  monto_total: number;
  sena: number;
  estado: string;
};

type Contrato = {
  id: string;
  unidad: string;
  check_in: string;
  check_out: string;
  servicios: string[];
  dia_vencimiento: number | null;
  monto_mensual: number;
  moneda: string;
  aumentos: { desde: string; monto: number }[];
  actualizacion: string;
  indice: string;
  porcentaje_manual: number;
};

type ServicioCargado = { periodo: string; servicio: string; comprobante: string | null; monto: number; fecha: string };

type ProvContacto = { nombre: string; rubro: string; telefono: string; email: string };

// Lista de meses "yyyy-mm" desde el check-in hasta hoy (o fin de contrato si ya terminó).
function mesesHasta(checkIn: string, checkOut: string, hoy: string): string[] {
  const res: string[] = [];
  let [y, m] = checkIn.slice(0, 7).split("-").map(Number);
  const fin = (checkOut < hoy ? checkOut : hoy).slice(0, 7);
  let cur = `${y}-${String(m).padStart(2, "0")}`;
  let guard = 0;
  while (cur <= fin && guard < 60) {
    res.push(cur);
    m++; if (m > 12) { m = 1; y++; }
    cur = `${y}-${String(m).padStart(2, "0")}`;
    guard++;
  }
  return res;
}

const NOMBRES_MES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function labelMes(periodo: string) {
  const [y, m] = periodo.split("-").map(Number);
  return `${NOMBRES_MES_CORTO[m - 1]} ${y}`;
}

// dos rangos de noches se pisan si: aIn < bOut && bIn < aOut
function solapan(aIn: string, aOut: string, bIn: string, bOut: string) {
  return aIn < bOut && bIn < aOut;
}

function pesos(n: number) {
  return "$" + Math.round(n).toLocaleString("es-AR");
}

function fechaLinda(iso: string) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function noches(inn: string, out: string) {
  if (!inn || !out) return 0;
  const ms = new Date(out).getTime() - new Date(inn).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

export default function PortalCliente({ session }: { session: Session }) {
  const t = (s: string) => traducir(idiomaDispositivo(), s);
  const [unidades, setUnidades] = useState<UnidadPortal[]>([]);
  const [misReservas, setMisReservas] = useState<ReservaCliente[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [provs, setProvs] = useState<ProvContacto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [activa, setActiva] = useState<UnidadPortal | null>(null); // unidad para reservar
  const [duenos, setDuenos] = useState<{ owner_id: string; nombre: string; activo: boolean }[]>([]);
  const [duenoActivo, setDuenoActivo] = useState<string>("");

  const cargarReservas = useCallback(async () => {
    const { data } = await supabase
      .from("reservas")
      .select("id, unidad_id, check_in, check_out, monto_total, sena, estado")
      .eq("cliente_id", session.user.id)
      .order("check_in", { ascending: true });
    setMisReservas((data as ReservaCliente[]) ?? []);
  }, [session.user.id]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data: dd } = await supabase.rpc("mis_duenos");
      if (vivo && Array.isArray(dd)) {
        setDuenos(dd as typeof duenos);
        setDuenoActivo((dd.find((d: { activo: boolean }) => d.activo)?.owner_id) ?? (dd[0]?.owner_id ?? ""));
      }
      const { data, error } = await supabase.rpc("portal_unidades");
      if (!vivo) return;
      if (error) setError(t("No pudimos cargar las unidades. Intentá de nuevo en un momento."));
      else setUnidades((data as UnidadPortal[]) ?? []);
      const { data: ct } = await supabase.rpc("portal_mis_contratos");
      if (vivo) setContratos((ct as Contrato[]) ?? []);
      const { data: pr } = await supabase.rpc("portal_proveedores");
      if (vivo) setProvs((pr as ProvContacto[]) ?? []);
      await cargarReservas();
      if (vivo) setCargando(false);
    })();
    return () => { vivo = false; };
  }, [cargarReservas]);

  // Cambiar de negocio: cambia el dueño activo y recarga el portal.
  async function cambiarDueno(owner: string) {
    if (owner === duenoActivo) return;
    setDuenoActivo(owner);
    await supabase.rpc("cambiar_dueno_activo", { p_owner: owner });
    window.location.reload();
  }

  const nombreUnidad = (id: string) => unidades.find((u) => u.id === id)?.nombre ?? t("Unidad");

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      <header className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/60 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            <LogoTampu size={28} />
            tampu
          </div>
          <div className="flex items-center gap-3 text-sm">
            {duenos.length > 1 && (
              <select
                value={duenoActivo}
                onChange={(e) => cambiarDueno(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm px-2 py-1 max-w-[160px]"
                title={t("Elegí el negocio")}
              >
                {duenos.map((d) => <option key={d.owner_id} value={d.owner_id}>{d.nombre}</option>)}
              </select>
            )}
            <CampanaInquilino />
            <span className="text-slate-500 dark:text-slate-400 hidden sm:inline max-w-[160px] truncate">{session.user.email}</span>
            <button onClick={() => supabase.auth.signOut()} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition">
              {t("Salir")}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-16 animate-in space-y-8">
        {cargando ? (
          <p className="text-center text-slate-400 dark:text-slate-500 py-12">{t("Cargando…")}</p>
        ) : error ? (
          <p className="text-center text-rose-600 dark:text-rose-400 py-12">{error}</p>
        ) : (
          <>
            {contratos.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">{t("Tu cuenta")}</h2>
                <div className="space-y-4">
                  {contratos.map((c) => <ContratoCuenta key={c.id} contrato={c} />)}
                </div>
              </section>
            )}

            {contratos.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">{t("Tus servicios")}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{t("Subí el comprobante de cada servicio del mes.")}</p>
                <div className="space-y-4">
                  {contratos.map((c) => <ContratoServicios key={c.id} contrato={c} />)}
                </div>
              </section>
            )}

            {contratos.length > 0 && <DocumentosInquilino contratos={contratos} />}

            {provs.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">{t("Contactos de proveedores")}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{t("¿Se rompió algo? Acá tenés a quién llamar.")}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {provs.map((p, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/70 p-3 shadow-sm">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{p.nombre}</div>
                      {p.rubro && <div className="text-xs text-teal-600 dark:text-teal-400">{p.rubro}</div>}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs">
                        {p.telefono && <a href={`tel:${p.telefono.replace(/\s/g, "")}`} className="text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400">📞 {p.telefono}</a>}
                        {p.email && <a href={`mailto:${p.email}`} className="text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 truncate">✉ {p.email}</a>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {misReservas.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">{t("Tus reservas")}</h2>
                <div className="space-y-2">
                  {misReservas.map((r) => {
                    const saldo = Math.max(0, r.monto_total - r.sena);
                    return (
                      <div key={r.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/70 p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-100">{nombreUnidad(r.unidad_id)}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {fechaLinda(r.check_in)} → {fechaLinda(r.check_out)} · {noches(r.check_in, r.check_out)} {t("noches")}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-md whitespace-nowrap ${
                            r.estado === "pendiente"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                              : r.estado === "cancelada"
                              ? "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                          }`}>
                            {r.estado === "pendiente" ? t("A confirmar") : r.estado === "cancelada" ? t("Cancelada") : t("Confirmada")}
                          </span>
                        </div>
                        {r.monto_total > 0 && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                            {t("Total")} {pesos(r.monto_total)} · {t("Seña")} {pesos(r.sena)}
                            {saldo > 0 && <span className="text-amber-600 dark:text-amber-400"> · {t("Resta")} {pesos(saldo)}</span>}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section>
              <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">{t("Unidades disponibles")}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t("Elegí una unidad y reservá tus fechas.")}</p>
              {unidades.length === 0 ? (
                <p className="text-slate-400 dark:text-slate-500">{t("Todavía no hay unidades publicadas.")}</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {unidades.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setActiva(u)}
                      className="text-left bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-sm hover:shadow-md hover:border-teal-300 dark:hover:border-teal-600/60 transition overflow-hidden group"
                    >
                      <div className="h-28 relative" style={{ background: u.color }}>
                        {u.foto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.foto} alt={u.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-br from-white/25 to-black/10" />
                            <div className="absolute inset-0 grid place-items-center text-white/90">
                              <IconoUnidad tipo={(u.tipo_unidad as TipoUnidad) ?? "Otro"} size={40} />
                            </div>
                          </>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-slate-800 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">{u.nombre}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {[u.grupo_nombre, u.localidad].filter(Boolean).join(" · ")}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          {u.capacidad > 0 && `${u.capacidad} ${t("huéspedes")}`}
                          {u.capacidad > 0 && u.ambientes > 0 && " · "}
                          {u.ambientes > 0 && `${u.ambientes} ${t("amb.")}`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {activa && (
        <FormReservaCliente
          unidad={activa}
          onCerrar={() => setActiva(null)}
          onReservado={async () => { setActiva(null); await cargarReservas(); }}
        />
      )}

      {contratos.length > 0 && <ChatWidgetInquilino contratos={contratos.map((c) => ({ id: c.id, unidad: c.unidad }))} />}
    </div>
  );
}

// ---------- Servicios del contrato (inquilino sube comprobantes) ----------
function ContratoServicios({ contrato }: { contrato: Contrato }) {
  const t = (s: string) => traducir(idiomaDispositivo(), s);
  const [cargados, setCargados] = useState<ServicioCargado[]>([]);
  const [ver, setVer] = useState<ServicioCargado | null>(null);
  const [subiendo, setSubiendo] = useState("");
  const hoy = new Date().toISOString().slice(0, 10);
  const servicios = Array.isArray(contrato.servicios) ? contrato.servicios : [];
  const meses = mesesHasta(contrato.check_in, contrato.check_out, hoy).reverse();

  const recargar = useCallback(async () => {
    const { data } = await supabase.rpc("portal_servicios", { p_reserva: contrato.id });
    setCargados((data as ServicioCargado[]) ?? []);
  }, [contrato.id]);

  useEffect(() => { recargar(); }, [recargar]);

  const compDe = (periodo: string, servicio: string) =>
    cargados.find((c) => c.periodo === periodo && c.servicio === servicio && c.comprobante);

  async function subir(periodo: string, servicio: string, file: File) {
    setSubiendo(`${periodo}|${servicio}`);
    try {
      const img = await subirArchivo(file, "comprobantes");
      const { error } = await supabase.rpc("portal_cargar_servicio", {
        p_reserva: contrato.id, p_periodo: periodo, p_servicio: servicio, p_comprobante: img, p_monto: 0,
      });
      if (!error) await recargar();
    } finally {
      setSubiendo("");
    }
  }

  if (servicios.length === 0) return null;

  const montoActual = aumentoVigente(contrato.aumentos, hoy.slice(0, 7)) ?? contrato.monto_mensual;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/70 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-100">{contrato.unidad}</div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mb-3">{t("Contrato")} {fechaLinda(contrato.check_in)} → {fechaLinda(contrato.check_out)}</div>
        </div>
        {montoActual > 0 && (
          <div className="text-right shrink-0">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{pesos(montoActual)}</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">{t("alquiler / mes")}</div>
          </div>
        )}
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {meses.map((periodo) => (
          <div key={periodo} className="flex items-start gap-2">
            <span className="w-14 shrink-0 text-xs text-slate-500 dark:text-slate-400 pt-0.5">{labelMes(periodo)}</span>
            <div className="flex flex-wrap gap-1.5">
              {servicios.map((s) => {
                const c = compDe(periodo, s);
                const cargando = subiendo === `${periodo}|${s}`;
                if (c) {
                  return (
                    <button type="button" key={s} onClick={() => setVer(c)} className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                      ✓ {s}
                    </button>
                  );
                }
                return (
                  <label key={s} className="text-[11px] px-2 py-0.5 rounded-full border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 cursor-pointer hover:border-teal-400 hover:text-teal-500">
                    {cargando ? t("Subiendo…") : `+ ${s}`}
                    <input type="file" accept="image/*" className="hidden" disabled={!!subiendo} onChange={async (e) => { const f = e.target.files?.[0]; if (f) await subir(periodo, s, f); e.target.value = ""; }} />
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {ver && (
        <Overlay titulo={`${ver.servicio} · ${labelMes(ver.periodo)}`} onCerrar={() => setVer(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {ver.comprobante && <img src={ver.comprobante} alt={t("Comprobante")} className="w-full rounded-lg" />}
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">{t("Cargado el")} {fechaLinda(ver.fecha)}</p>
        </Overlay>
      )}
    </div>
  );
}

// ---------- Cuenta corriente del inquilino (ve sus cuotas y registra pagos) ----------
const COLOR_ESTADO: Record<string, string> = {
  pagada: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  parcial: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  pendiente: "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
  vencida: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
};

function ContratoCuenta({ contrato }: { contrato: Contrato }) {
  const t = (s: string) => traducir(idiomaDispositivo(), s);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [creditos, setCreditos] = useState<Gasto[]>([]);
  const [pagarPeriodo, setPagarPeriodo] = useState("");
  const [monto, setMonto] = useState(0);
  const [medio, setMedio] = useState("Transferencia");
  const [comprobante, setComprobante] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  const hoy = new Date().toISOString().slice(0, 10);

  const recargar = useCallback(async () => {
    const [pg, cr] = await Promise.all([
      supabase.rpc("portal_pagos", { p_reserva: contrato.id }),
      supabase.rpc("portal_creditos", { p_reserva: contrato.id }),
    ]);
    setPagos(((pg.data as { id: string; fecha: string; monto: number; medio: string; periodo: string | null; comprobante: string | null; nota: string }[]) ?? []).map((p) => ({
      id: p.id, reservaId: contrato.id, fecha: p.fecha, monto: Number(p.monto), medio: p.medio,
      periodo: p.periodo ?? undefined, comprobante: p.comprobante ?? undefined, nota: p.nota ?? "",
    })));
    setCreditos(((cr.data as { fecha: string; monto: number }[]) ?? []).map((c, i) => ({
      id: `c${i}`, ambito: "unidad", refId: "x", fecha: c.fecha, categoria: "Reparación", descripcion: "", monto: Number(c.monto), proveedor: "", pagadoPor: "inquilino",
    })));
  }, [contrato.id]);

  useEffect(() => { recargar(); }, [recargar]);

  const rLike: Reserva = {
    id: contrato.id, unidadId: "x", huesped: "", contacto: "", checkIn: contrato.check_in, checkOut: contrato.check_out,
    montoTotal: 0, montoMensual: contrato.monto_mensual, sena: 0, canal: "Directo", tipo: "12 meses", moneda: (contrato.moneda as Reserva["moneda"]) ?? "ARS",
    actualizacion: contrato.actualizacion as Reserva["actualizacion"], indice: contrato.indice as Reserva["indice"], porcentajeManual: contrato.porcentaje_manual,
    horaCheckIn: "", horaCheckOut: "", notas: "", diaVencimiento: contrato.dia_vencimiento ?? undefined, aumentos: contrato.aumentos,
  };
  const cc = cuentaCorriente(rLike, pagos, hoy, creditos);

  function abrirPago(periodo: string, saldo: number) {
    setPagarPeriodo(periodo); setMonto(saldo); setComprobante(undefined);
  }

  async function registrar() {
    if (monto <= 0 || !pagarPeriodo) return;
    setEnviando(true);
    try {
      const { error } = await supabase.rpc("portal_registrar_pago", {
        p_reserva: contrato.id, p_periodo: pagarPeriodo, p_monto: monto, p_medio: medio, p_comprobante: comprobante ?? null,
      });
      if (!error) { setPagarPeriodo(""); await recargar(); }
    } finally { setEnviando(false); }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/70 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-slate-800 dark:text-slate-100">{contrato.unidad}</div>
        <div className={`text-sm font-semibold ${cc.saldoVencido > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
          {cc.saldoVencido > 0 ? `${t("Debés")} ${pesos(cc.saldoVencido)}` : t("Al día ✓")}
        </div>
      </div>

      <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
        {cc.cuotas.map((c) => (
          <div key={c.periodo}>
            <div className="flex items-center gap-2 text-xs py-1">
              <span className="w-14 shrink-0 text-slate-600 dark:text-slate-300">{labelMes(c.periodo)}</span>
              <span className="text-slate-500 dark:text-slate-400 tabular-nums">{pesos(c.monto)}</span>
              {c.credito > 0 && <span className="text-violet-500 dark:text-violet-400 tabular-nums">{t("gasto")} −{pesos(c.credito)}</span>}
              <span className={`ml-auto shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${COLOR_ESTADO[c.estado]}`}>{c.estado}</span>
              {c.saldo > 0 && pagarPeriodo !== c.periodo && (
                <button type="button" onClick={() => abrirPago(c.periodo, c.saldo)} className="shrink-0 text-[11px] text-teal-600 dark:text-teal-400 hover:underline">{t("pagar")}</button>
              )}
            </div>
            {pagarPeriodo === c.periodo && (
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2 my-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{t("Monto")}</span>
                  <input type="number" value={monto} onChange={(e) => setMonto(Number(e.target.value) || 0)} className="input py-1 text-sm flex-1" />
                  <select value={medio} onChange={(e) => setMedio(e.target.value)} className="input py-1 text-sm w-auto">
                    <option>Transferencia</option><option>Mercado Pago</option><option>MODO</option><option>Efectivo</option><option>Otro</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] px-2 py-1 rounded-md bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400 cursor-pointer">
                    {comprobante ? t("Comprobante ✓") : t("Adjuntar comprobante")}
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setComprobante(await subirArchivo(f, "comprobantes")); e.target.value = ""; }} />
                  </label>
                  <button type="button" onClick={() => setPagarPeriodo("")} className="ml-auto text-[11px] text-slate-400 hover:text-slate-600">{t("Cancelar")}</button>
                  <button type="button" disabled={enviando || monto <= 0} className="text-[11px] px-3 py-1 rounded-md bg-teal-600 text-white disabled:opacity-50" onClick={registrar}>
                    {enviando ? "…" : t("Registrar")}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">{t("El dueño verá tu pago y el comprobante para confirmarlo.")}</p>
    </div>
  );
}

// ---------- Documentos del inquilino (todos sus comprobantes de servicios) ----------
type DocInquilino = { key: string; unidad: string; servicio: string; periodo: string; comprobante: string; fecha: string };

function DocumentosInquilino({ contratos }: { contratos: Contrato[] }) {
  const t = (s: string) => traducir(idiomaDispositivo(), s);
  const [docs, setDocs] = useState<DocInquilino[]>([]);
  const [ver, setVer] = useState<DocInquilino | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const all: DocInquilino[] = [];
      for (const c of contratos) {
        const { data } = await supabase.rpc("portal_servicios", { p_reserva: c.id });
        for (const s of (data as ServicioCargado[]) ?? []) {
          if (s.comprobante) all.push({ key: `${c.id}-${s.periodo}-${s.servicio}`, unidad: c.unidad, servicio: s.servicio, periodo: s.periodo, comprobante: s.comprobante, fecha: s.fecha });
        }
      }
      all.sort((a, b) => b.fecha.localeCompare(a.fecha));
      if (vivo) setDocs(all);
    })();
    return () => { vivo = false; };
  }, [contratos]);

  if (docs.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">{t("Documentos")}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {docs.map((d) => (
          <button key={d.key} onClick={() => setVer(d)} className="text-left bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/70 shadow-sm hover:border-teal-400 transition overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.comprobante} alt={d.servicio} className="w-full h-24 object-cover bg-slate-100 dark:bg-slate-900" />
            <div className="p-2">
              <div className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{d.servicio} · {labelMes(d.periodo)}</div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{d.unidad}</div>
            </div>
          </button>
        ))}
      </div>
      {ver && (
        <Overlay titulo={`${ver.servicio} · ${labelMes(ver.periodo)}`} onCerrar={() => setVer(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ver.comprobante} alt={ver.servicio} className="w-full rounded-lg" />
        </Overlay>
      )}
    </section>
  );
}

// ---------- Modal de reserva del cliente ----------
function FormReservaCliente({
  unidad,
  onCerrar,
  onReservado,
}: {
  unidad: UnidadPortal;
  onCerrar: () => void;
  onReservado: () => void;
}) {
  const t = (s: string) => traducir(idiomaDispositivo(), s);
  const [ocupacion, setOcupacion] = useState<Ocupacion[]>([]);
  const [cargandoOc, setCargandoOc] = useState(true);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [huesped, setHuesped] = useState("");
  const [contacto, setContacto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  // Paso 2: subir comprobante de seña sobre la reserva recién creada.
  const [reservaId, setReservaId] = useState("");
  const [montoSena, setMontoSena] = useState("");
  const [medio, setMedio] = useState("Transferencia");
  const [comprobante, setComprobante] = useState<string | undefined>();
  const [subiendo, setSubiendo] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data } = await supabase.rpc("portal_ocupacion", { p_unidad: unidad.id });
      if (!vivo) return;
      setOcupacion((data as Ocupacion[]) ?? []);
      setCargandoOc(false);
    })();
    return () => { vivo = false; };
  }, [unidad.id]);

  const hoy = new Date().toISOString().slice(0, 10);
  const nn = noches(checkIn, checkOut);
  const fechasOk = Boolean(checkIn && checkOut && checkIn < checkOut && checkIn >= hoy);
  const choca = fechasOk && ocupacion.some((o) => solapan(checkIn, checkOut, o.check_in, o.check_out));

  async function reservar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!fechasOk) { setError(t("Revisá las fechas: la salida debe ser posterior a la entrada.")); return; }
    if (choca) { setError(t("Esas fechas no están disponibles.")); return; }
    setEnviando(true);
    const { data, error } = await supabase.rpc("portal_reservar", {
      p_unidad: unidad.id,
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_huesped: huesped.trim() || "Cliente",
      p_contacto: contacto.trim(),
      p_monto: 0,
      p_moneda: "ARS",
    });
    setEnviando(false);
    if (error) { setError(error.message || t("No se pudo crear la reserva.")); return; }
    setReservaId(data as string);
  }

  async function elegirComprobante(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setComprobante(await subirArchivo(f, "comprobantes"));
    } catch {
      setError(t("No pudimos procesar la imagen."));
    }
  }

  async function enviarSena(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubiendo(true);
    const { error } = await supabase.rpc("portal_pago_sena", {
      p_reserva: reservaId,
      p_monto: Number(montoSena) || 0,
      p_medio: medio,
      p_comprobante: comprobante ?? null,
    });
    setSubiendo(false);
    if (error) { setError(error.message || t("No se pudo registrar la seña.")); return; }
    setListo(true);
  }

  // --- Render ---
  if (listo) {
    return (
      <Overlay titulo={t("¡Reserva confirmada!")} onCerrar={onReservado}>
        <div className="text-center py-4 space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/15 grid place-items-center text-emerald-600 dark:text-emerald-400 text-3xl">✓</div>
          <p className="text-slate-700 dark:text-slate-200">
            {t("Reservaste")} <span className="font-semibold">{unidad.nombre}</span> {t("del")} {fechaLinda(checkIn)} {t("al")} {fechaLinda(checkOut)}.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("Recibimos tu comprobante. El propietario lo revisará y se pondrá en contacto.")}</p>
          <button onClick={onReservado} className="btn-primario w-full">{t("Listo")}</button>
        </div>
      </Overlay>
    );
  }

  if (reservaId) {
    return (
      <Overlay titulo={t("Cargá la seña")} onCerrar={onReservado}>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {t("Tu reserva quedó registrada. Subí el comprobante de la seña para confirmarla.")}
        </p>
        <form onSubmit={enviarSena} className="space-y-3">
          <Campo label={t("Monto de la seña")}>
            <input type="number" inputMode="decimal" value={montoSena} onChange={(e) => setMontoSena(e.target.value)} className="input text-right" placeholder="0" />
          </Campo>
          <Campo label={t("¿Cómo pagaste?")}>
            <select value={medio} onChange={(e) => setMedio(e.target.value)} className="input">
              <option>Transferencia</option>
              <option>Mercado Pago</option>
              <option>MODO</option>
              <option>Efectivo</option>
              <option>Otro</option>
            </select>
          </Campo>
          <Campo label={t("Comprobante (foto o captura)")}>
            <input type="file" accept="image/*" onChange={elegirComprobante} className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-teal-50 file:text-teal-700 dark:file:bg-teal-500/15 dark:file:text-teal-400" />
          </Campo>
          {comprobante && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={comprobante} alt={t("Comprobante")} className="rounded-lg max-h-40 mx-auto ring-1 ring-black/5" />
          )}
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onReservado} className="btn-secundario flex-1">{t("Más tarde")}</button>
            <button type="submit" disabled={subiendo} className="btn-primario flex-1 disabled:opacity-50">
              {subiendo ? t("Enviando…") : t("Enviar seña")}
            </button>
          </div>
        </form>
      </Overlay>
    );
  }

  return (
    <Overlay titulo={`${t("Reservar")} ${unidad.nombre}`} onCerrar={onCerrar}>
      <form onSubmit={reservar} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Campo label={t("Entrada")}>
            <input type="date" min={hoy} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="input" required />
          </Campo>
          <Campo label={t("Salida")}>
            <input type="date" min={checkIn || hoy} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="input" required />
          </Campo>
        </div>

        {nn > 0 && !choca && fechasOk && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("Disponible")} · {nn} {nn === 1 ? t("noche") : t("noches")}.</p>
        )}
        {choca && <p className="text-sm text-rose-600 dark:text-rose-400">{t("Esas fechas no están disponibles. Probá con otras.")}</p>}

        <Campo label={t("Tu nombre")}>
          <input value={huesped} onChange={(e) => setHuesped(e.target.value)} className="input" placeholder={t("Nombre y apellido")} required />
        </Campo>
        <Campo label={t("Contacto (teléfono o email)")}>
          <input value={contacto} onChange={(e) => setContacto(e.target.value)} className="input" placeholder={t("WhatsApp, teléfono…")} />
        </Campo>

        {cargandoOc && <p className="text-xs text-slate-400 dark:text-slate-500">{t("Cargando disponibilidad…")}</p>}
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onCerrar} className="btn-secundario flex-1">{t("Cancelar")}</button>
          <button type="submit" disabled={enviando || !fechasOk || choca} className="btn-primario flex-1 disabled:opacity-50">
            {enviando ? t("Reservando…") : t("Reservar")}
          </button>
        </div>
      </form>
    </Overlay>
  );
}
