"use client";

import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import type { AvisoSistema, TipoAviso } from "@/lib/types";

function IconoCampana({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function cuando(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) + " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

const TINTE_AVISO: Record<TipoAviso, string> = {
  mantenimiento: "border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10",
  novedad: "border-teal-300 dark:border-teal-500/40 bg-teal-50 dark:bg-teal-500/10",
  info: "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30",
};

function Panel({ avisos, children, onCerrar }: { avisos: AvisoSistema[]; children: React.ReactNode; onCerrar: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onCerrar} />
      <div className="absolute right-0 mt-2 w-[min(340px,calc(100vw-1.5rem))] max-h-[70vh] overflow-y-auto rounded-xl shadow-2xl ring-1 ring-black/10 bg-white dark:bg-slate-800 z-40 p-2">
        {avisos.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {avisos.map((a) => (
              <div key={a.id} className={`rounded-lg border p-2.5 ${TINTE_AVISO[a.tipo]}`}>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {a.tipo === "mantenimiento" ? "🛠 " : a.tipo === "novedad" ? "✨ " : "ℹ️ "}{a.titulo}
                </div>
                {a.cuerpo && <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 whitespace-pre-line">{a.cuerpo}</div>}
              </div>
            ))}
          </div>
        )}
        {children}
      </div>
    </>
  );
}

// ---------- Campana del dueño ----------
export function CampanaDueno() {
  const { notificaciones, notifNoLeidas, marcarNotifLeidas, avisos } = useStore();
  const [open, setOpen] = useState(false);

  function toggle() {
    const n = !open;
    setOpen(n);
    if (n && notifNoLeidas > 0) marcarNotifLeidas();
  }

  return (
    <div className="relative">
      <button onClick={toggle} aria-label="Notificaciones" title="Notificaciones" className="relative text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition">
        <IconoCampana />
        {notifNoLeidas > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 grid place-items-center rounded-full bg-rose-500 text-white text-[10px] font-bold">{notifNoLeidas}</span>
        )}
      </button>
      {open && (
        <Panel avisos={avisos} onCerrar={() => setOpen(false)}>
          {notificaciones.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 p-4 text-center">Sin notificaciones.</p>
          ) : (
            <div className="space-y-0.5">
              {notificaciones.map((n) => (
                <div key={n.id} className="px-2.5 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.titulo}</div>
                  {n.cuerpo && <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{n.cuerpo}</div>}
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{cuando(n.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

// ---------- Campana del inquilino (portal) ----------
type NotifPortal = { id: string; tipo: string; titulo: string; cuerpo: string; leida: boolean; created_at: string };

export function CampanaInquilino() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<NotifPortal[]>([]);
  const [avisos, setAvisos] = useState<AvisoSistema[]>([]);

  const recargar = useCallback(async () => {
    const [n, a] = await Promise.all([
      supabase.rpc("portal_notificaciones"),
      supabase.from("avisos_sistema").select("*").eq("activo", true).order("created_at", { ascending: false }),
    ]);
    setNotifs((n.data as NotifPortal[]) ?? []);
    setAvisos(((a.data as { id: string; tipo: TipoAviso; titulo: string; cuerpo: string; activo: boolean; created_at: string }[]) ?? []).map((x) => ({ id: x.id, tipo: x.tipo, titulo: x.titulo, cuerpo: x.cuerpo ?? "", activo: x.activo, createdAt: x.created_at })));
  }, []);

  useEffect(() => { recargar(); }, [recargar]);

  const noLeidas = notifs.filter((n) => !n.leida).length;

  async function toggle() {
    const n = !open;
    setOpen(n);
    if (n && noLeidas > 0) {
      await supabase.rpc("portal_notif_leidas");
      setNotifs((prev) => prev.map((x) => ({ ...x, leida: true })));
    }
  }

  return (
    <div className="relative">
      <button onClick={toggle} aria-label="Notificaciones" className="relative text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition">
        <IconoCampana />
        {noLeidas > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 grid place-items-center rounded-full bg-rose-500 text-white text-[10px] font-bold">{noLeidas}</span>
        )}
      </button>
      {open && (
        <Panel avisos={avisos} onCerrar={() => setOpen(false)}>
          {notifs.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 p-4 text-center">Sin notificaciones.</p>
          ) : (
            <div className="space-y-0.5">
              {notifs.map((n) => (
                <div key={n.id} className="px-2.5 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.titulo}</div>
                  {n.cuerpo && <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{n.cuerpo}</div>}
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{cuando(n.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
