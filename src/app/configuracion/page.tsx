"use client";

import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { PAISES, MONEDAS } from "@/lib/types";
import type { Moneda, AvisoSistema, TipoAviso } from "@/lib/types";

export default function Configuracion() {
  const { config, updateConfig, seedCuenta, puedeEditar, esAdmin } = useStore();
  const puedeEdit = puedeEditar("config");
  const [sembrando, setSembrando] = useState(false);

  async function cargarDemo() {
    if (!confirm("Esto agrega un set de datos de ejemplo (unidades, reservas, pagos, gastos y vencimientos) a tu cuenta. ¿Continuar?")) return;
    setSembrando(true);
    try {
      await seedCuenta();
    } finally {
      setSembrando(false);
    }
  }

  // Al cambiar de país, proponemos su moneda y si aplica ajuste por inflación.
  function cambiarPais(codigo: string) {
    const p = PAISES.find((x) => x.codigo === codigo);
    if (!p) { updateConfig({ pais: codigo }); return; }
    updateConfig({ pais: codigo, monedaDefault: p.moneda, ajusteInflacion: p.ajusteInflacion });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">Configuración</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Parámetros regionales de tu negocio.</p>
      </div>

      {!puedeEdit && (
        <div className="mb-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
          Solo lectura: no tenés permiso para cambiar la configuración.
        </div>
      )}

      <fieldset disabled={!puedeEdit} className="disabled:opacity-60">
      <div className="card divide-y divide-slate-100 dark:divide-slate-700/50">
        {/* País */}
        <div className="p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">País</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Ajusta moneda e índices por defecto.</div>
          </div>
          <select
            value={config.pais}
            onChange={(e) => cambiarPais(e.target.value)}
            className="input max-w-[170px]"
          >
            {PAISES.map((p) => (
              <option key={p.codigo} value={p.codigo}>{p.nombre}</option>
            ))}
          </select>
        </div>

        {/* Moneda predeterminada */}
        <div className="p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Moneda predeterminada</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Se usa al crear nuevas reservas.</div>
          </div>
          <select
            value={config.monedaDefault}
            onChange={(e) => updateConfig({ monedaDefault: e.target.value as Moneda })}
            className="input max-w-[170px]"
          >
            {MONEDAS.map((m) => (
              <option key={m.valor} value={m.valor}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Ajuste por inflación */}
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Ajuste por inflación (ICL / IPC)</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Muestra los campos de actualización por índice en las reservas y los avisos de ajuste en la agenda.
            </div>
          </div>
          <Switch
            activo={config.ajusteInflacion}
            onToggle={() => updateConfig({ ajusteInflacion: !config.ajusteInflacion })}
          />
        </div>

        {/* Día de vencimiento mensual */}
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Día de vencimiento mensual</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Día del mes en que vence el alquiler (contratos largos). Se propone al crear la reserva.
            </div>
          </div>
          <select
            value={config.diaVencimiento ?? ""}
            onChange={(e) => updateConfig({ diaVencimiento: e.target.value ? Number(e.target.value) : undefined })}
            className="input max-w-[110px]"
          >
            <option value="">—</option>
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>Día {d}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
        Los cambios se guardan automáticamente.
      </p>

      {/* Datos de demostración */}
      <div className="card p-4 mt-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Datos de ejemplo</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Carga unidades, reservas, pagos, gastos y vencimientos de muestra para ver la app con datos. Se suman a lo que ya tengas.
          </div>
        </div>
        <button
          onClick={cargarDemo}
          disabled={sembrando}
          className="shrink-0 rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50"
        >
          {sembrando ? "Cargando…" : "Cargar"}
        </button>
      </div>
      </fieldset>

      <FormConsulta />
      {esAdmin && <AdminConsultas />}
      {esAdmin && <AdminAvisos />}
    </div>
  );
}

// Form para que el dueño le proponga cambios/mejoras al desarrollador.
function FormConsulta() {
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar() {
    if (!mensaje.trim()) return;
    setEnviando(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("consultas").insert({ email: u.user?.email ?? "", mensaje: mensaje.trim() });
      if (!error) { setEnviado(true); setMensaje(""); }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="card p-4 mt-6">
      <div className="text-sm font-medium text-slate-700 dark:text-slate-200">¿Una idea o algo para mejorar?</div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Contanos qué te gustaría que tampu tenga o cambie. Lo lee el equipo de desarrollo.</p>
      {enviado ? (
        <div className="text-sm text-emerald-600 dark:text-emerald-400">¡Gracias! Recibimos tu sugerencia. 🙌
          <button onClick={() => setEnviado(false)} className="ml-2 text-teal-600 dark:text-teal-400 hover:underline text-xs">Enviar otra</button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} className="input min-h-20" placeholder="Tu sugerencia, problema o pedido…" />
          <div className="flex justify-end">
            <button onClick={enviar} disabled={enviando || !mensaje.trim()} className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50">
              {enviando ? "Enviando…" : "Enviar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Panel del admin: consultas recibidas de los dueños.
function AdminConsultas() {
  const [items, setItems] = useState<{ id: string; email: string; mensaje: string; leida: boolean; created_at: string }[]>([]);

  const recargar = useCallback(async () => {
    const { data } = await supabase.from("consultas").select("*").order("created_at", { ascending: false });
    setItems((data as typeof items) ?? []);
  }, []);
  useEffect(() => { recargar(); }, [recargar]);

  async function marcar(id: string, leida: boolean) {
    await supabase.from("consultas").update({ leida }).eq("id", id);
    recargar();
  }
  async function borrar(id: string) {
    if (!confirm("¿Borrar esta consulta?")) return;
    await supabase.from("consultas").delete().eq("id", id);
    recargar();
  }

  const sinLeer = items.filter((i) => !i.leida).length;

  return (
    <div className="card p-4 mt-6">
      <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">
        Consultas recibidas <span className="text-xs font-normal text-violet-500">(admin)</span>
        {sinLeer > 0 && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-bold">{sinLeer} sin leer</span>}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">Todavía no hay consultas.</p>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.id} className={`rounded-lg border p-2.5 ${c.leida ? "border-slate-200 dark:border-slate-700" : "border-teal-300 dark:border-teal-500/40 bg-teal-50/50 dark:bg-teal-500/5"}`}>
              <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line">{c.mensaje}</div>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                <span className="truncate flex-1">{c.email || "sin email"} · {new Date(c.created_at).toLocaleDateString("es-AR")}</span>
                <button onClick={() => marcar(c.id, !c.leida)} className="text-teal-600 dark:text-teal-400 hover:underline">{c.leida ? "Marcar sin leer" : "Marcar leída"}</button>
                <button onClick={() => borrar(c.id)} className="text-slate-400 hover:text-rose-600">×</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Panel del admin de la plataforma: publica avisos del sistema para todos.
function AdminAvisos() {
  const { crearAviso, toggleAviso, eliminarAviso } = useStore();
  const [todos, setTodos] = useState<AvisoSistema[]>([]);
  const [titulo, setTitulo] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [tipo, setTipo] = useState<TipoAviso>("novedad");

  const recargar = useCallback(async () => {
    const { data } = await supabase.from("avisos_sistema").select("*").order("created_at", { ascending: false });
    setTodos(((data as { id: string; tipo: TipoAviso; titulo: string; cuerpo: string; activo: boolean; created_at: string }[]) ?? []).map((x) => ({ id: x.id, tipo: x.tipo, titulo: x.titulo, cuerpo: x.cuerpo ?? "", activo: x.activo, createdAt: x.created_at })));
  }, []);
  useEffect(() => { recargar(); }, [recargar]);

  function publicar() {
    if (!titulo.trim()) return;
    crearAviso({ tipo, titulo: titulo.trim(), cuerpo: cuerpo.trim(), activo: true });
    setTitulo(""); setCuerpo("");
    setTimeout(recargar, 600);
  }

  return (
    <div className="card p-4 mt-6">
      <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Avisos del sistema <span className="text-xs font-normal text-violet-500">(admin)</span></div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Publicá novedades, mantenimiento o "en construcción". Los ven todos los usuarios.</p>

      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" className="input col-span-2" />
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoAviso)} className="input">
            <option value="novedad">Novedad</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="info">Info</option>
          </select>
        </div>
        <textarea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} placeholder="Detalle (opcional)" className="input min-h-16" />
        <div className="flex justify-end">
          <button onClick={publicar} disabled={!titulo.trim()} className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50">Publicar</button>
        </div>
      </div>

      {todos.length > 0 && (
        <div className="mt-4 space-y-1.5 border-t border-slate-100 dark:border-slate-700 pt-3">
          {todos.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-sm">
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 capitalize">{a.tipo}</span>
              <span className={`flex-1 truncate ${a.activo ? "text-slate-700 dark:text-slate-200" : "text-slate-400 line-through"}`}>{a.titulo}</span>
              <button onClick={() => { toggleAviso(a.id, !a.activo); setTimeout(recargar, 400); }} className="text-xs text-teal-600 dark:text-teal-400 hover:underline">{a.activo ? "Desactivar" : "Activar"}</button>
              <button onClick={() => { if (confirm("¿Eliminar aviso?")) { eliminarAviso(a.id); setTimeout(recargar, 400); } }} className="text-slate-400 hover:text-rose-600 text-sm">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Switch({ activo, onToggle }: { activo: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={onToggle}
      className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition ${
        activo ? "bg-teal-600" : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${activo ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}
