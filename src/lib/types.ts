// Tipos centrales del dominio de Tampu

export type Canal = "Airbnb" | "Booking" | "Vrbo" | "WhatsApp" | "Directo" | "Otro";

export type TipoAlquiler = "temporal" | "estudiantil" | "12 meses" | "24 meses" | "36 meses";

export const TIPOS_ALQUILER: { valor: TipoAlquiler; label: string }[] = [
  { valor: "temporal", label: "Temporal (turístico)" },
  { valor: "estudiantil", label: "Estudiantil" },
  { valor: "12 meses", label: "12 meses" },
  { valor: "24 meses", label: "24 meses" },
  { valor: "36 meses", label: "36 meses" },
];

export const TIPO_LABEL: Record<TipoAlquiler, string> = {
  temporal: "Temporal",
  estudiantil: "Estudiantil",
  "12 meses": "12 meses",
  "24 meses": "24 meses",
  "36 meses": "36 meses",
};

// Un alquiler es de largo plazo (contrato) si no es temporal/turístico.
export function esLargoPlazo(t: TipoAlquiler): boolean {
  return t !== "temporal";
}

export type TipoActualizacion =
  | "Sin actualización"
  | "Trimestral"
  | "Cuatrimestral"
  | "Semestral"
  | "Anual";

export const TIPOS_ACTUALIZACION: TipoActualizacion[] = [
  "Sin actualización",
  "Trimestral",
  "Cuatrimestral",
  "Semestral",
  "Anual",
];

// Índice con el que se ajusta el alquiler en cada período.
export type IndiceAjuste = "IPC" | "ICL" | "Manual";
export const INDICES_AJUSTE: IndiceAjuste[] = ["IPC", "ICL", "Manual"];

// Cantidad de meses entre ajustes según la frecuencia.
export function mesesActualizacion(a: TipoActualizacion): number {
  switch (a) {
    case "Trimestral": return 3;
    case "Cuatrimestral": return 4;
    case "Semestral": return 6;
    case "Anual": return 12;
    default: return 0; // "Sin actualización"
  }
}

// Colaboradores del equipo: usuarios que pueden ver/gestionar unidades y alquileres.
export type Rol = "Propietario" | "Administrador" | "Encargado" | "Lectura";

export const ROLES: { valor: Rol; label: string; desc: string }[] = [
  { valor: "Propietario", label: "Propietario", desc: "Acceso total y gestión del equipo." },
  { valor: "Administrador", label: "Administrador", desc: "Gestiona unidades, reservas, gastos y reportes." },
  { valor: "Encargado", label: "Encargado", desc: "Carga reservas y gastos del día a día." },
  { valor: "Lectura", label: "Solo lectura", desc: "Solo puede ver, no edita." },
];

export interface Colaborador {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  gruposIds: string[]; // grupos a los que accede ([] = todos)
  permisos: string[];  // módulos que puede EDITAR (ve todo igual)
}

// Módulos sobre los que se puede dar permiso de edición a un colaborador.
export const MODULOS_PERMISO: { clave: string; label: string; desc: string }[] = [
  { clave: "montos", label: "Ver montos ($)", desc: "Si está apagado, los importes se ocultan (estilo banco)." },
  { clave: "reportes", label: "Ver reportes (datos de plata)", desc: "Panel económico, cobranzas y cronograma. Información sensible." },
  { clave: "unidades", label: "Unidades y grupos", desc: "Crear/editar unidades y grupos." },
  { clave: "reservas", label: "Reservas, pagos y mensajes", desc: "Cargar reservas, registrar pagos, chatear." },
  { clave: "gastos", label: "Gastos y proveedores", desc: "Cargar gastos, proveedores y presupuestos." },
  { clave: "config", label: "Configuración", desc: "Cambiar parámetros del negocio." },
  { clave: "equipo", label: "Equipo", desc: "Agregar/editar colaboradores." },
];

// Permisos sugeridos según el rol (preset; después se pueden ajustar a mano).
export function permisosDeRol(rol: Rol): string[] {
  switch (rol) {
    case "Propietario":
    case "Administrador": return ["montos", "reportes", "unidades", "reservas", "gastos", "config", "equipo"];
    case "Encargado": return ["unidades", "reservas", "gastos"]; // sin montos ni reportes (la plata es opt-in)
    default: return []; // Lectura
  }
}

export type Moneda = "ARS" | "USD" | "UYU" | "CLP" | "MXN" | "EUR";
export const MONEDAS: { valor: Moneda; label: string }[] = [
  { valor: "ARS", label: "Pesos argentinos ($)" },
  { valor: "USD", label: "Dólares (US$)" },
  { valor: "UYU", label: "Pesos uruguayos ($U)" },
  { valor: "CLP", label: "Pesos chilenos ($)" },
  { valor: "MXN", label: "Pesos mexicanos ($)" },
  { valor: "EUR", label: "Euros (€)" },
];
export const SIMBOLO_MONEDA: Record<Moneda, string> = { ARS: "$", USD: "US$", UYU: "$U", CLP: "$", MXN: "$", EUR: "€" };

// País del negocio: define defaults regionales (moneda y si aplica ajuste por inflación).
export interface Pais {
  codigo: string; // "AR", "UY", "CL", "MX", "ES", "Otro"
  nombre: string;
  moneda: Moneda;
  ajusteInflacion: boolean; // si el mercado local usa ajuste por índice (ICL/IPC)
}
export const PAISES: Pais[] = [
  { codigo: "AR", nombre: "Argentina", moneda: "ARS", ajusteInflacion: true },
  { codigo: "UY", nombre: "Uruguay", moneda: "UYU", ajusteInflacion: false },
  { codigo: "CL", nombre: "Chile", moneda: "CLP", ajusteInflacion: false },
  { codigo: "MX", nombre: "México", moneda: "MXN", ajusteInflacion: false },
  { codigo: "ES", nombre: "España", moneda: "EUR", ajusteInflacion: false },
  { codigo: "Otro", nombre: "Otro", moneda: "USD", ajusteInflacion: false },
];

// Estado de suscripción del negocio (prueba gratis → pago).
export interface Suscripcion {
  estado: "trial" | "activa" | "vencida" | "cancelada";
  trialFin: string;       // ISO
  periodoFin?: string;    // ISO (fin del período pago vigente)
  precio?: number;        // precio mensual que está pagando hoy (para detectar cambios de plan)
}

// Planes según la cantidad de unidades cargadas. El precio se calcula
// al suscribirse. 'hasta' es el tope de unidades del tramo (el último, Infinity).
export interface Plan {
  nombre: string;
  hasta: number;
  precio: number;
  contacto?: boolean; // plan a medida: no se cobra automático, el dueño se contacta
}
export const PLANES: Plan[] = [
  { nombre: "Básico", hasta: 3, precio: 15000 },
  { nombre: "Plus", hasta: 6, precio: 25000 },
  { nombre: "Pro", hasta: 10, precio: 40000 },
  { nombre: "Max", hasta: 19, precio: 60000 },
  { nombre: "Empresas", hasta: Infinity, precio: 0, contacto: true },
];
// Dónde se comunica el cliente Empresas (cambiá este mail/whatsapp cuando quieras).
export const CONTACTO_EMPRESAS = "israelbastarrica@marketarg.com";
export function planPorUnidades(n: number): Plan {
  return PLANES.find((p) => n <= p.hasta) ?? PLANES[PLANES.length - 1];
}

// Configuración regional del negocio (una por dueño).
export interface Configuracion {
  pais: string;
  monedaDefault: Moneda;
  ajusteInflacion: boolean; // muestra/oculta los campos de actualización por índice
  diaVencimiento?: number; // día del mes (1-28) de vencimiento por defecto para alquileres largos
}
export const CONFIG_DEFAULT: Configuracion = {
  pais: "AR",
  monedaDefault: "ARS",
  ajusteInflacion: true,
};

export interface PlataformaICal {
  plataforma: string; // p.ej. "Airbnb", "Booking"
  url: string; // link iCal de exportación de la plataforma
}

// Punto de interés cercano (para la guía del huésped): nombre + link a Google Maps.
export interface PuntoInteres {
  nombre: string;
  url: string;
}

// Bloqueo de fechas importado de un calendario externo (Airbnb/Booking…).
export interface Bloqueo {
  id: string;
  unidadId: string;
  plataforma: string;
  desde: string; // ISO yyyy-mm-dd (check-in, incl.)
  hasta: string; // ISO yyyy-mm-dd (check-out, excl.)
}

// Ambiente / entorno general de un grupo, para identificarlo visualmente.
export type AmbienteGrupo =
  | "Edificio"
  | "Playa"
  | "Montaña"
  | "Río"
  | "Nieve"
  | "Ciudad"
  | "Campo"
  | "Otro";

export const AMBIENTES_GRUPO: AmbienteGrupo[] = ["Edificio", "Playa", "Montaña", "Río", "Nieve", "Ciudad", "Campo", "Otro"];

export const ICONO_AMBIENTE: Record<AmbienteGrupo, string> = {
  Edificio: "🏢",
  Playa: "🏖️",
  Montaña: "⛰️",
  Río: "🏞️",
  Nieve: "❄️",
  Ciudad: "🏙️",
  Campo: "🌾",
  Otro: "📍",
};

// Un "grupo" agrupa unidades (barrio, ciudad, complejo, edificio…).
// Es una entidad propia para poder renombrarlo en un solo lugar y hacer
// reportes agregados por grupo.
export interface Grupo {
  id: string;
  nombre: string;
  ambiente: AmbienteGrupo;
  color: string;
  foto?: string;
}

export type TipoUnidad =
  | "Departamento"
  | "Casa"
  | "Cabaña"
  | "Monoambiente"
  | "PH"
  | "Local"
  | "Cochera"
  | "Otro";

export const TIPOS_UNIDAD: TipoUnidad[] = ["Departamento", "Casa", "Cabaña", "Monoambiente", "PH", "Local", "Cochera", "Otro"];

export const ICONO_TIPO: Record<TipoUnidad, string> = {
  Departamento: "🏢",
  Casa: "🏠",
  Cabaña: "🛖",
  Monoambiente: "🏬",
  PH: "🏘️",
  Local: "🏪",
  Cochera: "🅿️",
  Otro: "📍",
};

export const COLORES_UNIDAD: string[] = ["#14b8a6", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#10b981", "#ef4444", "#64748b"];

// Una "unidad" es un espacio alquilable individual (un depto, una cabaña, una casa).
export interface Unidad {
  id: string;
  nombre: string;
  grupoId: string; // referencia a Grupo.id ("" = sin grupo)
  tipoUnidad: TipoUnidad; // depto, casa, cabaña…
  color: string; // color de identificación (hex)
  foto?: string; // foto de perfil (data URL), opcional
  direccion: string;
  localidad: string;
  ambientes: number; // cantidad de ambientes de la unidad
  capacidad: number; // huéspedes
  cochera?: boolean; // si el depto/unidad tiene cochera
  aptoCamioneta?: boolean; // si entra una camioneta/pickup (cocheras)
  // Guía del huésped (se muestra al escanear el QR de la unidad).
  wifiNombre?: string;
  wifiClave?: string;
  encargadoNombre?: string;
  encargadoTel?: string;
  instrucciones?: string; // ingreso, normas, cómo funciona algo, etc.
  puntosInteres?: PuntoInteres[];
  moneda?: Moneda; // moneda por defecto de la unidad (ARS, USD…)
  precioDia?: number; // tarifa por día para temporales (sin cochera, o única)
  precioDiaCochera?: number; // tarifa por día con cochera (si la unidad tiene cochera)
  ubicacionCochera?: string; // dónde está la cochera (ej: "Subsuelo 2, lugar 14")
  icals: PlataformaICal[];
  notas: string;
}

// Estado de una reserva. Las del portal de clientes nacen "pendiente" y el
// dueño las aprueba (tras revisar el comprobante) o las rechaza.
export type EstadoReserva = "pendiente" | "confirmada" | "cancelada";

export interface Reserva {
  id: string;
  unidadId: string;
  huesped: string;
  contacto: string;
  checkIn: string; // ISO yyyy-mm-dd
  checkOut: string; // ISO yyyy-mm-dd (día de salida, no se cuenta como noche ocupada)
  montoTotal: number; // temporal: total de la estadía. Largo plazo: total del contrato (mensual × meses).
  montoMensual: number; // largo plazo: alquiler por mes (0 en temporal).
  conCochera?: boolean; // temporal: si la estadía incluye la cochera (afecta la tarifa diaria)
  comision?: number; // comisión de la plataforma (Booking/Airbnb…): se vuelca como gasto de la unidad
  sena: number; // temporal: seña. Largo plazo: depósito.
  canal: Canal;
  tipo: TipoAlquiler;
  moneda: Moneda;
  actualizacion: TipoActualizacion; // frecuencia de ajuste (contratos largos)
  indice: IndiceAjuste; // con qué se ajusta: IPC, ICL o % manual
  porcentajeManual: number; // % por período si indice="Manual"
  horaCheckIn: string; // "HH:MM"
  horaCheckOut: string; // "HH:MM"
  notas: string;
  estado?: EstadoReserva; // "confirmada" por defecto; "pendiente" = reserva del portal sin aprobar
  clienteId?: string; // id del cliente del portal que la creó (si aplica)
  vencimiento?: string; // ISO yyyy-mm-dd: vencimiento puntual del saldo (temporal)
  diaVencimiento?: number; // día del mes de vencimiento del alquiler (largo plazo)
  serviciosInquilino?: string[]; // servicios/impuestos que paga el inquilino (largo plazo)
  emailInquilino?: string; // email del inquilino para vincular su portal
  aumentos?: Aumento[]; // nuevos importes del alquiler vigentes desde un mes (ajustes aplicados)
}

// Un aumento fija el alquiler mensual a partir de un mes (yyyy-mm), inclusive.
export interface Aumento {
  desde: string; // "yyyy-mm"
  monto: number;
}

// Servicios/impuestos que puede tener a cargo un inquilino (editables por contrato).
export const SERVICIOS_DEFAULT = ["Luz", "Gas", "Agua/OOSS", "Expensas", "ABL/Municipal", "Internet"];

// Comprobante de un servicio pagado por el inquilino, por mes.
export interface ServicioComprobante {
  id: string;
  reservaId: string;
  periodo: string;   // yyyy-mm
  servicio: string;  // nombre del servicio
  comprobante?: string; // imagen (data URL)
  monto: number;
  fecha: string;     // ISO yyyy-mm-dd
}

// Medio de pago: entidad configurable (efectivo, transferencia, cuentas bancarias, etc.).
// Se puede desactivar (ej: cuenta bloqueada) sin perder el historial.
export interface MedioPago {
  id: string;
  nombre: string;
  activo: boolean;
}
export const MEDIOS_PAGO_DEFAULT = ["Efectivo", "Transferencia", "Mercado Pago", "MODO", "BNA", "Tarjeta", "Otro"];

// Pago recibido por una reserva (registro con historial).
export interface Pago {
  id: string;
  reservaId: string;
  fecha: string; // ISO yyyy-mm-dd
  monto: number;
  medio: string; // nombre del medio de pago
  comprobante?: string; // imagen (data URL), opcional
  nota: string;
  periodo?: string; // "yyyy-mm": mes/cuota al que se imputa (contratos largos). Vacío = imputación automática.
  esSena?: boolean; // marca este pago como la seña (con su fecha real)
  // Reserva en USD cobrada en pesos: pesos efectivamente pagados y tipo de cambio usado.
  // (el campo 'monto' guarda el equivalente en USD que descuenta del total)
  montoArs?: number;
  tipoCambio?: number;
}

// Un gasto se imputa a una unidad puntual o a un grupo entero (gasto compartido).
export type AmbitoGasto = "unidad" | "grupo" | "general";

// Quién desembolsó el gasto. Si lo pagó el inquilino, se le acredita contra el
// alquiler del mes (cuenta corriente).
export type PagadoPor = "dueno" | "inquilino";
export const PAGADO_POR: { valor: PagadoPor; label: string }[] = [
  { valor: "dueno", label: "El dueño / la gestión" },
  { valor: "inquilino", label: "El inquilino (se le descuenta del alquiler)" },
];

export type CategoriaGasto =
  | "Limpieza"
  | "Mantenimiento"
  | "Reparación"
  | "Servicios"
  | "Impuestos"
  | "Comisión"
  | "Otro";

// Cómo se reparte un gasto de grupo entre sus unidades.
export interface RepartoItem {
  unidadId: string;
  porcentaje: number; // 0-100, la suma de todos debe dar 100
}

export interface Gasto {
  id: string;
  ambito: AmbitoGasto;
  refId: string; // unidadId si ambito="unidad", grupoId si ambito="grupo"
  fecha: string; // ISO yyyy-mm-dd
  categoria: CategoriaGasto;
  descripcion: string;
  monto: number;
  proveedor: string;
  // Solo para ambito="grupo": cómo se prorratea entre las unidades del grupo.
  // Es un snapshot al momento del gasto (las unidades del grupo pueden cambiar después).
  reparto?: RepartoItem[];
  // Si fue generado por un gasto programado, clave única de la ocurrencia (para no duplicar).
  claveOrigen?: string;
  // Generado por un programado variable y todavía sin importe cargado.
  pendiente?: boolean;
  // Quién lo pagó. "dueno" por defecto. "inquilino" → se acredita contra su alquiler.
  pagadoPor?: PagadoPor;
  // Comprobante / factura del gasto (imagen, data URL), opcional.
  comprobante?: string;
  // Proveedor que hizo el trabajo (opcional) y presupuesto del que surgió.
  proveedorId?: string;
  presupuestoId?: string;
  // Puntuación del trabajo (1-5) y comentario, para el histórico del proveedor.
  rating?: number;
  ratingNota?: string;
}

// ---------- Otros ingresos (no-alquiler) ----------
export type CategoriaIngreso = "Venta" | "Reintegro" | "Servicio" | "Otro";
export const CATEGORIAS_INGRESO: CategoriaIngreso[] = ["Venta", "Reintegro", "Servicio", "Otro"];

export interface Ingreso {
  id: string;
  ambito: AmbitoGasto;   // unidad | grupo | general (mismo criterio que gastos)
  refId: string;
  fecha: string;         // ISO yyyy-mm-dd
  categoria: CategoriaIngreso;
  descripcion: string;
  monto: number;
  reparto?: RepartoItem[]; // solo para ambito="grupo"
}

// ---------- Proveedores ----------
export const RUBROS_PROVEEDOR = ["Electricista", "Gasista", "Plomero", "Pintor", "Albañil", "Cerrajero", "Limpieza", "Jardinería", "Técnico (aires/electro)", "Vidriero", "Otro"];

export interface Proveedor {
  id: string;
  nombre: string;
  rubro: string;
  telefono: string;
  email: string;
  notas: string;
  visibleInquilino: boolean; // si el inquilino lo ve en "Contactos"
}

// Notificación de evento (para el dueño/colaborador).
export interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  reservaId?: string;
  leida: boolean;
  createdAt: string;
}

// Aviso del sistema (lo publica el admin de la plataforma; lo ven todos).
export type TipoAviso = "novedad" | "mantenimiento" | "info";
export interface AvisoSistema {
  id: string;
  tipo: TipoAviso;
  titulo: string;
  cuerpo: string;
  activo: boolean;
  createdAt: string;
}

// Mensaje del chat dueño <-> inquilino (por contrato).
export interface Mensaje {
  id: string;
  reservaId: string; // "" para consultas pre-reserva
  autor: "dueno" | "inquilino";
  texto: string;
  createdAt: string;
  leidoDueno?: boolean;
  clienteId?: string;    // consultas: el huésped que escribe
  clienteEmail?: string; // consultas: para identificar la conversación
}

export type EstadoPresupuesto = "pendiente" | "aprobado" | "rechazado";

export interface Presupuesto {
  id: string;
  proveedorId: string;
  ambito: AmbitoGasto;  // unidad | grupo (a qué refiere)
  refId: string;
  descripcion: string;
  monto: number;
  fecha: string;        // ISO
  estado: EstadoPresupuesto;
  comprobante?: string; // imagen del presupuesto
  nota: string;
}

// Gasto recurrente o disparado por un evento (genera Gastos reales automáticamente).
export type Frecuencia = "Quincenal" | "Mensual" | "Bimestral" | "Trimestral" | "Anual" | "Por check-out";
export const FRECUENCIAS: Frecuencia[] = ["Quincenal", "Mensual", "Bimestral", "Trimestral", "Anual", "Por check-out"];

// Color por frecuencia (chip): cada una con su tono para identificarlas de un vistazo.
export const COLOR_FRECUENCIA: Record<Frecuencia, { bg: string; texto: string }> = {
  Quincenal: { bg: "bg-sky-100 dark:bg-sky-500/15", texto: "text-sky-700 dark:text-sky-300" },
  Mensual: { bg: "bg-teal-100 dark:bg-teal-500/15", texto: "text-teal-700 dark:text-teal-300" },
  Bimestral: { bg: "bg-blue-100 dark:bg-blue-500/15", texto: "text-blue-700 dark:text-blue-300" },
  Trimestral: { bg: "bg-violet-100 dark:bg-violet-500/15", texto: "text-violet-700 dark:text-violet-300" },
  Anual: { bg: "bg-amber-100 dark:bg-amber-500/15", texto: "text-amber-700 dark:text-amber-300" },
  "Por check-out": { bg: "bg-rose-100 dark:bg-rose-500/15", texto: "text-rose-700 dark:text-rose-300" },
};

export interface GastoProgramado {
  id: string;
  ambito: AmbitoGasto;
  refId: string;
  categoria: CategoriaGasto;
  descripcion: string;
  monto: number;
  proveedor: string;
  frecuencia: Frecuencia;
  fechaInicio: string; // ISO yyyy-mm-dd (para las basadas en fecha)
  activo: boolean;
  variable?: boolean; // importe variable (luz, gas, expensas…): se carga el monto cada mes
}

export const CATEGORIAS_GASTO: CategoriaGasto[] = [
  "Limpieza",
  "Mantenimiento",
  "Reparación",
  "Servicios",
  "Impuestos",
  "Comisión",
  "Otro",
];

// Color por categoría de gasto: clases para chips + hex para gráficos.
export const COLOR_CATEGORIA: Record<CategoriaGasto, { bg: string; texto: string; hex: string }> = {
  Limpieza: { bg: "bg-sky-100 dark:bg-sky-500/15", texto: "text-sky-700 dark:text-sky-300", hex: "#0ea5e9" },
  Mantenimiento: { bg: "bg-amber-100 dark:bg-amber-500/15", texto: "text-amber-700 dark:text-amber-300", hex: "#f59e0b" },
  "Reparación": { bg: "bg-rose-100 dark:bg-rose-500/15", texto: "text-rose-700 dark:text-rose-300", hex: "#ef4444" },
  Servicios: { bg: "bg-violet-100 dark:bg-violet-500/15", texto: "text-violet-700 dark:text-violet-300", hex: "#8b5cf6" },
  Impuestos: { bg: "bg-slate-200 dark:bg-slate-600", texto: "text-slate-700 dark:text-slate-200", hex: "#64748b" },
  "Comisión": { bg: "bg-pink-100 dark:bg-pink-500/15", texto: "text-pink-700 dark:text-pink-300", hex: "#ec4899" },
  Otro: { bg: "bg-emerald-100 dark:bg-emerald-500/15", texto: "text-emerald-700 dark:text-emerald-300", hex: "#10b981" },
};

export const CANALES: Canal[] = ["Airbnb", "Booking", "Vrbo", "WhatsApp", "Directo", "Otro"];

// Colores por canal (clases Tailwind + hex) para pintar el calendario y las etiquetas.
export const COLOR_CANAL: Record<Canal, { bg: string; texto: string; punto: string; hex: string }> = {
  Airbnb: { bg: "bg-rose-100", texto: "text-rose-700", punto: "bg-rose-500", hex: "#f43f5e" },
  Booking: { bg: "bg-blue-100", texto: "text-blue-700", punto: "bg-blue-600", hex: "#2563eb" },
  Vrbo: { bg: "bg-amber-100", texto: "text-amber-700", punto: "bg-amber-500", hex: "#f59e0b" },
  WhatsApp: { bg: "bg-green-100", texto: "text-green-700", punto: "bg-green-500", hex: "#22c55e" },
  Directo: { bg: "bg-violet-100", texto: "text-violet-700", punto: "bg-violet-500", hex: "#8b5cf6" },
  Otro: { bg: "bg-slate-100", texto: "text-slate-700", punto: "bg-slate-500", hex: "#64748b" },
};
