"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { Grupo, Unidad, Reserva, Gasto, GastoProgramado, Colaborador, Pago, MedioPago, Configuracion, ServicioComprobante, Proveedor, Presupuesto, Mensaje, Notificacion, AvisoSistema, Suscripcion, Ingreso, Bloqueo } from "./types";
import { COLORES_UNIDAD, MEDIOS_PAGO_DEFAULT, CONFIG_DEFAULT } from "./types";
import { solapan, hoyISO } from "./fechas";
import { generarGastos } from "./programados";
import { supabase } from "./supabase";

function nuevoId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// ---------- Mappers DB (snake_case) <-> App (camelCase) ----------
const grupoDe = (r: any): Grupo => ({ id: r.id, nombre: r.nombre, ambiente: r.ambiente, color: r.color, foto: r.foto ?? undefined });
const grupoDb = (g: Grupo) => ({ id: g.id, nombre: g.nombre, ambiente: g.ambiente, color: g.color, foto: g.foto ?? null });

const unidadDe = (r: any): Unidad => ({
  id: r.id, nombre: r.nombre, grupoId: r.grupo_id ?? "", tipoUnidad: r.tipo_unidad, color: r.color,
  foto: r.foto ?? undefined, direccion: r.direccion ?? "", localidad: r.localidad ?? "",
  ambientes: Number(r.ambientes), capacidad: Number(r.capacidad), cochera: r.cochera ?? false, aptoCamioneta: r.apto_camioneta ?? false,
  precioDia: r.precio_dia != null ? Number(r.precio_dia) : undefined, precioDiaCochera: r.precio_dia_cochera != null ? Number(r.precio_dia_cochera) : undefined,
  ubicacionCochera: r.ubicacion_cochera ?? undefined,
  icals: r.icals ?? [], notas: r.notas ?? "",
});
const unidadDb = (u: Unidad) => ({
  id: u.id, nombre: u.nombre, grupo_id: u.grupoId || null, tipo_unidad: u.tipoUnidad, color: u.color,
  foto: u.foto ?? null, direccion: u.direccion, localidad: u.localidad, ambientes: u.ambientes,
  capacidad: u.capacidad, cochera: u.cochera ?? false, apto_camioneta: u.aptoCamioneta ?? false,
  precio_dia: u.precioDia ?? null, precio_dia_cochera: u.precioDiaCochera ?? null,
  ubicacion_cochera: u.ubicacionCochera ?? null,
  icals: u.icals, notas: u.notas,
});

const reservaDe = (r: any): Reserva => ({
  id: r.id, unidadId: r.unidad_id, huesped: r.huesped, contacto: r.contacto ?? "",
  checkIn: r.check_in, checkOut: r.check_out, montoTotal: Number(r.monto_total), montoMensual: Number(r.monto_mensual), conCochera: r.con_cochera ?? false,
  sena: Number(r.sena), canal: r.canal, tipo: r.tipo, moneda: r.moneda, actualizacion: r.actualizacion,
  indice: r.indice, porcentajeManual: Number(r.porcentaje_manual),
  horaCheckIn: r.hora_check_in ?? "15:00", horaCheckOut: r.hora_check_out ?? "11:00", notas: r.notas ?? "",
  estado: r.estado ?? "confirmada", clienteId: r.cliente_id ?? undefined,
  vencimiento: r.vencimiento ?? undefined, diaVencimiento: r.dia_vencimiento ?? undefined,
  serviciosInquilino: r.servicios_inquilino ?? [], emailInquilino: r.email_inquilino ?? undefined,
  aumentos: r.aumentos ?? [],
});
const reservaDb = (r: Reserva) => ({
  id: r.id, unidad_id: r.unidadId, huesped: r.huesped, contacto: r.contacto, check_in: r.checkIn, check_out: r.checkOut,
  monto_total: r.montoTotal, monto_mensual: r.montoMensual, con_cochera: r.conCochera ?? false, sena: r.sena, canal: r.canal, tipo: r.tipo,
  moneda: r.moneda, actualizacion: r.actualizacion, indice: r.indice, porcentaje_manual: r.porcentajeManual,
  hora_check_in: r.horaCheckIn, hora_check_out: r.horaCheckOut, notas: r.notas,
  estado: r.estado ?? "confirmada", cliente_id: r.clienteId ?? null,
  vencimiento: r.vencimiento ?? null, dia_vencimiento: r.diaVencimiento ?? null,
  servicios_inquilino: r.serviciosInquilino ?? [], email_inquilino: r.emailInquilino ?? null,
  aumentos: r.aumentos ?? [],
});

const servCompDe = (r: any): ServicioComprobante => ({
  id: r.id, reservaId: r.reserva_id, periodo: r.periodo, servicio: r.servicio,
  comprobante: r.comprobante ?? undefined, monto: Number(r.monto), fecha: r.fecha,
});
const servCompDb = (s: ServicioComprobante) => ({
  id: s.id, reserva_id: s.reservaId, periodo: s.periodo, servicio: s.servicio,
  comprobante: s.comprobante ?? null, monto: s.monto, fecha: s.fecha,
});

const configDe = (r: any): Configuracion => ({
  pais: r.pais ?? "AR", monedaDefault: r.moneda_default ?? "ARS",
  ajusteInflacion: r.ajuste_inflacion ?? true, diaVencimiento: r.dia_vencimiento ?? undefined,
});
const configDb = (c: Configuracion) => ({
  pais: c.pais, moneda_default: c.monedaDefault, ajuste_inflacion: c.ajusteInflacion,
  dia_vencimiento: c.diaVencimiento ?? null,
});

const pagoDe = (r: any): Pago => ({
  id: r.id, reservaId: r.reserva_id, fecha: r.fecha, monto: Number(r.monto), medio: r.medio,
  comprobante: r.comprobante ?? undefined, nota: r.nota ?? "", periodo: r.periodo ?? undefined,
});
const pagoDb = (p: Pago) => ({
  id: p.id, reserva_id: p.reservaId, fecha: p.fecha, monto: p.monto, medio: p.medio,
  comprobante: p.comprobante ?? null, nota: p.nota, periodo: p.periodo ?? null,
});

const medioDe = (r: any): MedioPago => ({ id: r.id, nombre: r.nombre, activo: r.activo ?? true });
const medioDb = (m: MedioPago) => ({ id: m.id, nombre: m.nombre, activo: m.activo });

const gastoDe = (r: any): Gasto => ({
  id: r.id, ambito: r.ambito, refId: r.ref_id, fecha: r.fecha, categoria: r.categoria, descripcion: r.descripcion ?? "",
  monto: Number(r.monto), proveedor: r.proveedor ?? "", reparto: r.reparto ?? undefined, claveOrigen: r.clave_origen ?? undefined,
  pagadoPor: r.pagado_por === "inquilino" ? "inquilino" : "dueno", comprobante: r.comprobante ?? undefined,
  proveedorId: r.proveedor_id ?? undefined, presupuestoId: r.presupuesto_id ?? undefined,
  rating: r.rating ?? undefined, ratingNota: r.rating_nota ?? undefined,
});
const gastoDb = (g: Gasto) => ({
  id: g.id, ambito: g.ambito, ref_id: g.refId, fecha: g.fecha, categoria: g.categoria, descripcion: g.descripcion,
  monto: g.monto, proveedor: g.proveedor, reparto: g.reparto ?? null, clave_origen: g.claveOrigen ?? null,
  pagado_por: g.pagadoPor ?? "dueno", comprobante: g.comprobante ?? null,
  proveedor_id: g.proveedorId ?? null, presupuesto_id: g.presupuestoId ?? null,
  rating: g.rating ?? null, rating_nota: g.ratingNota ?? null,
});

const ingresoDe = (r: any): Ingreso => ({
  id: r.id, ambito: r.ambito, refId: r.ref_id, fecha: r.fecha, categoria: r.categoria,
  descripcion: r.descripcion ?? "", monto: Number(r.monto), reparto: r.reparto ?? undefined,
});
const ingresoDb = (i: Ingreso) => ({
  id: i.id, ambito: i.ambito, ref_id: i.refId, fecha: i.fecha, categoria: i.categoria,
  descripcion: i.descripcion, monto: i.monto, reparto: i.reparto ?? null,
});

const bloqueoDe = (r: any): Bloqueo => ({
  id: r.id, unidadId: r.unidad_id, plataforma: r.plataforma ?? "Otro", desde: r.desde, hasta: r.hasta,
});

const notifDe = (r: any): Notificacion => ({
  id: r.id, tipo: r.tipo, titulo: r.titulo, cuerpo: r.cuerpo ?? "", reservaId: r.reserva_id ?? undefined, leida: r.leida ?? false, createdAt: r.created_at,
});
const suscDe = (r: any): Suscripcion => ({
  estado: r.estado ?? "trial", trialFin: r.trial_fin, periodoFin: r.periodo_fin ?? undefined, precio: r.precio ?? undefined,
});

const avisoDe = (r: any): AvisoSistema => ({
  id: r.id, tipo: r.tipo, titulo: r.titulo, cuerpo: r.cuerpo ?? "", activo: r.activo ?? true, createdAt: r.created_at,
});

const mensajeDe = (r: any): Mensaje => ({
  id: r.id, reservaId: r.reserva_id, autor: r.autor === "inquilino" ? "inquilino" : "dueno", texto: r.texto, createdAt: r.created_at,
  leidoDueno: r.leido_dueno ?? false,
});

const proveedorDe = (r: any): Proveedor => ({
  id: r.id, nombre: r.nombre, rubro: r.rubro ?? "", telefono: r.telefono ?? "", email: r.email ?? "",
  notas: r.notas ?? "", visibleInquilino: r.visible_inquilino ?? true,
});
const proveedorDb = (p: Proveedor) => ({
  id: p.id, nombre: p.nombre, rubro: p.rubro, telefono: p.telefono, email: p.email,
  notas: p.notas, visible_inquilino: p.visibleInquilino,
});

const presupuestoDe = (r: any): Presupuesto => ({
  id: r.id, proveedorId: r.proveedor_id ?? "", ambito: r.ambito ?? "unidad", refId: r.ref_id ?? "",
  descripcion: r.descripcion ?? "", monto: Number(r.monto), fecha: r.fecha, estado: r.estado ?? "pendiente",
  comprobante: r.comprobante ?? undefined, nota: r.nota ?? "",
});
const presupuestoDb = (p: Presupuesto) => ({
  id: p.id, proveedor_id: p.proveedorId || null, ambito: p.ambito, ref_id: p.refId,
  descripcion: p.descripcion, monto: p.monto, fecha: p.fecha, estado: p.estado,
  comprobante: p.comprobante ?? null, nota: p.nota,
});

const progDe = (r: any): GastoProgramado => ({
  id: r.id, ambito: r.ambito, refId: r.ref_id, categoria: r.categoria, descripcion: r.descripcion ?? "",
  monto: Number(r.monto), proveedor: r.proveedor ?? "", frecuencia: r.frecuencia, fechaInicio: r.fecha_inicio, activo: r.activo,
});
const progDb = (p: GastoProgramado) => ({
  id: p.id, ambito: p.ambito, ref_id: p.refId, categoria: p.categoria, descripcion: p.descripcion, monto: p.monto,
  proveedor: p.proveedor, frecuencia: p.frecuencia, fecha_inicio: p.fechaInicio, activo: p.activo,
});

const colabDe = (r: any): Colaborador => ({ id: r.id, nombre: r.nombre, email: r.email ?? "", rol: r.rol, gruposIds: r.grupos_ids ?? [], permisos: r.permisos ?? [] });
const colabDb = (c: Colaborador) => ({ id: c.id, nombre: c.nombre, email: c.email, rol: c.rol, grupos_ids: c.gruposIds, permisos: c.permisos ?? [] });
/* eslint-enable @typescript-eslint/no-explicit-any */

interface StoreCtx {
  cargado: boolean;
  vacio: boolean;
  seedCuenta: () => Promise<void>;
  vaciarCuenta: () => Promise<void>;
  grupos: Grupo[];
  getGrupo: (id: string) => Grupo | undefined;
  nombreGrupo: (id: string) => string;
  addGrupo: (nombre: string) => string;
  updateGrupo: (id: string, cambios: Partial<Grupo>) => void;
  deleteGrupo: (id: string) => void;
  unidades: Unidad[];
  reservas: Reserva[];
  getUnidad: (id: string) => Unidad | undefined;
  reservasDe: (unidadId: string) => Reserva[];
  addUnidad: (u: Omit<Unidad, "id">) => string;
  updateUnidad: (id: string, cambios: Partial<Unidad>) => void;
  deleteUnidad: (id: string) => void;
  addReserva: (r: Omit<Reserva, "id">) => string;
  updateReserva: (id: string, cambios: Partial<Reserva>) => void;
  deleteReserva: (id: string) => void;
  conflicto: (unidadId: string, checkIn: string, checkOut: string, excluirId?: string) => Reserva | null;
  bloqueos: Bloqueo[];
  bloqueosDe: (unidadId: string) => Bloqueo[];
  sincronizarIcal: () => Promise<{ ok?: boolean; bloqueos?: number }>;
  pagos: Pago[];
  pagosDe: (reservaId: string) => Pago[];
  saldoDe: (reserva: Reserva) => number; // montoTotal − seña − pagos
  addPago: (p: Omit<Pago, "id">) => string;
  deletePago: (id: string) => void;
  serviciosComprobantes: ServicioComprobante[];
  serviciosDe: (reservaId: string) => ServicioComprobante[];
  guardarServicioComprobante: (s: Omit<ServicioComprobante, "id">) => void;
  deleteServicioComprobante: (reservaId: string, periodo: string, servicio: string) => void;
  mediosPago: MedioPago[];
  addMedioPago: (nombre: string) => string;
  updateMedioPago: (id: string, cambios: Partial<MedioPago>) => void;
  deleteMedioPago: (id: string) => void;
  gastos: Gasto[];
  addGasto: (g: Omit<Gasto, "id">) => string;
  updateGasto: (id: string, cambios: Partial<Gasto>) => void;
  deleteGasto: (id: string) => void;
  gastoDeUnidad: (unidadId: string) => number;
  ingresos: Ingreso[];
  addIngreso: (i: Omit<Ingreso, "id">) => string;
  updateIngreso: (id: string, cambios: Partial<Ingreso>) => void;
  deleteIngreso: (id: string) => void;
  proveedores: Proveedor[];
  addProveedor: (p: Omit<Proveedor, "id">) => string;
  updateProveedor: (id: string, cambios: Partial<Proveedor>) => void;
  deleteProveedor: (id: string) => void;
  ratingProveedor: (proveedorId: string) => { promedio: number; cantidad: number };
  trabajosDe: (proveedorId: string) => Gasto[];
  presupuestos: Presupuesto[];
  presupuestosDe: (proveedorId: string) => Presupuesto[];
  addPresupuesto: (p: Omit<Presupuesto, "id">) => string;
  updatePresupuesto: (id: string, cambios: Partial<Presupuesto>) => void;
  deletePresupuesto: (id: string) => void;
  mensajes: Mensaje[];
  mensajesDe: (reservaId: string) => Mensaje[];
  enviarMensaje: (reservaId: string, texto: string) => void;
  marcarLeidos: (reservaId: string) => void;
  mensajesNoLeidos: number;
  gastosProgramados: GastoProgramado[];
  addProgramado: (p: Omit<GastoProgramado, "id">) => string;
  updateProgramado: (id: string, cambios: Partial<GastoProgramado>) => void;
  deleteProgramado: (id: string) => void;
  colaboradores: Colaborador[];
  addColaborador: (c: Omit<Colaborador, "id">) => string;
  updateColaborador: (id: string, cambios: Partial<Colaborador>) => void;
  deleteColaborador: (id: string) => void;
  config: Configuracion;
  updateConfig: (cambios: Partial<Configuracion>) => void;
  rol: "dueno" | "colaborador" | "cliente" | "nuevo" | null;
  permisosColab: string[];
  puedeEditar: (modulo: string) => boolean;
  puedeVerMontos: boolean;
  suscripcion: Suscripcion | null;
  accesoActivo: boolean;
  diasTrial: number;
  notificaciones: Notificacion[];
  notifNoLeidas: number;
  marcarNotifLeidas: () => void;
  avisos: AvisoSistema[];
  esAdmin: boolean;
  crearAviso: (a: Omit<AvisoSistema, "id" | "createdAt">) => void;
  toggleAviso: (id: string, activo: boolean) => void;
  eliminarAviso: (id: string) => void;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [cargado, setCargado] = useState(false);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [gastosProgramados, setGastosProgramados] = useState<GastoProgramado[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [mediosPago, setMediosPago] = useState<MedioPago[]>([]);
  const [serviciosComprobantes, setServiciosComprobantes] = useState<ServicioComprobante[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [config, setConfig] = useState<Configuracion>(CONFIG_DEFAULT);
  const [rol, setRol] = useState<StoreCtx["rol"]>(null);
  const [permisosColab, setPermisosColab] = useState<string[]>([]);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [avisos, setAvisos] = useState<AvisoSistema[]>([]);
  const [esAdmin, setEsAdmin] = useState(false);
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null);

  // Refs con el último estado, para materializar sin closures viejos.
  const refs = useRef({ gastos, gastosProgramados, reservas, unidades, ingresos });
  refs.current = { gastos, gastosProgramados, reservas, unidades, ingresos };
  // Evita cargar dos veces para el mismo usuario (incluye el doble-mount de dev).
  const cargadoPara = useRef<string | null>(null);

  // Sesión: seguimos al usuario de Supabase.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Resuelve el rol (dueño/colaborador/cliente) y crea la cuenta si es nueva.
  useEffect(() => {
    if (!userId) { setRol(null); setPermisosColab([]); return; }
    let activo = true;
    (async () => {
      const { data, error } = await supabase.rpc("mi_contexto");
      if (!activo) return;
      if (error) { setRol("dueno"); return; } // migración aún no corrida → no bloquear al dueño
      const row = Array.isArray(data) ? (data[0] as { rol: string; permisos: unknown } | undefined) : null;
      if (row) {
        // Si ya es cliente y abrió el link de OTRO dueño, lo vinculamos también
        // (y ese dueño queda activo). Se hace antes de fijar el rol para que el
        // portal cargue con el dueño recién elegido.
        if (row.rol === "cliente") {
          let ref: string | null = null;
          try { ref = localStorage.getItem("alquileres.ref"); } catch {}
          if (ref) {
            try { localStorage.removeItem("alquileres.ref"); } catch {}
            await supabase.rpc("registrarse_cliente", { p_slug: ref });
          }
        }
        if (!activo) return;
        setRol(row.rol as StoreCtx["rol"]);
        setPermisosColab(Array.isArray(row.permisos) ? (row.permisos as string[]) : []);
        return;
      }
      // Usuario nuevo (sin negocio ni vínculo): lo creamos.
      let ref: string | null = null;
      try { ref = localStorage.getItem("alquileres.ref"); } catch {}
      if (ref) {
        await supabase.rpc("registrarse_cliente", { p_slug: ref });
        try { localStorage.removeItem("alquileres.ref"); } catch {}
        if (activo) setRol("cliente");
      } else {
        await supabase.rpc("registrarse_dueno");
        if (activo) setRol("dueno");
      }
    })();
    return () => { activo = false; };
  }, [userId]);

  const cargarTodo = useCallback(async () => {
    setCargado(false);
    const [g, u, r, ga, pr, co, pa, me, cf, sc, pv, ps, mn, nt, av, ad, su, in_, bl] = await Promise.all([
      supabase.from("grupos").select("*"),
      supabase.from("unidades").select("*"),
      supabase.from("reservas").select("*"),
      supabase.from("gastos").select("*"),
      supabase.from("gastos_programados").select("*"),
      supabase.from("colaboradores").select("*"),
      supabase.from("pagos").select("*"),
      supabase.from("medios_pago").select("*"),
      supabase.from("configuracion").select("*").maybeSingle(),
      supabase.from("comprobantes_servicio").select("*"),
      supabase.from("proveedores").select("*"),
      supabase.from("presupuestos").select("*"),
      supabase.from("mensajes").select("*"),
      supabase.from("notificaciones").select("*").eq("para", "dueno").order("created_at", { ascending: false }).limit(100),
      supabase.from("avisos_sistema").select("*").eq("activo", true).order("created_at", { ascending: false }),
      supabase.rpc("es_admin_sistema"),
      supabase.from("suscripciones").select("*").maybeSingle(),
      supabase.from("ingresos").select("*"),
      supabase.from("bloqueos").select("*"),
    ]);
    const gr = (g.data ?? []).map(grupoDe);
    const un = (u.data ?? []).map(unidadDe);
    const re = (r.data ?? []).map(reservaDe);
    let gas = (ga.data ?? []).map(gastoDe);
    const prog = (pr.data ?? []).map(progDe);
    const col = (co.data ?? []).map(colabDe);
    const pag = (pa.data ?? []).map(pagoDe);
    let med = (me.data ?? []).map(medioDe);

    // Si la cuenta no tiene medios de pago, sembramos los por defecto.
    if (med.length === 0) {
      med = MEDIOS_PAGO_DEFAULT.map((nombre) => ({ id: nuevoId(), nombre, activo: true }));
      await supabase.from("medios_pago").insert(med.map(medioDb));
    }

    // Materialización: generar gastos de los programados que falten e insertarlos.
    const nuevos = generarGastos(prog, re, un, gas, hoyISO(), nuevoId);
    if (nuevos.length) {
      gas = [...gas, ...nuevos];
      await supabase.from("gastos").insert(nuevos.map(gastoDb));
    }

    setGrupos(gr); setUnidades(un); setReservas(re); setGastos(gas);
    setGastosProgramados(prog); setColaboradores(col); setPagos(pag); setMediosPago(med);
    setServiciosComprobantes((sc.data ?? []).map(servCompDe));
    setProveedores((pv.data ?? []).map(proveedorDe));
    setPresupuestos((ps.data ?? []).map(presupuestoDe));
    setMensajes((mn.data ?? []).map(mensajeDe));
    setNotificaciones((nt.data ?? []).map(notifDe));
    setAvisos((av.data ?? []).map(avisoDe));
    setEsAdmin(ad.data === true);
    setSuscripcion(su.data ? suscDe(su.data) : null);
    setIngresos((in_.data ?? []).map(ingresoDe));
    setBloqueos((bl.data ?? []).map(bloqueoDe));
    setConfig(cf.data ? configDe(cf.data) : CONFIG_DEFAULT);
    setCargado(true);
  }, []);

  useEffect(() => {
    if (!userId) {
      cargadoPara.current = null;
      setGrupos([]); setUnidades([]); setReservas([]); setGastos([]); setGastosProgramados([]); setColaboradores([]); setPagos([]); setMediosPago([]);
      setServiciosComprobantes([]); setProveedores([]); setPresupuestos([]); setMensajes([]);
      setNotificaciones([]); setAvisos([]); setEsAdmin(false); setSuscripcion(null);
      setIngresos([]); setBloqueos([]);
      setConfig(CONFIG_DEFAULT);
      setCargado(false);
      return;
    }
    if (cargadoPara.current === userId) return; // ya cargado para este usuario
    cargadoPara.current = userId;
    cargarTodo();
  }, [userId, cargarTodo]);

  // Materializa nuevos gastos a partir de los datos actuales (tras agregar reserva/programado).
  const materializar = useCallback(async () => {
    const { gastos: gA, gastosProgramados: pA, reservas: rA, unidades: uA } = refs.current;
    const nuevos = generarGastos(pA, rA, uA, gA, hoyISO(), nuevoId);
    if (!nuevos.length) return;
    setGastos((prev) => {
      const claves = new Set(prev.map((x) => x.claveOrigen).filter(Boolean));
      const aAgregar = nuevos.filter((n) => !claves.has(n.claveOrigen));
      return aAgregar.length ? [...prev, ...aAgregar] : prev;
    });
    await supabase.from("gastos").insert(nuevos.map(gastoDb));
  }, []);

  // ---------- Derivados ----------
  const getGrupo = useCallback((id: string) => grupos.find((g) => g.id === id), [grupos]);
  const nombreGrupo = useCallback((id: string) => grupos.find((g) => g.id === id)?.nombre ?? "Sin grupo", [grupos]);
  const getUnidad = useCallback((id: string) => unidades.find((u) => u.id === id), [unidades]);
  const reservasDe = useCallback(
    (unidadId: string) => reservas.filter((r) => r.unidadId === unidadId).sort((a, b) => a.checkIn.localeCompare(b.checkIn)),
    [reservas]
  );
  const conflicto = useCallback(
    (unidadId: string, checkIn: string, checkOut: string, excluirId?: string) => {
      const r = reservas.find((r) => r.unidadId === unidadId && r.id !== excluirId && solapan(checkIn, checkOut, r.checkIn, r.checkOut));
      if (r) return r;
      // También chocamos contra los bloqueos importados (Airbnb/Booking).
      const b = bloqueos.find((b) => b.unidadId === unidadId && solapan(checkIn, checkOut, b.desde, b.hasta));
      if (b) return { id: "bloqueo-" + b.id, unidadId, huesped: `Bloqueo ${b.plataforma}`, checkIn: b.desde, checkOut: b.hasta, canal: b.plataforma } as unknown as Reserva;
      return null;
    },
    [reservas, bloqueos]
  );
  const bloqueosDe = useCallback((unidadId: string) => bloqueos.filter((b) => b.unidadId === unidadId), [bloqueos]);
  const sincronizarIcal = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false as const };
    const res = await fetch("/api/ical/sync", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } });
    const j = await res.json().catch(() => ({}));
    await cargarTodo();
    return j as { ok?: boolean; bloqueos?: number };
  }, [cargarTodo]);

  // Tiempo real: la campanita y el chat se actualizan solos (sin recargar).
  useEffect(() => {
    if (!userId || !(rol === "dueno" || rol === "colaborador")) return;
    const canal = supabase
      .channel("rt-" + userId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificaciones" }, (payload) => {
        const row = payload.new as { para?: string };
        if (row.para !== "dueno") return; // las del inquilino no van a esta campanita
        const n = notifDe(payload.new);
        setNotificaciones((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes" }, (payload) => {
        const m = mensajeDe(payload.new);
        setMensajes((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [userId, rol]);

  // Sincronización iCal en segundo plano al entrar (dueño con calendarios conectados),
  // como máximo cada 3 h. No bloquea la UI: al terminar solo refresca los bloqueos.
  useEffect(() => {
    if (!cargado || rol !== "dueno") return;
    const us = refs.current.unidades;
    if (!us.some((u) => Array.isArray(u.icals) && u.icals.length > 0)) return;
    const key = `tampu.icalSync.${userId ?? ""}`;
    let ultimo = 0;
    try { ultimo = Number(localStorage.getItem(key) || 0); } catch {}
    if (Date.now() - ultimo < 3 * 60 * 60 * 1000) return; // ya está fresco
    try { localStorage.setItem(key, String(Date.now())); } catch {}
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const res = await fetch("/api/ical/sync", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } });
        if (!res.ok) return;
        const { data } = await supabase.from("bloqueos").select("*");
        setBloqueos((data ?? []).map(bloqueoDe));
      } catch {}
    })();
  }, [cargado, rol, userId]);
  const gastoDeUnidad = useCallback(
    (unidadId: string) => {
      const nUnidades = Math.max(1, unidades.length);
      let total = 0;
      for (const g of gastos) {
        if (g.ambito === "unidad" && g.refId === unidadId) total += g.monto;
        else if (g.ambito === "grupo" && g.reparto) {
          const it = g.reparto.find((r) => r.unidadId === unidadId);
          if (it) total += (g.monto * it.porcentaje) / 100;
        } else if (g.ambito === "general") {
          total += g.monto / nUnidades;
        }
      }
      return Math.round(total);
    },
    [gastos, unidades.length]
  );

  // ---------- Grupos ----------
  const addGrupo = useCallback((nombre: string) => {
    const limpio = nombre.trim();
    const existente = grupos.find((g) => g.nombre.toLowerCase() === limpio.toLowerCase());
    if (existente) return existente.id;
    const g: Grupo = { id: nuevoId(), nombre: limpio, ambiente: "Otro", color: COLORES_UNIDAD[0] };
    setGrupos((prev) => [...prev, g]);
    supabase.from("grupos").insert(grupoDb(g)).then(({ error }) => error && console.error(error));
    return g.id;
  }, [grupos]);
  const updateGrupo = useCallback((id: string, cambios: Partial<Grupo>) => {
    setGrupos((prev) => prev.map((g) => (g.id === id ? { ...g, ...cambios } : g)));
    supabase.from("grupos").update(cambios).eq("id", id).then(({ error }) => error && console.error(error));
  }, []);
  const deleteGrupo = useCallback((id: string) => {
    setGrupos((prev) => prev.filter((g) => g.id !== id));
    setUnidades((prev) => prev.map((u) => (u.grupoId === id ? { ...u, grupoId: "" } : u)));
    supabase.from("unidades").update({ grupo_id: null }).eq("grupo_id", id).then(() => {});
    supabase.from("grupos").delete().eq("id", id).then(() => {});
  }, []);

  // ---------- Unidades ----------
  const addUnidad = useCallback((u: Omit<Unidad, "id">) => {
    const nueva: Unidad = { ...u, id: nuevoId() };
    setUnidades((prev) => [...prev, nueva]);
    supabase.from("unidades").insert(unidadDb(nueva)).then(({ error }) => error && console.error(error));
    return nueva.id;
  }, []);
  const updateUnidad = useCallback((id: string, cambios: Partial<Unidad>) => {
    setUnidades((prev) => prev.map((u) => (u.id === id ? { ...u, ...cambios } : u)));
    const db: Record<string, unknown> = {};
    if ("nombre" in cambios) db.nombre = cambios.nombre;
    if ("grupoId" in cambios) db.grupo_id = cambios.grupoId || null;
    if ("tipoUnidad" in cambios) db.tipo_unidad = cambios.tipoUnidad;
    if ("color" in cambios) db.color = cambios.color;
    if ("foto" in cambios) db.foto = cambios.foto ?? null;
    if ("direccion" in cambios) db.direccion = cambios.direccion;
    if ("localidad" in cambios) db.localidad = cambios.localidad;
    if ("ambientes" in cambios) db.ambientes = cambios.ambientes;
    if ("capacidad" in cambios) db.capacidad = cambios.capacidad;
    if ("cochera" in cambios) db.cochera = cambios.cochera;
    if ("aptoCamioneta" in cambios) db.apto_camioneta = cambios.aptoCamioneta;
    if ("precioDia" in cambios) db.precio_dia = cambios.precioDia ?? null;
    if ("precioDiaCochera" in cambios) db.precio_dia_cochera = cambios.precioDiaCochera ?? null;
    if ("ubicacionCochera" in cambios) db.ubicacion_cochera = cambios.ubicacionCochera ?? null;
    if ("icals" in cambios) db.icals = cambios.icals;
    if ("notas" in cambios) db.notas = cambios.notas;
    supabase.from("unidades").update(db).eq("id", id).then(({ error }) => error && console.error(error));
  }, []);
  const deleteUnidad = useCallback((id: string) => {
    setUnidades((prev) => prev.filter((u) => u.id !== id));
    setReservas((prev) => prev.filter((r) => r.unidadId !== id));
    supabase.from("reservas").delete().eq("unidad_id", id).then(() => {});
    supabase.from("unidades").delete().eq("id", id).then(() => {});
  }, []);

  // ---------- Reservas ----------
  const addReserva = useCallback((r: Omit<Reserva, "id">) => {
    const nueva: Reserva = { ...r, id: nuevoId() };
    setReservas((prev) => [...prev, nueva]);
    supabase.from("reservas").insert(reservaDb(nueva)).then(({ error }) => {
      if (error) console.error(error);
      else materializar();
    });
    return nueva.id;
  }, [materializar]);
  const updateReserva = useCallback((id: string, cambios: Partial<Reserva>) => {
    setReservas((prev) => prev.map((r) => (r.id === id ? { ...r, ...cambios } : r)));
    const full = refs.current.reservas.find((r) => r.id === id);
    if (full) supabase.from("reservas").update(reservaDb({ ...full, ...cambios })).eq("id", id).then(() => materializar());
  }, [materializar]);
  const deleteReserva = useCallback((id: string) => {
    setReservas((prev) => prev.filter((r) => r.id !== id));
    setPagos((prev) => prev.filter((p) => p.reservaId !== id));
    supabase.from("pagos").delete().eq("reserva_id", id).then(() => {});
    supabase.from("reservas").delete().eq("id", id).then(() => {});
  }, []);

  const pagosDe = useCallback(
    (reservaId: string) => pagos.filter((p) => p.reservaId === reservaId).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [pagos]
  );

  const saldoDe = useCallback(
    (reserva: Reserva) => {
      const pagado = reserva.sena + pagos.filter((p) => p.reservaId === reserva.id).reduce((a, p) => a + p.monto, 0);
      return Math.max(0, reserva.montoTotal - pagado);
    },
    [pagos]
  );

  const addPago = useCallback((p: Omit<Pago, "id">) => {
    const nuevo: Pago = { ...p, id: nuevoId() };
    setPagos((prev) => [...prev, nuevo]);
    supabase.from("pagos").insert(pagoDb(nuevo)).then(({ error }) => error && console.error(error));
    return nuevo.id;
  }, []);

  const deletePago = useCallback((id: string) => {
    setPagos((prev) => prev.filter((p) => p.id !== id));
    supabase.from("pagos").delete().eq("id", id).then(() => {});
  }, []);

  // ---------- Comprobantes de servicios ----------
  const serviciosDe = useCallback(
    (reservaId: string) => serviciosComprobantes.filter((s) => s.reservaId === reservaId),
    [serviciosComprobantes]
  );

  const guardarServicioComprobante = useCallback((s: Omit<ServicioComprobante, "id">) => {
    if (!userId) return;
    setServiciosComprobantes((prev) => {
      const existente = prev.find((x) => x.reservaId === s.reservaId && x.periodo === s.periodo && x.servicio === s.servicio);
      const fila: ServicioComprobante = { ...s, id: existente?.id ?? nuevoId() };
      supabase.from("comprobantes_servicio")
        .upsert(servCompDb(fila), { onConflict: "reserva_id,periodo,servicio" })
        .then(({ error }) => error && console.error(error));
      return existente
        ? prev.map((x) => (x.id === existente.id ? fila : x))
        : [...prev, fila];
    });
  }, [userId]);

  const deleteServicioComprobante = useCallback((reservaId: string, periodo: string, servicio: string) => {
    setServiciosComprobantes((prev) => prev.filter((s) => !(s.reservaId === reservaId && s.periodo === periodo && s.servicio === servicio)));
    supabase.from("comprobantes_servicio").delete()
      .eq("reserva_id", reservaId).eq("periodo", periodo).eq("servicio", servicio)
      .then(() => {});
  }, []);

  const addMedioPago = useCallback(
    (nombre: string) => {
      const limpio = nombre.trim();
      const existente = mediosPago.find((m) => m.nombre.toLowerCase() === limpio.toLowerCase());
      if (existente) return existente.id;
      const m: MedioPago = { id: nuevoId(), nombre: limpio, activo: true };
      setMediosPago((prev) => [...prev, m]);
      supabase.from("medios_pago").insert(medioDb(m)).then(({ error }) => error && console.error(error));
      return m.id;
    },
    [mediosPago]
  );

  const updateMedioPago = useCallback((id: string, cambios: Partial<MedioPago>) => {
    setMediosPago((prev) => prev.map((m) => (m.id === id ? { ...m, ...cambios } : m)));
    supabase.from("medios_pago").update(cambios).eq("id", id).then(({ error }) => error && console.error(error));
  }, []);

  const deleteMedioPago = useCallback((id: string) => {
    setMediosPago((prev) => prev.filter((m) => m.id !== id));
    supabase.from("medios_pago").delete().eq("id", id).then(() => {});
  }, []);

  // ---------- Gastos ----------
  const addGasto = useCallback((g: Omit<Gasto, "id">) => {
    const nuevo: Gasto = { ...g, id: nuevoId() };
    setGastos((prev) => [...prev, nuevo]);
    supabase.from("gastos").insert(gastoDb(nuevo)).then(({ error }) => error && console.error(error));
    return nuevo.id;
  }, []);
  const updateGasto = useCallback((id: string, cambios: Partial<Gasto>) => {
    setGastos((prev) => prev.map((g) => (g.id === id ? { ...g, ...cambios } : g)));
    const full = refs.current.gastos.find((g) => g.id === id);
    if (full) supabase.from("gastos").update(gastoDb({ ...full, ...cambios })).eq("id", id).then(() => {});
  }, []);
  const deleteGasto = useCallback((id: string) => {
    setGastos((prev) => prev.filter((g) => g.id !== id));
    supabase.from("gastos").delete().eq("id", id).then(() => {});
  }, []);

  // ---------- Otros ingresos ----------
  const addIngreso = useCallback((i: Omit<Ingreso, "id">) => {
    const nuevo: Ingreso = { ...i, id: nuevoId() };
    setIngresos((prev) => [...prev, nuevo]);
    supabase.from("ingresos").insert(ingresoDb(nuevo)).then(({ error }) => error && console.error(error));
    return nuevo.id;
  }, []);
  const updateIngreso = useCallback((id: string, cambios: Partial<Ingreso>) => {
    setIngresos((prev) => prev.map((i) => (i.id === id ? { ...i, ...cambios } : i)));
    const full = refs.current.ingresos.find((i) => i.id === id);
    if (full) supabase.from("ingresos").update(ingresoDb({ ...full, ...cambios })).eq("id", id).then(() => {});
  }, []);
  const deleteIngreso = useCallback((id: string) => {
    setIngresos((prev) => prev.filter((i) => i.id !== id));
    supabase.from("ingresos").delete().eq("id", id).then(() => {});
  }, []);

  // ---------- Proveedores ----------
  const addProveedor = useCallback((p: Omit<Proveedor, "id">) => {
    const nuevo: Proveedor = { ...p, id: nuevoId() };
    setProveedores((prev) => [...prev, nuevo]);
    supabase.from("proveedores").insert(proveedorDb(nuevo)).then(({ error }) => error && console.error(error));
    return nuevo.id;
  }, []);
  const updateProveedor = useCallback((id: string, cambios: Partial<Proveedor>) => {
    setProveedores((prev) => prev.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
    const db: Record<string, unknown> = {};
    if ("nombre" in cambios) db.nombre = cambios.nombre;
    if ("rubro" in cambios) db.rubro = cambios.rubro;
    if ("telefono" in cambios) db.telefono = cambios.telefono;
    if ("email" in cambios) db.email = cambios.email;
    if ("notas" in cambios) db.notas = cambios.notas;
    if ("visibleInquilino" in cambios) db.visible_inquilino = cambios.visibleInquilino;
    supabase.from("proveedores").update(db).eq("id", id).then(({ error }) => error && console.error(error));
  }, []);
  const deleteProveedor = useCallback((id: string) => {
    setProveedores((prev) => prev.filter((p) => p.id !== id));
    supabase.from("proveedores").delete().eq("id", id).then(() => {});
  }, []);

  const trabajosDe = useCallback(
    (proveedorId: string) => gastos.filter((g) => g.proveedorId === proveedorId).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [gastos]
  );
  const ratingProveedor = useCallback(
    (proveedorId: string) => {
      const conRating = gastos.filter((g) => g.proveedorId === proveedorId && g.rating && g.rating > 0);
      if (conRating.length === 0) return { promedio: 0, cantidad: 0 };
      const suma = conRating.reduce((a, g) => a + (g.rating ?? 0), 0);
      return { promedio: suma / conRating.length, cantidad: conRating.length };
    },
    [gastos]
  );

  // ---------- Presupuestos ----------
  const presupuestosDe = useCallback(
    (proveedorId: string) => presupuestos.filter((p) => p.proveedorId === proveedorId).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [presupuestos]
  );
  const addPresupuesto = useCallback((p: Omit<Presupuesto, "id">) => {
    const nuevo: Presupuesto = { ...p, id: nuevoId() };
    setPresupuestos((prev) => [...prev, nuevo]);
    supabase.from("presupuestos").insert(presupuestoDb(nuevo)).then(({ error }) => error && console.error(error));
    return nuevo.id;
  }, []);
  const updatePresupuesto = useCallback((id: string, cambios: Partial<Presupuesto>) => {
    setPresupuestos((prev) => prev.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
    const full = presupuestos.find((p) => p.id === id);
    if (full) supabase.from("presupuestos").update(presupuestoDb({ ...full, ...cambios })).eq("id", id).then(({ error }) => error && console.error(error));
  }, [presupuestos]);
  const deletePresupuesto = useCallback((id: string) => {
    setPresupuestos((prev) => prev.filter((p) => p.id !== id));
    supabase.from("presupuestos").delete().eq("id", id).then(() => {});
  }, []);

  // ---------- Chat (lado dueño) ----------
  const mensajesDe = useCallback(
    (reservaId: string) => mensajes.filter((m) => m.reservaId === reservaId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [mensajes]
  );
  const enviarMensaje = useCallback((reservaId: string, texto: string) => {
    const t = texto.trim();
    if (!t) return;
    const m: Mensaje = { id: nuevoId(), reservaId, autor: "dueno", texto: t, createdAt: new Date().toISOString(), leidoDueno: true };
    setMensajes((prev) => [...prev, m]);
    supabase.from("mensajes").insert({ id: m.id, reserva_id: reservaId, autor: "dueno", texto: t, leido_dueno: true }).then(({ error }) => error && console.error(error));
  }, []);
  const marcarLeidos = useCallback((reservaId: string) => {
    setMensajes((prev) => prev.map((m) => (m.reservaId === reservaId && m.autor === "inquilino" && !m.leidoDueno ? { ...m, leidoDueno: true } : m)));
    supabase.from("mensajes").update({ leido_dueno: true }).eq("reserva_id", reservaId).eq("autor", "inquilino").then(() => {});
  }, []);

  // ---------- Notificaciones (lado dueño) ----------
  const marcarNotifLeidas = useCallback(() => {
    setNotificaciones((prev) => prev.map((n) => (n.leida ? n : { ...n, leida: true })));
    supabase.from("notificaciones").update({ leida: true }).eq("para", "dueno").eq("leida", false).then(() => {});
  }, []);

  // ---------- Avisos del sistema (admin) ----------
  const crearAviso = useCallback((a: Omit<AvisoSistema, "id" | "createdAt">) => {
    const nuevo: AvisoSistema = { ...a, id: nuevoId(), createdAt: new Date().toISOString() };
    setAvisos((prev) => (nuevo.activo ? [nuevo, ...prev] : prev));
    supabase.from("avisos_sistema").insert({ id: nuevo.id, tipo: a.tipo, titulo: a.titulo, cuerpo: a.cuerpo, activo: a.activo }).then(({ error }) => error && console.error(error));
  }, []);
  const toggleAviso = useCallback((id: string, activo: boolean) => {
    setAvisos((prev) => prev.map((a) => (a.id === id ? { ...a, activo } : a)).filter((a) => a.activo));
    supabase.from("avisos_sistema").update({ activo }).eq("id", id).then(() => {});
  }, []);
  const eliminarAviso = useCallback((id: string) => {
    setAvisos((prev) => prev.filter((a) => a.id !== id));
    supabase.from("avisos_sistema").delete().eq("id", id).then(() => {});
  }, []);

  // ---------- Programados ----------
  const addProgramado = useCallback((p: Omit<GastoProgramado, "id">) => {
    const nuevo: GastoProgramado = { ...p, id: nuevoId() };
    setGastosProgramados((prev) => [...prev, nuevo]);
    supabase.from("gastos_programados").insert(progDb(nuevo)).then(({ error }) => {
      if (error) console.error(error);
      else materializar();
    });
    return nuevo.id;
  }, [materializar]);
  const updateProgramado = useCallback((id: string, cambios: Partial<GastoProgramado>) => {
    setGastosProgramados((prev) => prev.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
    const full = refs.current.gastosProgramados.find((p) => p.id === id);
    if (full) supabase.from("gastos_programados").update(progDb({ ...full, ...cambios })).eq("id", id).then(() => materializar());
  }, [materializar]);
  const deleteProgramado = useCallback((id: string) => {
    setGastosProgramados((prev) => prev.filter((p) => p.id !== id));
    setGastos((prev) => prev.filter((g) => !g.claveOrigen?.startsWith(`${id}|`)));
    supabase.from("gastos").delete().like("clave_origen", `${id}|%`).then(() => {});
    supabase.from("gastos_programados").delete().eq("id", id).then(() => {});
  }, []);

  // ---------- Colaboradores ----------
  const addColaborador = useCallback((c: Omit<Colaborador, "id">) => {
    const nuevo: Colaborador = { ...c, id: nuevoId() };
    setColaboradores((prev) => [...prev, nuevo]);
    supabase.from("colaboradores").insert(colabDb(nuevo)).then(({ error }) => error && console.error(error));
    return nuevo.id;
  }, []);
  const updateColaborador = useCallback((id: string, cambios: Partial<Colaborador>) => {
    setColaboradores((prev) => prev.map((c) => (c.id === id ? { ...c, ...cambios } : c)));
    const full = refs.current && colaboradores.find((c) => c.id === id);
    if (full) supabase.from("colaboradores").update(colabDb({ ...full, ...cambios })).eq("id", id).then(() => {});
  }, [colaboradores]);
  const deleteColaborador = useCallback((id: string) => {
    setColaboradores((prev) => prev.filter((c) => c.id !== id));
    supabase.from("colaboradores").delete().eq("id", id).then(() => {});
  }, []);

  // ---------- Configuración regional ----------
  const updateConfig = useCallback((cambios: Partial<Configuracion>) => {
    setConfig((prev) => {
      const next = { ...prev, ...cambios };
      if (userId) {
        supabase
          .from("configuracion")
          .upsert(configDb(next), { onConflict: "owner_id" })
          .then(({ error }) => error && console.error(error));
      }
      return next;
    });
  }, [userId]);

  // ---------- Datos de ejemplo ----------
  const seedCuenta = useCallback(async () => {
    const datos = construirEjemplo();
    await supabase.from("grupos").insert(datos.grupos.map(grupoDb));
    await supabase.from("unidades").insert(datos.unidades.map(unidadDb));
    await supabase.from("reservas").insert(datos.reservas.map(reservaDb));
    await supabase.from("pagos").insert(datos.pagos.map(pagoDb));
    await supabase.from("proveedores").insert(datos.proveedores.map(proveedorDb));
    await supabase.from("presupuestos").insert(datos.presupuestos.map(presupuestoDb));
    await supabase.from("gastos").insert(datos.gastos.map(gastoDb));
    await supabase.from("gastos_programados").insert(datos.programados.map(progDb));
    await supabase.from("colaboradores").insert(datos.colaboradores.map(colabDb));
    await cargarTodo();
  }, [cargarTodo]);

  const vaciarCuenta = useCallback(async () => {
    const { error } = await supabase.rpc("vaciar_mi_cuenta");
    if (error) { console.error(error); throw error; }
    await cargarTodo();
  }, [cargarTodo]);

  const vacio = cargado && grupos.length === 0 && unidades.length === 0 && reservas.length === 0;

  const value: StoreCtx = {
    cargado, vacio, seedCuenta, vaciarCuenta,
    grupos, getGrupo, nombreGrupo, addGrupo, updateGrupo, deleteGrupo,
    unidades, reservas, getUnidad, reservasDe,
    addUnidad, updateUnidad, deleteUnidad,
    addReserva, updateReserva, deleteReserva, conflicto,
    bloqueos, bloqueosDe, sincronizarIcal,
    pagos, pagosDe, saldoDe, addPago, deletePago,
    serviciosComprobantes, serviciosDe, guardarServicioComprobante, deleteServicioComprobante,
    mediosPago, addMedioPago, updateMedioPago, deleteMedioPago,
    gastos, addGasto, updateGasto, deleteGasto, gastoDeUnidad,
    ingresos, addIngreso, updateIngreso, deleteIngreso,
    proveedores, addProveedor, updateProveedor, deleteProveedor, ratingProveedor, trabajosDe,
    presupuestos, presupuestosDe, addPresupuesto, updatePresupuesto, deletePresupuesto,
    mensajes, mensajesDe, enviarMensaje, marcarLeidos,
    mensajesNoLeidos: mensajes.filter((m) => m.autor === "inquilino" && !m.leidoDueno).length,
    gastosProgramados, addProgramado, updateProgramado, deleteProgramado,
    colaboradores, addColaborador, updateColaborador, deleteColaborador,
    config, updateConfig,
    rol, permisosColab,
    puedeEditar: (modulo: string) => rol === "dueno" || permisosColab.includes(modulo),
    puedeVerMontos: rol === "dueno" || permisosColab.includes("montos"),
    notificaciones,
    notifNoLeidas: notificaciones.filter((n) => !n.leida).length,
    marcarNotifLeidas,
    avisos, esAdmin, crearAviso, toggleAviso, eliminarAviso,
    suscripcion,
    accesoActivo: (() => {
      if (esAdmin || rol === "cliente" || rol === "nuevo" || rol === null) return true;
      if (!suscripcion) return true; // sin fila (migración no corrida) → no bloquear
      const ahora = Date.now();
      if (suscripcion.estado === "activa") return suscripcion.periodoFin ? Date.parse(suscripcion.periodoFin) > ahora : true;
      if (suscripcion.estado === "trial") return Date.parse(suscripcion.trialFin) > ahora;
      return false; // vencida | cancelada
    })(),
    diasTrial: suscripcion && suscripcion.estado === "trial"
      ? Math.max(0, Math.ceil((Date.parse(suscripcion.trialFin) - Date.now()) / 86400000))
      : 0,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore debe usarse dentro de <StoreProvider>");
  return ctx;
}

// ---------- Datos de ejemplo (con ids frescos para la cuenta) ----------
function construirEjemplo() {
  const anio = new Date().getFullYear();
  const gC = nuevoId(), gP = nuevoId(), gS = nuevoId();
  const uCab = nuevoId(), uCen = nuevoId(), uVar = nuevoId(), uCha = nuevoId();
  const pGas = nuevoId(), pElec = nuevoId(), pPint = nuevoId();

  const grupos: Grupo[] = [
    { id: gC, nombre: "Centro", ambiente: "Ciudad", color: "#14b8a6" },
    { id: gP, nombre: "Playa Grande", ambiente: "Playa", color: "#3b82f6" },
    { id: gS, nombre: "Sierra de los Padres", ambiente: "Montaña", color: "#10b981" },
  ];
  const unidades: Unidad[] = [
    { id: uCab, nombre: "Complejo Las Toninas", grupoId: gP, tipoUnidad: "Cabaña", color: "#f59e0b", direccion: "Av. Costanera 1450", localidad: "Mar del Plata", ambientes: 2, capacidad: 5, icals: [], notas: "Cabaña frente al mar." },
    { id: uCen, nombre: "Depto Güemes", grupoId: gC, tipoUnidad: "Departamento", color: "#14b8a6", direccion: "Güemes 2890, Piso 5", localidad: "Mar del Plata", ambientes: 2, capacidad: 4, icals: [], notas: "Ideal pareja o familia chica." },
    { id: uVar, nombre: "Monoambiente Varese", grupoId: gC, tipoUnidad: "Monoambiente", color: "#3b82f6", direccion: "Av. Colón 1120, Piso 8", localidad: "Mar del Plata", ambientes: 1, capacidad: 2, icals: [], notas: "Vista al mar." },
    { id: uCha, nombre: "Chalet Sierra", grupoId: gS, tipoUnidad: "Casa", color: "#8b5cf6", direccion: "Ruta 226 km 14", localidad: "Sierra de los Padres", ambientes: 4, capacidad: 8, icals: [], notas: "Casa con parque y parrilla." },
  ];
  const tmp = (unidadId: string, huesped: string, ci: string, co: string, canal: Reserva["canal"], total: number, sena: number, moneda: Reserva["moneda"] = "ARS", extra: Partial<Reserva> = {}): Reserva =>
    ({ id: nuevoId(), unidadId, huesped, contacto: "", checkIn: `${anio}-${ci}`, checkOut: `${anio}-${co}`, montoTotal: total, montoMensual: 0, sena, canal, tipo: "temporal", moneda, actualizacion: "Sin actualización", indice: "IPC", porcentajeManual: 0, horaCheckIn: "15:00", horaCheckOut: "11:00", notas: "", ...extra });

  // Ids capturados para enganchar pagos y vencimientos.
  const rLucia = nuevoId(), rPerez = nuevoId(), rTuristas = nuevoId(), rInvCab = nuevoId(), rFinAnio = nuevoId();

  const reservas: Reserva[] = [
    tmp(uCab, "Familia Gómez", "01-02", "01-12", "Booking", 520000, 200000),
    tmp(uCab, "Flia. Rossi", "01-13", "01-23", "Airbnb", 560000, 220000),
    tmp(uCab, "Grupo amigos", "02-02", "02-12", "Directo", 580000, 580000),
    tmp(uCab, "Vacaciones invierno", "07-12", "07-20", "Booking", 360000, 150000, "ARS", { id: rInvCab, vencimiento: `${anio}-07-05` }),
    tmp(uCab, "Fin de año", "12-18", "12-31", "Directo", 680000, 300000, "ARS", { id: rFinAnio, vencimiento: `${anio}-12-10` }),
    tmp(uCen, "Turistas enero", "01-05", "01-20", "Booking", 480000, 150000, "ARS", { id: rTuristas }),
    { id: rLucia, unidadId: uCen, huesped: "Lucía Fernández (estudiante)", contacto: "lucia@mail.com", checkIn: `${anio}-03-01`, checkOut: `${anio}-12-01`, montoTotal: 2700000, montoMensual: 300000, sena: 300000, canal: "Directo", tipo: "estudiantil", moneda: "ARS", actualizacion: "Trimestral", indice: "ICL", porcentajeManual: 0, horaCheckIn: "12:00", horaCheckOut: "10:00", notas: "Garante: padre. Ajuste por ICL.", diaVencimiento: 10, serviciosInquilino: ["Luz", "Gas"], emailInquilino: "lucia@mail.com" },
    { id: rPerez, unidadId: uVar, huesped: "Inquilino anual (Pérez)", contacto: "perez@mail.com", checkIn: `${anio}-02-01`, checkOut: `${anio + 1}-02-01`, montoTotal: 3000000, montoMensual: 250000, sena: 250000, canal: "Directo", tipo: "12 meses", moneda: "ARS", actualizacion: "Semestral", indice: "IPC", porcentajeManual: 0, horaCheckIn: "12:00", horaCheckOut: "10:00", notas: "Contrato 12 meses, ajuste semestral por IPC.", diaVencimiento: 5, serviciosInquilino: ["Luz", "Gas", "Expensas"], emailInquilino: "perez@mail.com" },
    tmp(uCha, "Año nuevo", "01-02", "01-07", "Directo", 280000, 280000),
    tmp(uCha, "Familia Smith (USA)", "02-13", "02-17", "Airbnb", 1500, 1500, "USD"),
    tmp(uCha, "Vacaciones invierno", "07-18", "07-21", "Directo", 200000, 100000),
    tmp(uCha, "Navidad", "12-26", "12-30", "Directo", 320000, 150000),
  ];
  const gastos: Gasto[] = [
    { id: nuevoId(), ambito: "unidad", refId: uCen, fecha: `${anio}-01-16`, categoria: "Limpieza", descripcion: "Limpieza profunda post check-out", monto: 35000, proveedor: "Marta" },
    { id: nuevoId(), ambito: "unidad", refId: uCab, fecha: `${anio}-01-25`, categoria: "Reparación", descripcion: "Cambio de termotanque", monto: 180000, proveedor: "Gasista Pérez" },
    { id: nuevoId(), ambito: "unidad", refId: uCha, fecha: `${anio}-06-10`, categoria: "Reparación", descripcion: "Arreglo de techo (filtración)", monto: 1500000, proveedor: "Constructora del Sur" },
    { id: nuevoId(), ambito: "grupo", refId: gC, fecha: `${anio}-02-01`, categoria: "Mantenimiento", descripcion: "Pintura general", monto: 200000, proveedor: "Pintor López", reparto: [{ unidadId: uCen, porcentaje: 70 }, { unidadId: uVar, porcentaje: 30 }] },
    { id: nuevoId(), ambito: "unidad", refId: uVar, fecha: `${anio}-05-08`, categoria: "Reparación", descripcion: "Arreglo de caldera (lo pagó el inquilino)", monto: 180000, proveedor: "Gasista matriculado", pagadoPor: "inquilino", proveedorId: pGas, rating: 5, ratingNota: "Vino el mismo día, prolijo." },
  ];
  const proveedores: Proveedor[] = [
    { id: pGas, nombre: "Carlos Gas", rubro: "Gasista", telefono: "+54 9 223 555-1010", email: "", notas: "Matriculado. Zona centro.", visibleInquilino: true },
    { id: pElec, nombre: "Electricidad Mar del Plata", rubro: "Electricista", telefono: "+54 9 223 555-2020", email: "contacto@elecmdp.com", notas: "", visibleInquilino: true },
    { id: pPint, nombre: "Pintor López", rubro: "Pintor", telefono: "+54 9 223 555-3030", email: "", notas: "Presupuesta sin cargo.", visibleInquilino: false },
  ];
  const presupuestos: Presupuesto[] = [
    { id: nuevoId(), proveedorId: pElec, ambito: "unidad", refId: uCha, descripcion: "Revisión de tablero eléctrico", monto: 95000, fecha: `${anio}-05-20`, estado: "pendiente", nota: "" },
    { id: nuevoId(), proveedorId: pPint, ambito: "grupo", refId: gC, descripcion: "Pintura de palier y frente", monto: 320000, fecha: `${anio}-04-15`, estado: "aprobado", nota: "Incluye materiales." },
  ];
  const programados: GastoProgramado[] = [
    { id: nuevoId(), ambito: "unidad", refId: uVar, categoria: "Servicios", descripcion: "Expensas mensuales", monto: 30000, proveedor: "Administración", frecuencia: "Mensual", fechaInicio: `${anio}-02-01`, activo: true },
    { id: nuevoId(), ambito: "unidad", refId: uCab, categoria: "Limpieza", descripcion: "Limpieza post check-out", monto: 25000, proveedor: "Marta", frecuencia: "Por check-out", fechaInicio: `${anio}-01-01`, activo: true },
  ];
  const colaboradores: Colaborador[] = [
    { id: nuevoId(), nombre: "Marta", email: "marta@mail.com", rol: "Encargado", gruposIds: [gP], permisos: ["reservas", "gastos"] },
  ];

  // Pagos cobrados (además de las señas, que viven en la reserva).
  const pago = (reservaId: string, fecha: string, monto: number, medio = "Transferencia"): Pago =>
    ({ id: nuevoId(), reservaId, fecha: `${anio}-${fecha}`, monto, medio, nota: "" });
  const pagos: Pago[] = [
    pago(rTuristas, "01-20", 330000),               // saldo de la temporada (queda cancelada)
    pago(rLucia, "03-10", 300000, "Efectivo"),      // alquiler marzo
    pago(rLucia, "04-10", 300000, "Efectivo"),      // alquiler abril
    pago(rLucia, "05-10", 300000, "Transferencia"), // alquiler mayo
    pago(rPerez, "02-05", 250000, "Transferencia"), // alquiler febrero
    pago(rPerez, "03-05", 250000, "Transferencia"), // alquiler marzo
    pago(rPerez, "04-05", 250000, "MODO"),          // alquiler abril
  ];

  return { grupos, unidades, reservas, gastos, programados, colaboradores, pagos, proveedores, presupuestos };
}
