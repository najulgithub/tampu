"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { hoyISO, formatearFecha } from "@/lib/fechas";
import { CATEGORIAS_GASTO, FRECUENCIAS, COLOR_CATEGORIA, COLOR_FRECUENCIA, PAGADO_POR, RUBROS_PROVEEDOR, planPorUnidades, CATEGORIAS_INGRESO } from "@/lib/types";
import type { AmbitoGasto, CategoriaGasto, Gasto, RepartoItem, GastoProgramado, Frecuencia, PagadoPor, Proveedor, Presupuesto, EstadoPresupuesto, Ingreso, CategoriaIngreso } from "@/lib/types";
import { Overlay, Campo } from "@/components/ui";
import InputMonto from "@/components/InputMonto";
import { Monto } from "@/components/Monto";
import { subirArchivo } from "@/lib/storage";

type TabGasto = "mov" | "ing" | "prog" | "prov" | "pres";

export default function Gastos() {
  const [tab, setTab] = useState<TabGasto>("mov");
  const tabs: { v: TabGasto; label: string }[] = [
    { v: "mov", label: "Movimientos" },
    { v: "ing", label: "Otros ingresos" },
    { v: "prog", label: "Programados" },
    { v: "prov", label: "Proveedores" },
    { v: "pres", label: "Presupuestos" },
  ];
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-1">Gastos</h1>
      <div className="flex gap-1 mb-5 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className={tab === t.v
              ? "px-4 py-2 text-sm font-medium text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400 -mb-px whitespace-nowrap"
              : "px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 whitespace-nowrap"}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "mov" ? <Movimientos /> : tab === "ing" ? <Ingresos /> : tab === "prog" ? <Programados /> : tab === "prov" ? <Proveedores /> : <Presupuestos />}
    </div>
  );
}

// Estrellas de puntuación (lectura o edición).
function Estrellas({ valor, onChange, size = 16 }: { valor: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n === valor ? 0 : n)}
          className={`${onChange ? "cursor-pointer" : "cursor-default"} leading-none`}
          style={{ fontSize: size }}
          aria-label={`${n} estrellas`}
        >
          <span className={n <= valor ? "text-amber-400" : "text-slate-300 dark:text-slate-600"}>★</span>
        </button>
      ))}
    </span>
  );
}

function Movimientos() {
  const { gastos, unidades, grupos, getUnidad, nombreGrupo, puedeEditar } = useStore();
  const puedeEdit = puedeEditar("gastos");
  const [abrirNuevo, setAbrirNuevo] = useState(false);
  const [editando, setEditando] = useState<Gasto | undefined>();
  const [filtro, setFiltro] = useState(""); // "", "u:<id>", "g:<id>"

  const etiquetaAmbito = (g: Gasto) =>
    g.ambito === "general"
      ? "Negocio (general)"
      : g.ambito === "unidad"
      ? getUnidad(g.refId)?.nombre ?? "Unidad eliminada"
      : `${nombreGrupo(g.refId)} (grupo)`;

  // Para el filtro por unidad incluimos los gastos de grupo que la prorratean.
  const coincide = (g: Gasto) => {
    if (!filtro) return true;
    if (g.ambito === "general") return false; // los generales solo se ven en "Todos"
    const [tipo, id] = filtro.split(":");
    if (tipo === "g") return g.ambito === "grupo" && g.refId === id;
    // tipo === "u"
    if (g.ambito === "unidad") return g.refId === id;
    return Boolean(g.reparto?.some((r) => r.unidadId === id));
  };

  const lista = gastos.filter(coincide).sort((a, b) => b.fecha.localeCompare(a.fecha));

  // Total: si filtramos por unidad, sumamos la parte prorrateada; si no, el monto completo.
  const filtraUnidad = filtro.startsWith("u:");
  const unidadFiltro = filtraUnidad ? filtro.slice(2) : "";
  const montoVisible = (g: Gasto) => {
    if (filtraUnidad && g.ambito === "grupo") {
      const item = g.reparto?.find((r) => r.unidadId === unidadFiltro);
      return item ? Math.round((g.monto * item.porcentaje) / 100) : 0;
    }
    return g.monto;
  };
  const total = lista.reduce((acc, g) => acc + montoVisible(g), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {lista.length} {lista.length === 1 ? "gasto" : "gastos"} · Total{" "}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            <Monto valor={total} />
          </span>
        </p>
        {puedeEdit && (
          <button
            onClick={() => setAbrirNuevo(true)}
            className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition"
          >
            + Agregar gasto
          </button>
        )}
      </div>

      {/* Filtro */}
      <div className="mb-4">
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="input max-w-xs">
          <option value="">Todos los gastos</option>
          <optgroup label="Unidades">
            {unidades.map((u) => (
              <option key={u.id} value={`u:${u.id}`}>{u.nombre}</option>
            ))}
          </optgroup>
          <optgroup label="Grupos">
            {grupos.map((g) => (
              <option key={g.id} value={`g:${g.id}`}>{g.nombre}</option>
            ))}
          </optgroup>
        </select>
        {filtraUnidad && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Mostrando la parte prorrateada de los gastos de grupo.
          </p>
        )}
      </div>

      {lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-10 text-center text-slate-500 dark:text-slate-400">
          No hay gastos cargados {filtro && "para este filtro"}.
        </div>
      ) : (
        <div className="space-y-2">
          {lista.map((g) => (
            <button
              key={g.id}
              onClick={() => setEditando(g)}
              className="w-full text-left flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-3 hover:border-teal-400 dark:hover:border-teal-500 transition"
            >
              <span className={`shrink-0 text-xs px-2 py-1 rounded-full ${COLOR_CATEGORIA[g.categoria].bg} ${COLOR_CATEGORIA[g.categoria].texto}`}>
                {g.categoria}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                  {g.descripcion || g.categoria}
                  {g.pagadoPor === "inquilino" && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">pagó inquilino</span>}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {etiquetaAmbito(g)} · {formatearFecha(g.fecha)}
                  {g.proveedor && ` · ${g.proveedor}`}
                  {g.ambito === "grupo" && " · prorrateado"}
                  {g.claveOrigen && " · auto"}
                  {g.comprobante && " · 📎"}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  <Monto valor={montoVisible(g)} />
                </div>
                {filtraUnidad && g.ambito === "grupo" && (
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    de <Monto valor={g.monto} />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {abrirNuevo && <FormGasto onCerrar={() => setAbrirNuevo(false)} />}
      {editando && <FormGasto gasto={editando} onCerrar={() => setEditando(undefined)} />}
    </div>
  );
}

// ---------- Pestaña Otros ingresos ----------
function Ingresos() {
  const { ingresos, getUnidad, nombreGrupo, puedeEditar } = useStore();
  const puedeEdit = puedeEditar("gastos");
  const [abrir, setAbrir] = useState(false);
  const [editando, setEditando] = useState<Ingreso | undefined>();

  const lista = [...ingresos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const total = lista.reduce((a, i) => a + i.monto, 0);

  const etiqueta = (i: Ingreso) =>
    i.ambito === "general"
      ? "Negocio (general)"
      : i.ambito === "unidad"
      ? getUnidad(i.refId)?.nombre ?? "Unidad eliminada"
      : `${nombreGrupo(i.refId)} (grupo)`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ingresos que no son alquiler: venta de muebles, electrodomésticos, reintegros… Suman en el informe económico.{" "}
          {lista.length > 0 && <>Total <span className="font-medium text-slate-700 dark:text-slate-200"><Monto valor={total} /></span></>}
        </p>
        {puedeEdit && (
          <button onClick={() => setAbrir(true)} className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition shrink-0">
            + Ingreso
          </button>
        )}
      </div>

      {lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-10 text-center text-slate-500 dark:text-slate-400">
          No cargaste otros ingresos.
        </div>
      ) : (
        <div className="space-y-2">
          {lista.map((i) => (
            <button
              key={i.id}
              onClick={() => setEditando(i)}
              className="w-full text-left flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-3 hover:border-teal-400 dark:hover:border-teal-500 transition"
            >
              <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">{i.categoria}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{i.descripcion || i.categoria}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{etiqueta(i)} · {formatearFecha(i.fecha)}{i.ambito === "grupo" && " · prorrateado"}</div>
              </div>
              <div className="shrink-0 text-sm font-medium text-emerald-600 dark:text-emerald-400">+<Monto valor={i.monto} /></div>
            </button>
          ))}
        </div>
      )}

      {abrir && <FormIngreso onCerrar={() => setAbrir(false)} />}
      {editando && <FormIngreso ingreso={editando} onCerrar={() => setEditando(undefined)} />}
    </div>
  );
}

function FormIngreso({ ingreso, onCerrar }: { ingreso?: Ingreso; onCerrar: () => void }) {
  const { unidades, grupos, addIngreso, updateIngreso, deleteIngreso } = useStore();
  const esEdicion = Boolean(ingreso);
  const [ambito, setAmbito] = useState<AmbitoGasto>(ingreso?.ambito ?? "unidad");
  const [refId, setRefId] = useState(ingreso?.refId ?? unidades[0]?.id ?? "");
  const [fecha, setFecha] = useState(ingreso?.fecha ?? hoyISO());
  const [categoria, setCategoria] = useState<CategoriaIngreso>(ingreso?.categoria ?? "Venta");
  const [descripcion, setDescripcion] = useState(ingreso?.descripcion ?? "");
  const [monto, setMonto] = useState(ingreso?.monto ?? 0);

  const opciones = ambito === "unidad" ? unidades : grupos;
  const valido = (ambito === "general" || refId) && monto > 0 && fecha;

  function cambiarAmbito(a: AmbitoGasto) {
    setAmbito(a);
    setRefId(a === "general" ? "" : (a === "unidad" ? unidades[0]?.id : grupos[0]?.id) ?? "");
  }

  // Reparto equitativo entre las unidades del grupo (snapshot).
  function repartoEqui(grupoId: string): RepartoItem[] | undefined {
    const us = unidades.filter((u) => u.grupoId === grupoId);
    if (us.length === 0) return undefined;
    const base = Math.floor((100 / us.length) * 100) / 100;
    const r = us.map((u) => ({ unidadId: u.id, porcentaje: base }));
    r[r.length - 1].porcentaje = Math.round((base + (100 - base * us.length)) * 100) / 100;
    return r;
  }

  function guardar() {
    if (!valido) return;
    const datos = {
      ambito, refId, fecha, categoria, descripcion: descripcion.trim(), monto,
      reparto: ambito === "grupo" ? repartoEqui(refId) : undefined,
    };
    if (esEdicion && ingreso) updateIngreso(ingreso.id, datos);
    else addIngreso(datos);
    onCerrar();
  }

  return (
    <Overlay titulo={esEdicion ? "Editar ingreso" : "Nuevo ingreso"} onCerrar={onCerrar}>
      <form onSubmit={(e) => { e.preventDefault(); guardar(); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Imputar a">
            <select value={ambito} onChange={(e) => cambiarAmbito(e.target.value as AmbitoGasto)} className="input">
              <option value="unidad">Una unidad</option>
              <option value="grupo">Un grupo</option>
              <option value="general">Todo el negocio</option>
            </select>
          </Campo>
          {ambito === "general" ? (
            <Campo label="Reparto">
              <p className="text-xs text-slate-400 dark:text-slate-500 pt-2.5">Se prorratea entre todas las unidades.</p>
            </Campo>
          ) : (
            <Campo label={ambito === "unidad" ? "Unidad" : "Grupo"}>
              <select value={refId} onChange={(e) => setRefId(e.target.value)} className="input">
                {opciones.length === 0 && <option value="">— ninguno —</option>}
                {opciones.map((o) => (<option key={o.id} value={o.id}>{o.nombre}</option>))}
              </select>
              {ambito === "grupo" && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Se reparte en partes iguales entre las unidades del grupo.</p>}
            </Campo>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Fecha">
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input" />
          </Campo>
          <Campo label="Categoría">
            <select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaIngreso)} className="input">
              {CATEGORIAS_INGRESO.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </Campo>
        </div>

        <Campo label="Descripción">
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="input" placeholder="ej: Venta de heladera vieja" />
        </Campo>
        <Campo label="Monto ($)">
          <InputMonto value={monto} onChange={setMonto} />
        </Campo>

        <div className="flex justify-between items-center pt-2">
          {esEdicion ? (
            <button type="button" onClick={() => { if (ingreso && confirm("¿Eliminar este ingreso?")) { deleteIngreso(ingreso.id); onCerrar(); } }} className="text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400">Eliminar</button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onCerrar} className="btn-secundario">Cancelar</button>
            <button type="submit" disabled={!valido} className="btn-primario">Guardar</button>
          </div>
        </div>
      </form>
    </Overlay>
  );
}

// ---------- Pestaña Programados ----------
function Programados() {
  const { gastosProgramados, getUnidad, nombreGrupo, puedeEditar, unidades, suscripcion, addProgramado } = useStore();
  const puedeEdit = puedeEditar("gastos");
  const [abrir, setAbrir] = useState(false);
  const [editando, setEditando] = useState<GastoProgramado | undefined>();

  const etiqueta = (p: GastoProgramado) =>
    p.ambito === "general"
      ? "Negocio (general)"
      : p.ambito === "unidad"
      ? getUnidad(p.refId)?.nombre ?? "Unidad eliminada"
      : `${nombreGrupo(p.refId)} (grupo)`;

  // ¿Ya está cargado el gasto de la suscripción a tampu?
  const yaEstaTampu = gastosProgramados.some((p) => p.proveedor === "tampu");
  const precioTampu = suscripcion?.precio ?? planPorUnidades(unidades.length).precio;

  function agregarTampu() {
    if (yaEstaTampu || precioTampu <= 0) return;
    addProgramado({
      ambito: "general",
      refId: "",
      categoria: "Servicios",
      descripcion: "Suscripción tampu",
      monto: precioTampu,
      proveedor: "tampu",
      frecuencia: "Mensual",
      fechaInicio: hoyISO(),
      activo: true,
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gastos que se generan solos: por frecuencia o cuando se va un huésped.
        </p>
        {puedeEdit && (
          <button onClick={() => setAbrir(true)} className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition shrink-0">
            + Programar gasto
          </button>
        )}
      </div>

      {puedeEdit && !yaEstaTampu && precioTampu > 0 && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-teal-200 dark:border-teal-500/30 bg-teal-50/60 dark:bg-teal-500/10 p-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">¿Sumás tu suscripción a tampu como gasto?</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Mensual de ${precioTampu.toLocaleString("es-AR")}, prorrateado entre tus unidades.</div>
          </div>
          <button onClick={agregarTampu} className="shrink-0 rounded-lg bg-teal-600 text-white px-3 py-2 text-sm font-medium hover:bg-teal-700 transition">
            Agregame como gasto
          </button>
        </div>
      )}

      {gastosProgramados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-10 text-center text-slate-500 dark:text-slate-400">
          No hay gastos programados.
        </div>
      ) : (
        <div className="space-y-2">
          {gastosProgramados.map((p) => (
            <button
              key={p.id}
              onClick={() => setEditando(p)}
              className="w-full text-left flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-3 hover:border-teal-400 dark:hover:border-teal-500 transition"
            >
              <span className={`shrink-0 text-xs px-2 py-1 rounded-full ${COLOR_FRECUENCIA[p.frecuencia].bg} ${COLOR_FRECUENCIA[p.frecuencia].texto}`}>
                {p.frecuencia}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                  {p.descripcion || p.categoria}
                  {!p.activo && <span className="text-xs text-slate-400 dark:text-slate-500"> · pausado</span>}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{etiqueta(p)} · {p.categoria}</div>
              </div>
              <div className="shrink-0 text-sm font-medium text-slate-700 dark:text-slate-200">
                ${p.monto.toLocaleString("es-AR")}
              </div>
            </button>
          ))}
        </div>
      )}

      {abrir && <FormProgramado onCerrar={() => setAbrir(false)} />}
      {editando && <FormProgramado programado={editando} onCerrar={() => setEditando(undefined)} />}
    </div>
  );
}

function FormProgramado({ programado, onCerrar }: { programado?: GastoProgramado; onCerrar: () => void }) {
  const { unidades, grupos, addProgramado, updateProgramado, deleteProgramado } = useStore();
  const esEdicion = Boolean(programado);

  const [ambito, setAmbito] = useState<AmbitoGasto>(programado?.ambito ?? "unidad");
  const [refId, setRefId] = useState(programado?.refId ?? unidades[0]?.id ?? "");
  const [categoria, setCategoria] = useState<CategoriaGasto>(programado?.categoria ?? "Servicios");
  const [descripcion, setDescripcion] = useState(programado?.descripcion ?? "");
  const [monto, setMonto] = useState(programado?.monto ?? 0);
  const [proveedor, setProveedor] = useState(programado?.proveedor ?? "");
  const [frecuencia, setFrecuencia] = useState<Frecuencia>(programado?.frecuencia ?? "Mensual");
  const [fechaInicio, setFechaInicio] = useState(programado?.fechaInicio ?? hoyISO());
  const [activo, setActivo] = useState(programado?.activo ?? true);

  const opciones = ambito === "unidad" ? unidades : grupos;
  const valido = (ambito === "general" || refId) && monto > 0;
  const porEvento = frecuencia === "Por check-out";

  function guardar() {
    if (!valido) return;
    const datos = { ambito, refId, categoria, descripcion: descripcion.trim(), monto, proveedor: proveedor.trim(), frecuencia, fechaInicio, activo };
    if (esEdicion && programado) updateProgramado(programado.id, datos);
    else addProgramado(datos);
    onCerrar();
  }

  return (
    <Overlay titulo={esEdicion ? "Editar gasto programado" : "Programar gasto"} onCerrar={onCerrar}>
      <form onSubmit={(e) => { e.preventDefault(); guardar(); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Imputar a">
            <select value={ambito} onChange={(e) => { const a = e.target.value as AmbitoGasto; setAmbito(a); setRefId(a === "general" ? "" : (a === "unidad" ? unidades[0]?.id : grupos[0]?.id) ?? ""); }} className="input">
              <option value="unidad">Una unidad</option>
              <option value="grupo">Un grupo</option>
              <option value="general">Todo el negocio</option>
            </select>
          </Campo>
          {ambito === "general" ? (
            <Campo label="Reparto">
              <p className="text-xs text-slate-400 dark:text-slate-500 pt-2.5">Se prorratea entre todas las unidades.</p>
            </Campo>
          ) : (
            <Campo label={ambito === "unidad" ? "Unidad" : "Grupo"}>
              <select value={refId} onChange={(e) => setRefId(e.target.value)} className="input">
                {opciones.map((o) => (<option key={o.id} value={o.id}>{o.nombre}</option>))}
              </select>
            </Campo>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Frecuencia">
            <select value={frecuencia} onChange={(e) => setFrecuencia(e.target.value as Frecuencia)} className="input">
              {FRECUENCIAS.map((f) => (<option key={f} value={f}>{f}</option>))}
            </select>
          </Campo>
          {!porEvento && (
            <Campo label="Desde">
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="input" />
            </Campo>
          )}
        </div>

        {porEvento && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Se generará un gasto automáticamente en cada check-out de {ambito === "unidad" ? "la unidad" : "las unidades del grupo"}.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Categoría">
            <select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaGasto)} className="input">
              {CATEGORIAS_GASTO.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </Campo>
          <Campo label="Monto ($)">
            <InputMonto value={monto} onChange={setMonto} />
          </Campo>
        </div>

        <Campo label="Descripción">
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="input" placeholder="ej: Expensas mensuales" />
        </Campo>
        <Campo label="Proveedor">
          <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} className="input" placeholder="opcional" />
        </Campo>

        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
          Activo
        </label>

        <div className="flex justify-between items-center pt-2">
          {esEdicion ? (
            <button type="button" onClick={() => { if (programado && confirm("¿Eliminar este programado y los gastos que generó?")) { deleteProgramado(programado.id); onCerrar(); } }} className="text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400">
              Eliminar
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onCerrar} className="btn-secundario">Cancelar</button>
            <button type="submit" disabled={!valido} className="btn-primario">Guardar</button>
          </div>
        </div>
      </form>
    </Overlay>
  );
}

function FormGasto({ gasto, onCerrar, presupuesto }: { gasto?: Gasto; onCerrar: () => void; presupuesto?: Presupuesto }) {
  const { unidades, grupos, addGasto, updateGasto, deleteGasto, proveedores } = useStore();
  const esEdicion = Boolean(gasto);

  const [ambito, setAmbito] = useState<AmbitoGasto>(gasto?.ambito ?? presupuesto?.ambito ?? "unidad");
  const [refId, setRefId] = useState(gasto?.refId ?? presupuesto?.refId ?? unidades[0]?.id ?? "");
  const [fecha, setFecha] = useState(gasto?.fecha ?? hoyISO());
  const [categoria, setCategoria] = useState<CategoriaGasto>(gasto?.categoria ?? "Mantenimiento");
  const [descripcion, setDescripcion] = useState(gasto?.descripcion ?? presupuesto?.descripcion ?? "");
  const [monto, setMonto] = useState(gasto?.monto ?? presupuesto?.monto ?? 0);
  const [proveedor, setProveedor] = useState(gasto?.proveedor ?? "");
  const [pagadoPor, setPagadoPor] = useState<PagadoPor>(gasto?.pagadoPor ?? "dueno");
  const [comprobante, setComprobante] = useState<string | undefined>(gasto?.comprobante);
  const [proveedorId, setProveedorId] = useState(gasto?.proveedorId ?? presupuesto?.proveedorId ?? "");
  const [rating, setRating] = useState(gasto?.rating ?? 0);
  const [ratingNota, setRatingNota] = useState(gasto?.ratingNota ?? "");
  // % por unidad (solo aplica a gastos de grupo)
  const [pct, setPct] = useState<Record<string, number>>(() =>
    gasto?.ambito === "grupo" && gasto.reparto
      ? Object.fromEntries(gasto.reparto.map((r) => [r.unidadId, r.porcentaje]))
      : {}
  );
  // Cómo se cargan los valores del reparto: por porcentaje o por monto en $.
  const [modoReparto, setModoReparto] = useState<"pct" | "monto">("pct");

  const opciones = ambito === "unidad" ? unidades : grupos;
  const unidadesDelGrupo = ambito === "grupo" ? unidades.filter((u) => u.grupoId === refId) : [];
  const sumaPct = unidadesDelGrupo.reduce((acc, u) => acc + (pct[u.id] ?? 0), 0);
  const repartoOk = ambito === "unidad" || ambito === "general" || (unidadesDelGrupo.length > 0 && Math.abs(sumaPct - 100) < 0.01);
  const valido = (ambito === "general" || refId) && monto > 0 && fecha && repartoOk;

  function equalSplitFor(grupoId: string): Record<string, number> {
    const us = unidades.filter((u) => u.grupoId === grupoId);
    if (us.length === 0) return {};
    const base = Math.floor((100 / us.length) * 100) / 100;
    const next: Record<string, number> = {};
    us.forEach((u) => (next[u.id] = base));
    const resto = Math.round((100 - base * us.length) * 100) / 100;
    const ultima = us[us.length - 1].id;
    next[ultima] = Math.round((base + resto) * 100) / 100;
    return next;
  }

  function cambiarAmbito(nuevo: AmbitoGasto) {
    setAmbito(nuevo);
    if (nuevo === "general") {
      setRefId("");
      setPct({});
    } else if (nuevo === "unidad") {
      setRefId(unidades[0]?.id ?? "");
      setPct({});
    } else {
      const primer = grupos[0]?.id ?? "";
      setRefId(primer);
      setPct(equalSplitFor(primer));
    }
  }

  function cambiarGrupo(id: string) {
    setRefId(id);
    setPct(equalSplitFor(id));
  }

  // Reparte el porcentaje que falta (100 - lo ya asignado) en partes iguales
  // entre las unidades que todavía están en cero. Ej: fijás una en $1.000.000
  // y el resto se divide solo entre las demás.
  function distribuirResto() {
    const us = unidadesDelGrupo;
    if (us.length === 0) return;
    const ceros = us.filter((u) => !(pct[u.id] > 0));
    const sumaFijos = us.reduce((a, u) => a + (pct[u.id] ?? 0), 0);
    const resto = Math.round((100 - sumaFijos) * 100) / 100;
    if (ceros.length === 0 || resto <= 0) return;
    const cada = Math.floor((resto / ceros.length) * 100) / 100;
    const next = { ...pct };
    ceros.forEach((u) => (next[u.id] = cada));
    const ajuste = Math.round((resto - cada * ceros.length) * 100) / 100;
    const ultima = ceros[ceros.length - 1].id;
    next[ultima] = Math.round((cada + ajuste) * 100) / 100;
    setPct(next);
  }

  // Convierte un monto en $ a porcentaje según el total del gasto.
  function setPorMonto(unidadId: string, amount: number) {
    const p = monto > 0 ? (amount / monto) * 100 : 0;
    setPct((prev) => ({ ...prev, [unidadId]: Math.round(p * 100) / 100 }));
  }

  function guardar() {
    if (!valido) return;
    const reparto: RepartoItem[] | undefined =
      ambito === "grupo"
        ? unidadesDelGrupo.map((u) => ({ unidadId: u.id, porcentaje: pct[u.id] ?? 0 }))
        : undefined;
    const datos = {
      ambito, refId, fecha, categoria,
      descripcion: descripcion.trim(), monto, proveedor: proveedor.trim(),
      reparto, pagadoPor, comprobante,
      proveedorId: proveedorId || undefined,
      presupuestoId: gasto?.presupuestoId ?? presupuesto?.id,
      rating: rating || undefined,
      ratingNota: ratingNota.trim() || undefined,
    };
    if (esEdicion && gasto) updateGasto(gasto.id, datos);
    else addGasto(datos);
    onCerrar();
  }

  return (
    <Overlay titulo={esEdicion ? "Editar gasto" : "Nuevo gasto"} onCerrar={onCerrar}>
      <form onSubmit={(e) => { e.preventDefault(); guardar(); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Imputar a">
            <select value={ambito} onChange={(e) => cambiarAmbito(e.target.value as AmbitoGasto)} className="input">
              <option value="unidad">Una unidad</option>
              <option value="grupo">Un grupo</option>
              <option value="general">Todo el negocio</option>
            </select>
          </Campo>
          {ambito === "general" ? (
            <Campo label="Reparto">
              <p className="text-xs text-slate-400 dark:text-slate-500 pt-2.5">Se prorratea entre todas las unidades.</p>
            </Campo>
          ) : (
            <Campo label={ambito === "unidad" ? "Unidad" : "Grupo"}>
              <select
                value={refId}
                onChange={(e) => (ambito === "grupo" ? cambiarGrupo(e.target.value) : setRefId(e.target.value))}
                className="input"
              >
                {opciones.length === 0 && <option value="">— ninguno —</option>}
                {opciones.map((o) => (
                  <option key={o.id} value={o.id}>{o.nombre}</option>
                ))}
              </select>
            </Campo>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Fecha">
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input" />
          </Campo>
          <Campo label="Categoría">
            <select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaGasto)} className="input">
              {CATEGORIAS_GASTO.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Campo>
        </div>

        <Campo label="Descripción">
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="input" placeholder="ej: Pintura general" />
        </Campo>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Monto ($)">
            <InputMonto value={monto} onChange={setMonto} />
          </Campo>
          <Campo label="Proveedor">
            <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} className="input" placeholder="opcional" />
          </Campo>
        </div>

        <Campo label="¿Quién lo pagó?">
          <select value={pagadoPor} onChange={(e) => setPagadoPor(e.target.value as PagadoPor)} className="input">
            {PAGADO_POR.map((p) => (<option key={p.valor} value={p.valor}>{p.label}</option>))}
          </select>
          {pagadoPor === "inquilino" && (
            <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
              {ambito === "unidad"
                ? "Se le acreditará al inquilino contra el alquiler del mes del gasto."
                : "El crédito al inquilino solo aplica a gastos de una unidad puntual."}
            </p>
          )}
        </Campo>

        <Campo label="Comprobante / factura">
          <div className="flex items-center gap-2">
            <label className="btn-secundario cursor-pointer text-xs">
              {comprobante ? "Cambiar" : "Adjuntar imagen"}
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setComprobante(await subirArchivo(f, "comprobantes"));
                e.target.value = "";
              }} />
            </label>
            {comprobante && (
              <>
                <a href={comprobante} target="_blank" rel="noreferrer" className="text-xs text-teal-600 dark:text-teal-400 hover:underline">ver</a>
                <button type="button" onClick={() => setComprobante(undefined)} className="text-xs text-slate-400 hover:text-rose-600">quitar</button>
              </>
            )}
          </div>
          {comprobante && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={comprobante} alt="Comprobante" className="mt-2 rounded-lg max-h-32 ring-1 ring-black/5" />
          )}
        </Campo>

        <Campo label="Proveedor (opcional)">
          <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className="input">
            <option value="">— ninguno —</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.rubro ? ` · ${p.rubro}` : ""}</option>)}
          </select>
        </Campo>

        {proveedorId && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Puntuación del trabajo</span>
              <Estrellas valor={rating} onChange={setRating} size={22} />
            </div>
            <input value={ratingNota} onChange={(e) => setRatingNota(e.target.value)} placeholder="¿Cómo fue el trabajo? (opcional)" className="input mt-2" />
          </div>
        )}

        {/* Reparto entre unidades del grupo */}
        {ambito === "grupo" && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-3">
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Reparto por unidad</span>
              {/* Toggle %/$ */}
              <div className="flex rounded-md border border-slate-300 dark:border-slate-600 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setModoReparto("pct")}
                  className={modoReparto === "pct" ? "px-2 py-1 bg-teal-600 text-white" : "px-2 py-1 text-slate-500 dark:text-slate-400"}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setModoReparto("monto")}
                  className={modoReparto === "monto" ? "px-2 py-1 bg-teal-600 text-white" : "px-2 py-1 text-slate-500 dark:text-slate-400"}
                >
                  $
                </button>
              </div>
            </div>

            {unidadesDelGrupo.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Este grupo no tiene unidades. Asigná unidades al grupo primero.
              </p>
            ) : (
              <div className="space-y-2">
                {unidadesDelGrupo.map((u) => {
                  const p = pct[u.id] ?? 0;
                  const parte = Math.round((monto * p) / 100);
                  return (
                    <div key={u.id} className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 dark:text-slate-300 flex-1 truncate">{u.nombre}</span>
                      {modoReparto === "pct" ? (
                        <>
                          <input
                            type="number" min={0} max={100} step="0.01"
                            value={p}
                            onChange={(e) =>
                              setPct((prev) => ({ ...prev, [u.id]: Math.max(0, Math.min(100, Number(e.target.value))) }))
                            }
                            className="input w-20 text-right"
                          />
                          <span className="text-xs text-slate-400 dark:text-slate-500 w-3">%</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 w-24 text-right">
                            ${parte.toLocaleString("es-AR")}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-slate-400 dark:text-slate-500">$</span>
                          <InputMonto value={parte} onChange={(n) => setPorMonto(u.id, n)} className="w-28" />
                          <span className="text-xs text-slate-500 dark:text-slate-400 w-12 text-right">
                            {p.toFixed(1)}%
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}

                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setPct(equalSplitFor(refId))} className="text-xs text-teal-600 dark:text-teal-400 hover:underline">
                      Partes iguales
                    </button>
                    <button type="button" onClick={distribuirResto} className="text-xs text-teal-600 dark:text-teal-400 hover:underline">
                      Distribuir resto
                    </button>
                  </div>
                  <span className={`text-xs ${Math.abs(sumaPct - 100) < 0.01 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {modoReparto === "monto"
                      ? `$${Math.round((monto * sumaPct) / 100).toLocaleString("es-AR")} / $${monto.toLocaleString("es-AR")}`
                      : `Suma: ${sumaPct.toFixed(2)}%`}
                    {Math.abs(sumaPct - 100) >= 0.01 && " ⚠"}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          {esEdicion ? (
            <button
              type="button"
              onClick={() => {
                if (gasto && confirm("¿Eliminar este gasto?")) {
                  deleteGasto(gasto.id);
                  onCerrar();
                }
              }}
              className="text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400"
            >
              Eliminar
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onCerrar} className="btn-secundario">Cancelar</button>
            <button type="submit" disabled={!valido} className="btn-primario">Guardar</button>
          </div>
        </div>
      </form>
    </Overlay>
  );
}

// ==================== PROVEEDORES ====================
function Proveedores() {
  const { proveedores, ratingProveedor, trabajosDe, puedeEditar } = useStore();
  const puedeEdit = puedeEditar("gastos");
  const [abrir, setAbrir] = useState(false);
  const [editando, setEditando] = useState<Proveedor | undefined>();

  const orden = [...proveedores].sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">{proveedores.length} {proveedores.length === 1 ? "proveedor" : "proveedores"}</p>
        {puedeEdit && <button onClick={() => setAbrir(true)} className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition">+ Proveedor</button>}
      </div>

      {orden.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-10 text-center text-slate-500 dark:text-slate-400">
          Cargá tus electricistas, gasistas, pintores… para tener sus contactos y el histórico de trabajos.
        </div>
      ) : (
        <div className="space-y-2">
          {orden.map((p) => {
            const rt = ratingProveedor(p.id);
            const trabajos = trabajosDe(p.id).length;
            return (
              <button key={p.id} onClick={() => setEditando(p)} className="w-full text-left flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-3 hover:border-teal-400 dark:hover:border-teal-500 transition">
                <span className="shrink-0 w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 grid place-items-center text-sm font-semibold text-slate-600 dark:text-slate-200 uppercase">{p.nombre.trim().charAt(0) || "?"}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                    {p.nombre}
                    {p.rubro && <span className="text-xs text-slate-400 dark:text-slate-500"> · {p.rubro}</span>}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {[p.telefono, p.email].filter(Boolean).join(" · ") || "Sin contacto"}
                    {!p.visibleInquilino && " · oculto al inquilino"}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {rt.cantidad > 0 ? (
                    <>
                      <Estrellas valor={Math.round(rt.promedio)} size={13} />
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">{rt.promedio.toFixed(1)} · {trabajos} {trabajos === 1 ? "trabajo" : "trabajos"}</div>
                    </>
                  ) : (
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">{trabajos > 0 ? `${trabajos} sin puntuar` : "sin trabajos"}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {abrir && <FormProveedor onCerrar={() => setAbrir(false)} />}
      {editando && <FormProveedor proveedor={editando} onCerrar={() => setEditando(undefined)} />}
    </div>
  );
}

function FormProveedor({ proveedor, onCerrar }: { proveedor?: Proveedor; onCerrar: () => void }) {
  const { addProveedor, updateProveedor, deleteProveedor, trabajosDe } = useStore();
  const esEdicion = Boolean(proveedor);
  const [nombre, setNombre] = useState(proveedor?.nombre ?? "");
  const [rubro, setRubro] = useState(proveedor?.rubro ?? "");
  const [telefono, setTelefono] = useState(proveedor?.telefono ?? "");
  const [email, setEmail] = useState(proveedor?.email ?? "");
  const [notas, setNotas] = useState(proveedor?.notas ?? "");
  const [visibleInquilino, setVisibleInquilino] = useState(proveedor?.visibleInquilino ?? true);
  const valido = nombre.trim().length > 0;

  const trabajos = proveedor ? trabajosDe(proveedor.id) : [];

  function guardar() {
    if (!valido) return;
    const datos = { nombre: nombre.trim(), rubro: rubro.trim(), telefono: telefono.trim(), email: email.trim(), notas: notas.trim(), visibleInquilino };
    if (esEdicion && proveedor) updateProveedor(proveedor.id, datos);
    else addProveedor(datos);
    onCerrar();
  }

  return (
    <Overlay titulo={esEdicion ? "Editar proveedor" : "Nuevo proveedor"} onCerrar={onCerrar}>
      <form onSubmit={(e) => { e.preventDefault(); guardar(); }} className="space-y-4">
        <Campo label="Nombre">
          <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} className="input" placeholder="Nombre o empresa" />
        </Campo>
        <Campo label="Rubro / oficio">
          <input value={rubro} onChange={(e) => setRubro(e.target.value)} className="input" placeholder="Electricista, Gasista…" list="rubros-list" />
          <datalist id="rubros-list">{RUBROS_PROVEEDOR.map((r) => <option key={r} value={r} />)}</datalist>
        </Campo>
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Teléfono"><input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="input" placeholder="+54 9 223…" /></Campo>
          <Campo label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="opcional" /></Campo>
        </div>
        <Campo label="Notas"><textarea value={notas} onChange={(e) => setNotas(e.target.value)} className="input min-h-16" placeholder="Zona, horarios, observaciones…" /></Campo>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={visibleInquilino} onChange={(e) => setVisibleInquilino(e.target.checked)} />
          Visible para los inquilinos (en Contactos)
        </label>

        {esEdicion && trabajos.length > 0 && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Histórico de trabajos</span>
            <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
              {trabajos.map((g) => (
                <div key={g.id} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 dark:text-slate-500 w-20 shrink-0">{formatearFecha(g.fecha)}</span>
                  <span className="text-slate-600 dark:text-slate-300 flex-1 truncate">{g.descripcion || g.categoria}</span>
                  {g.rating ? <Estrellas valor={g.rating} size={12} /> : <span className="text-slate-300 dark:text-slate-600 text-[11px]">sin puntuar</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          {esEdicion ? (
            <button type="button" onClick={() => { if (proveedor && confirm("¿Eliminar este proveedor?")) { deleteProveedor(proveedor.id); onCerrar(); } }} className="text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400">Eliminar</button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onCerrar} className="btn-secundario">Cancelar</button>
            <button type="submit" disabled={!valido} className="btn-primario">Guardar</button>
          </div>
        </div>
      </form>
    </Overlay>
  );
}

// ==================== PRESUPUESTOS ====================
const COLOR_ESTADO_PRES: Record<EstadoPresupuesto, string> = {
  pendiente: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  aprobado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  rechazado: "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
};

function Presupuestos() {
  const { presupuestos, proveedores, updatePresupuesto, puedeEditar } = useStore();
  const puedeEdit = puedeEditar("gastos");
  const [abrir, setAbrir] = useState(false);
  const [editando, setEditando] = useState<Presupuesto | undefined>();
  const [convertir, setConvertir] = useState<Presupuesto | undefined>();

  const orden = [...presupuestos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const nombreProv = (id: string) => proveedores.find((p) => p.id === id)?.nombre ?? "Sin proveedor";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargá presupuestos, aprobalos y convertilos en gasto.</p>
        {puedeEdit && <button onClick={() => setAbrir(true)} className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition">+ Presupuesto</button>}
      </div>

      {orden.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-10 text-center text-slate-500 dark:text-slate-400">No hay presupuestos cargados.</div>
      ) : (
        <div className="space-y-2">
          {orden.map((p) => (
            <div key={p.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setEditando(p)} className="min-w-0 flex-1 text-left">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{p.descripcion || "Presupuesto"}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{nombreProv(p.proveedorId)} · {formatearFecha(p.fecha)}{p.comprobante && " · 📎"}</div>
                </button>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">${p.monto.toLocaleString("es-AR")}</div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${COLOR_ESTADO_PRES[p.estado]}`}>{p.estado}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-2 justify-end">
                {p.estado === "pendiente" && (
                  <>
                    <button onClick={() => updatePresupuesto(p.id, { estado: "rechazado" })} className="text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400">Rechazar</button>
                    <button onClick={() => updatePresupuesto(p.id, { estado: "aprobado" })} className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline">Aprobar</button>
                  </>
                )}
                {p.estado === "aprobado" && (
                  <button onClick={() => setConvertir(p)} className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline">Convertir en gasto</button>
                )}
                {p.estado === "rechazado" && (
                  <button onClick={() => updatePresupuesto(p.id, { estado: "pendiente" })} className="text-xs text-slate-500 dark:text-slate-400 hover:underline">Reabrir</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {abrir && <FormPresupuesto onCerrar={() => setAbrir(false)} />}
      {editando && <FormPresupuesto presupuesto={editando} onCerrar={() => setEditando(undefined)} />}
      {convertir && <FormGasto presupuesto={convertir} onCerrar={() => setConvertir(undefined)} />}
    </div>
  );
}

function FormPresupuesto({ presupuesto, onCerrar }: { presupuesto?: Presupuesto; onCerrar: () => void }) {
  const { proveedores, unidades, grupos, addPresupuesto, updatePresupuesto, deletePresupuesto } = useStore();
  const esEdicion = Boolean(presupuesto);
  const [proveedorId, setProveedorId] = useState(presupuesto?.proveedorId ?? proveedores[0]?.id ?? "");
  const [ambito, setAmbito] = useState<AmbitoGasto>(presupuesto?.ambito ?? "unidad");
  const [refId, setRefId] = useState(presupuesto?.refId ?? unidades[0]?.id ?? "");
  const [descripcion, setDescripcion] = useState(presupuesto?.descripcion ?? "");
  const [monto, setMonto] = useState(presupuesto?.monto ?? 0);
  const [fecha, setFecha] = useState(presupuesto?.fecha ?? hoyISO());
  const [comprobante, setComprobante] = useState<string | undefined>(presupuesto?.comprobante);
  const [nota, setNota] = useState(presupuesto?.nota ?? "");
  const opciones = ambito === "unidad" ? unidades : grupos;
  const valido = monto > 0 && descripcion.trim().length > 0;

  function guardar() {
    if (!valido) return;
    const datos = { proveedorId, ambito, refId, descripcion: descripcion.trim(), monto, fecha, comprobante, nota: nota.trim(), estado: presupuesto?.estado ?? "pendiente" as EstadoPresupuesto };
    if (esEdicion && presupuesto) updatePresupuesto(presupuesto.id, datos);
    else addPresupuesto(datos);
    onCerrar();
  }

  return (
    <Overlay titulo={esEdicion ? "Editar presupuesto" : "Nuevo presupuesto"} onCerrar={onCerrar}>
      <form onSubmit={(e) => { e.preventDefault(); guardar(); }} className="space-y-4">
        <Campo label="Proveedor">
          <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className="input">
            <option value="">— sin asignar —</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.rubro ? ` · ${p.rubro}` : ""}</option>)}
          </select>
        </Campo>
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Para">
            <select value={ambito} onChange={(e) => { setAmbito(e.target.value as AmbitoGasto); setRefId((e.target.value === "unidad" ? unidades[0]?.id : grupos[0]?.id) ?? ""); }} className="input">
              <option value="unidad">Una unidad</option>
              <option value="grupo">Un grupo</option>
            </select>
          </Campo>
          <Campo label={ambito === "unidad" ? "Unidad" : "Grupo"}>
            <select value={refId} onChange={(e) => setRefId(e.target.value)} className="input">
              {opciones.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </Campo>
        </div>
        <Campo label="Descripción"><input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="input" placeholder="ej: Cambio de caldera" /></Campo>
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Monto ($)"><InputMonto value={monto} onChange={setMonto} /></Campo>
          <Campo label="Fecha"><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input" /></Campo>
        </div>
        <Campo label="Presupuesto (imagen)">
          <div className="flex items-center gap-2">
            <label className="btn-secundario cursor-pointer text-xs">
              {comprobante ? "Cambiar" : "Adjuntar"}
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setComprobante(await subirArchivo(f, "comprobantes")); e.target.value = ""; }} />
            </label>
            {comprobante && <>
              <a href={comprobante} target="_blank" rel="noreferrer" className="text-xs text-teal-600 dark:text-teal-400 hover:underline">ver</a>
              <button type="button" onClick={() => setComprobante(undefined)} className="text-xs text-slate-400 hover:text-rose-600">quitar</button>
            </>}
          </div>
        </Campo>
        <Campo label="Nota"><input value={nota} onChange={(e) => setNota(e.target.value)} className="input" placeholder="opcional" /></Campo>

        <div className="flex justify-between items-center pt-2">
          {esEdicion ? (
            <button type="button" onClick={() => { if (presupuesto && confirm("¿Eliminar este presupuesto?")) { deletePresupuesto(presupuesto.id); onCerrar(); } }} className="text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400">Eliminar</button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onCerrar} className="btn-secundario">Cancelar</button>
            <button type="submit" disabled={!valido} className="btn-primario">Guardar</button>
          </div>
        </div>
      </form>
    </Overlay>
  );
}
