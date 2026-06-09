"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

interface UsuarioAdmin {
  owner_id: string;
  email: string;
  nombre: string;
  creado: string;
  estado: string;
  trial_fin: string | null;
  periodo_fin: string | null;
  unidades: number;
  reservas: number;
  colaboradores: number;
}

const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }) : "—";

// Estado "efectivo": un trial con fecha pasada cuenta como vencido.
function estadoEfectivo(u: UsuarioAdmin): "trial" | "activa" | "vencida" | "sin" {
  const ahora = Date.now();
  if (u.estado === "activa") return u.periodo_fin && Date.parse(u.periodo_fin) < ahora ? "vencida" : "activa";
  if (u.estado === "trial") return u.trial_fin && Date.parse(u.trial_fin) > ahora ? "trial" : "vencida";
  if (u.estado === "vencida" || u.estado === "cancelada") return "vencida";
  return "sin";
}

const BADGE: Record<string, { label: string; clase: string }> = {
  trial: { label: "Prueba", clase: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300" },
  activa: { label: "Activa", clase: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  vencida: { label: "Vencida", clase: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
  sin: { label: "Sin dato", clase: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400" },
};

export default function AdminPanel() {
  const { esAdmin } = useStore();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cargar = useCallback(() => {
    return supabase.rpc("admin_usuarios").then(({ data, error }) => {
      if (error) setError(error.message);
      else setUsuarios((data ?? []) as UsuarioAdmin[]);
    });
  }, []);

  useEffect(() => {
    if (!esAdmin) return;
    cargar();
  }, [esAdmin, cargar]);

  // Activar/extender o suspender la suscripción de un dueño.
  async function accion(owner: string, estado: string, dias: number, confirmacion: string) {
    if (!confirm(confirmacion)) return;
    setOcupado(owner);
    const { error } = await supabase.rpc("admin_set_suscripcion", { p_owner: owner, p_estado: estado, p_dias: dias });
    if (error) alert(error.message);
    else await cargar();
    setOcupado(null);
  }

  if (!esAdmin) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Admin</h1>
        <div className="card p-10 text-center text-slate-500 dark:text-slate-400">
          Esta sección es solo para administradores de la plataforma.
        </div>
      </div>
    );
  }

  const efectivos = (usuarios ?? []).map(estadoEfectivo);
  const cuenta = (e: string) => efectivos.filter((x) => x === e).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">Admin</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Dueños registrados y estado de suscripción.</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Metrica valor={usuarios?.length ?? 0} label="Dueños" tono="slate" />
        <Metrica valor={cuenta("trial")} label="En prueba" tono="teal" />
        <Metrica valor={cuenta("activa")} label="Activos" tono="emerald" />
        <Metrica valor={cuenta("vencida")} label="Vencidos" tono="rose" />
      </div>

      {error && (
        <div className="card p-4 text-sm text-rose-600 dark:text-rose-400 mb-4">No se pudo cargar: {error}</div>
      )}

      {usuarios === null && !error ? (
        <div className="card p-10 text-center text-slate-400 dark:text-slate-500">Cargando…</div>
      ) : usuarios && usuarios.length === 0 ? (
        <div className="card p-10 text-center text-slate-400 dark:text-slate-500">Todavía no hay dueños registrados.</div>
      ) : (
        <div className="space-y-2">
          {(usuarios ?? []).map((u) => {
            const ef = estadoEfectivo(u);
            const b = BADGE[ef];
            const diasTrial = ef === "trial" && u.trial_fin
              ? Math.max(0, Math.ceil((Date.parse(u.trial_fin) - Date.now()) / 86400000))
              : null;
            return (
              <div key={u.owner_id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{u.nombre || "Sin nombre"}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">Alta: {fecha(u.creado)}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${b.clase}`}>{b.label}</span>
                    {diasTrial !== null && (
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{diasTrial} {diasTrial === 1 ? "día" : "días"}</div>
                    )}
                    {ef === "activa" && u.periodo_fin && (
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">hasta {fecha(u.periodo_fin)}</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums border-t border-slate-100 dark:border-slate-700/50 pt-2">
                  <span>{u.unidades} unidades</span>
                  <span>{u.reservas} reservas</span>
                  <span>{u.colaboradores} colaboradores</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    disabled={ocupado === u.owner_id}
                    onClick={() => accion(u.owner_id, "activa", 30, `¿Activar 30 días a ${u.email}?`)}
                    className="text-xs rounded-md border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:opacity-40"
                  >
                    + 30 días
                  </button>
                  <button
                    disabled={ocupado === u.owner_id}
                    onClick={() => accion(u.owner_id, "activa", 365, `¿Activar 1 año a ${u.email}?`)}
                    className="text-xs rounded-md border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:opacity-40"
                  >
                    + 1 año
                  </button>
                  <button
                    disabled={ocupado === u.owner_id}
                    onClick={() => accion(u.owner_id, "vencida", 0, `¿Suspender el acceso de ${u.email}?`)}
                    className="text-xs rounded-md border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 px-2.5 py-1 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-40"
                  >
                    Suspender
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metrica({ valor, label, tono }: { valor: number; label: string; tono: "slate" | "teal" | "emerald" | "rose" }) {
  const txt = {
    slate: "text-slate-800 dark:text-slate-100",
    teal: "text-teal-600 dark:text-teal-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    rose: "text-rose-600 dark:text-rose-400",
  }[tono];
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`text-3xl font-semibold mt-1 tabular-nums ${txt}`}>{valor}</div>
    </div>
  );
}
