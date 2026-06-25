"use client";

import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { PAISES, MONEDAS } from "@/lib/types";
import type { Moneda, AvisoSistema, TipoAviso } from "@/lib/types";
import { pushSoportado, pushActivo, activarPush, desactivarPush } from "@/lib/push";

export default function Configuracion() {
  const { config, updateConfig, seedCuenta, puedeEditar, esAdmin, rol, t } = useStore();
  const puedeEdit = puedeEditar("config");
  const [sembrando, setSembrando] = useState(false);

  async function cargarDemo() {
    if (!confirm(t("Esto agrega un set de datos de ejemplo (unidades, reservas, pagos, gastos y vencimientos) a tu cuenta. ¿Continuar?"))) return;
    setSembrando(true);
    try {
      await seedCuenta();
    } finally {
      setSembrando(false);
    }
  }

  // Al cambiar de país, proponemos su moneda, si aplica ajuste por inflación y su idioma.
  function cambiarPais(codigo: string) {
    const p = PAISES.find((x) => x.codigo === codigo);
    if (!p) { updateConfig({ pais: codigo }); return; }
    updateConfig({ pais: codigo, monedaDefault: p.moneda, ajusteInflacion: p.ajusteInflacion, idioma: p.idioma });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">Configuración</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("Parámetros regionales de tu negocio.")}</p>
      </div>

      {!puedeEdit && (
        <div className="mb-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
          {t("Solo lectura: no tenés permiso para cambiar la configuración.")}
        </div>
      )}

      <fieldset disabled={!puedeEdit} className="disabled:opacity-60">
      <div className="card divide-y divide-slate-100 dark:divide-slate-700/50">
        {/* Localización (país) */}
        <div className="p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("Localización")}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t("Define moneda, índices e idioma de la app.")}</div>
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

        {/* Idioma */}
        <div className="p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("Idioma")}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t("Idioma de la interfaz.")}</div>
          </div>
          <select
            value={config.idioma}
            onChange={(e) => updateConfig({ idioma: e.target.value as "es" | "de" })}
            className="input max-w-[170px]"
          >
            <option value="es">Español</option>
            <option value="de">Deutsch</option>
          </select>
        </div>

        {/* Moneda predeterminada */}
        <div className="p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("Moneda predeterminada")}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t("Se usa al crear nuevas reservas.")}</div>
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
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("Ajuste por inflación (ICL / IPC)")}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t("Muestra los campos de actualización por índice en las reservas y los avisos de ajuste en la agenda.")}
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
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("Día de vencimiento mensual")}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t("Día del mes en que vence el alquiler (contratos largos). Se propone al crear la reserva.")}
            </div>
          </div>
          <select
            value={config.diaVencimiento ?? ""}
            onChange={(e) => updateConfig({ diaVencimiento: e.target.value ? Number(e.target.value) : undefined })}
            className="input max-w-[110px]"
          >
            <option value="">—</option>
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{t("Día")} {d}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
        {t("Los cambios se guardan automáticamente.")}
      </p>

      {/* Datos de demostración (solo admin: evita que un cliente real los cargue sin querer) */}
      {esAdmin && (
        <div className="card p-4 mt-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("Datos de ejemplo (admin)")}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t("Carga unidades, reservas, pagos, gastos y vencimientos de muestra. Se suman a lo que ya tengas.")}
            </div>
          </div>
          <button
            onClick={cargarDemo}
            disabled={sembrando}
            className="shrink-0 rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50"
          >
            {sembrando ? t("Cargando…") : t("Cargar")}
          </button>
        </div>
      )}
      </fieldset>

      {rol === "dueno" && <VaciarCuenta />}
      <NotificacionesPush />
      <FormConsulta />
      {esAdmin && <AdminConsultas />}
      {esAdmin && <AdminAvisos />}
    </div>
  );
}

// Zona peligrosa: borra todos los datos del negocio (deja la cuenta y la config).
function VaciarCuenta() {
  const { vaciarCuenta, t } = useStore();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [borrando, setBorrando] = useState(false);

  async function confirmar() {
    setBorrando(true);
    try {
      await vaciarCuenta();
      setAbierto(false);
      setTexto("");
      alert(t("Listo, tu cuenta quedó vacía."));
    } catch {
      alert(t("No se pudo vaciar la cuenta. Probá de nuevo."));
    } finally {
      setBorrando(false);
    }
  }

  return (
    <div className="card p-4 mt-6 border-rose-200 dark:border-rose-500/30">
      <div className="text-sm font-medium text-rose-700 dark:text-rose-300">{t("Vaciar mi cuenta")}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
        {t("Borra todas tus unidades, reservas, pagos, gastos, proveedores y colaboradores. Tu usuario, tu suscripción y esta configuración se conservan.")} <b>{t("No se puede deshacer.")}</b>
      </div>

      {!abierto ? (
        <button onClick={() => setAbierto(true)} className="mt-3 text-sm font-medium text-rose-600 dark:text-rose-400 hover:underline">
          {t("Vaciar cuenta…")}
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <label className="block text-xs text-slate-500 dark:text-slate-400">
            {t("Escribí")} <b>VACIAR</b> {t("para confirmar:")}
            <input value={texto} onChange={(e) => setTexto(e.target.value)} className="input mt-1" placeholder="VACIAR" />
          </label>
          <div className="flex gap-2">
            <button onClick={() => { setAbierto(false); setTexto(""); }} className="btn-secundario">{t("Cancelar")}</button>
            <button
              onClick={confirmar}
              disabled={texto.trim().toUpperCase() !== "VACIAR" || borrando}
              className="rounded-lg bg-rose-600 text-white px-4 py-2 text-sm font-medium hover:bg-rose-700 transition disabled:opacity-40"
            >
              {borrando ? t("Vaciando…") : t("Vaciar definitivamente")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Activar/desactivar notificaciones push en este dispositivo.
function NotificacionesPush() {
  const { t } = useStore();
  const [soportado, setSoportado] = useState(true);
  const [activo, setActivo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSoportado(pushSoportado());
    pushActivo().then(setActivo);
  }, []);

  async function alternar() {
    setError(null);
    setCargando(true);
    try {
      if (activo) {
        await desactivarPush();
        setActivo(false);
      } else {
        const r = await activarPush();
        if (r.ok) setActivo(true);
        else setError(r.error ?? t("No se pudo activar."));
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="card p-4 mt-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("Notificaciones push")}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {t("Recibí avisos en este dispositivo (nuevas reservas, pagos, mensajes), aunque tengas la app cerrada.")}
          </div>
        </div>
        {soportado ? (
          <button
            onClick={alternar}
            disabled={cargando}
            className={activo ? "btn-secundario shrink-0" : "btn-primario shrink-0"}
          >
            {cargando ? "…" : activo ? t("Desactivar") : t("Activar")}
          </button>
        ) : (
          <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{t("No disponible en este navegador")}</span>
        )}
      </div>
      {error && <div className="text-xs text-rose-600 dark:text-rose-400 mt-2">{error}</div>}
      {soportado && !activo && !error && (
        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
          {t("En iPhone tenés que abrir la app desde el ícono instalado (no desde Safari) para que funcione.")}
        </div>
      )}
    </div>
  );
}

// Form para que el dueño le proponga cambios/mejoras al desarrollador.
function FormConsulta() {
  const { t } = useStore();
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
      <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("¿Una idea o algo para mejorar?")}</div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{t("Contanos qué te gustaría que tampu tenga o cambie. Lo lee el equipo de desarrollo.")}</p>
      {enviado ? (
        <div className="text-sm text-emerald-600 dark:text-emerald-400">{t("¡Gracias! Recibimos tu sugerencia.")} 🙌
          <button onClick={() => setEnviado(false)} className="ml-2 text-teal-600 dark:text-teal-400 hover:underline text-xs">{t("Enviar otra")}</button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} className="input min-h-20" placeholder={t("Tu sugerencia, problema o pedido…")} />
          <div className="flex justify-end">
            <button onClick={enviar} disabled={enviando || !mensaje.trim()} className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50">
              {enviando ? t("Enviando…") : t("Enviar")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Panel del admin: consultas recibidas de los dueños.
function AdminConsultas() {
  const { t } = useStore();
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
    if (!confirm(t("¿Borrar esta consulta?"))) return;
    await supabase.from("consultas").delete().eq("id", id);
    recargar();
  }

  const sinLeer = items.filter((i) => !i.leida).length;

  return (
    <div className="card p-4 mt-6">
      <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">
        {t("Consultas recibidas")} <span className="text-xs font-normal text-violet-500">(admin)</span>
        {sinLeer > 0 && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-bold">{sinLeer} {t("sin leer")}</span>}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">{t("Todavía no hay consultas.")}</p>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.id} className={`rounded-lg border p-2.5 ${c.leida ? "border-slate-200 dark:border-slate-700" : "border-teal-300 dark:border-teal-500/40 bg-teal-50/50 dark:bg-teal-500/5"}`}>
              <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line">{c.mensaje}</div>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                <span className="truncate flex-1">{c.email || t("sin email")} · {new Date(c.created_at).toLocaleDateString("es-AR")}</span>
                <button onClick={() => marcar(c.id, !c.leida)} className="text-teal-600 dark:text-teal-400 hover:underline">{c.leida ? t("Marcar sin leer") : t("Marcar leída")}</button>
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
  const { crearAviso, toggleAviso, eliminarAviso, t } = useStore();
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
      <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t("Avisos del sistema")} <span className="text-xs font-normal text-violet-500">(admin)</span></div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{t('Publicá novedades, mantenimiento o "en construcción". Los ven todos los usuarios.')}</p>

      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={t("Título")} className="input col-span-2" />
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoAviso)} className="input">
            <option value="novedad">{t("Novedad")}</option>
            <option value="mantenimiento">{t("Mantenimiento")}</option>
            <option value="info">{t("Info")}</option>
          </select>
        </div>
        <textarea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} placeholder={t("Detalle (opcional)")} className="input min-h-16" />
        <div className="flex justify-end">
          <button onClick={publicar} disabled={!titulo.trim()} className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50">{t("Publicar")}</button>
        </div>
      </div>

      {todos.length > 0 && (
        <div className="mt-4 space-y-1.5 border-t border-slate-100 dark:border-slate-700 pt-3">
          {todos.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-sm">
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 capitalize">{a.tipo}</span>
              <span className={`flex-1 truncate ${a.activo ? "text-slate-700 dark:text-slate-200" : "text-slate-400 line-through"}`}>{a.titulo}</span>
              <button onClick={() => { toggleAviso(a.id, !a.activo); setTimeout(recargar, 400); }} className="text-xs text-teal-600 dark:text-teal-400 hover:underline">{a.activo ? t("Desactivar") : t("Activar")}</button>
              <button onClick={() => { if (confirm(t("¿Eliminar aviso?"))) { eliminarAviso(a.id); setTimeout(recargar, 400); } }} className="text-slate-400 hover:text-rose-600 text-sm">×</button>
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
