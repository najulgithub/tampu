"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { SIMBOLO_MONEDA } from "@/lib/types";
import { formatearFecha } from "@/lib/fechas";
import { Overlay } from "@/components/ui";

type DocTipo = "Pago" | "Gasto" | "Servicio";

interface Doc {
  id: string;
  tipo: DocTipo;
  unidadId: string;
  unidad: string;
  fecha: string;
  titulo: string;
  comprobante: string;
}

const COLOR_TIPO: Record<DocTipo, string> = {
  Pago: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  Gasto: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Servicio: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
};

export default function Documentos() {
  const { pagos, gastos, serviciosComprobantes, reservas, getUnidad, nombreGrupo, unidades } = useStore();
  const [tipo, setTipo] = useState<"todos" | DocTipo>("todos");
  const [uFiltro, setUFiltro] = useState("");
  const [q, setQ] = useState("");
  const [ver, setVer] = useState<Doc | null>(null);

  const reservaPorId = new Map(reservas.map((r) => [r.id, r]));
  const docs: Doc[] = [];

  for (const p of pagos) {
    if (!p.comprobante) continue;
    const r = reservaPorId.get(p.reservaId);
    const uid = r?.unidadId ?? "";
    docs.push({
      id: `pago-${p.id}`, tipo: "Pago", unidadId: uid, unidad: getUnidad(uid)?.nombre ?? "—", fecha: p.fecha,
      titulo: `Pago ${SIMBOLO_MONEDA[r?.moneda ?? "ARS"]}${p.monto.toLocaleString("es-AR")} · ${p.medio}${r ? ` · ${r.huesped}` : ""}`,
      comprobante: p.comprobante,
    });
  }
  for (const g of gastos) {
    if (!g.comprobante) continue;
    const unidad = g.ambito === "unidad" ? (getUnidad(g.refId)?.nombre ?? "—") : `${nombreGrupo(g.refId)} (grupo)`;
    docs.push({
      id: `gasto-${g.id}`, tipo: "Gasto", unidadId: g.ambito === "unidad" ? g.refId : "", unidad, fecha: g.fecha,
      titulo: `${g.categoria}: ${g.descripcion || g.categoria}${g.pagadoPor === "inquilino" ? " · pagó inquilino" : ""}`,
      comprobante: g.comprobante,
    });
  }
  for (const s of serviciosComprobantes) {
    if (!s.comprobante) continue;
    const r = reservaPorId.get(s.reservaId);
    const uid = r?.unidadId ?? "";
    docs.push({
      id: `serv-${s.id}`, tipo: "Servicio", unidadId: uid, unidad: getUnidad(uid)?.nombre ?? "—", fecha: s.fecha,
      titulo: `${s.servicio} · ${s.periodo}${r ? ` · ${r.huesped}` : ""}`,
      comprobante: s.comprobante,
    });
  }

  const filtrados = docs
    .filter((d) => tipo === "todos" || d.tipo === tipo)
    .filter((d) => !uFiltro || d.unidadId === uFiltro)
    .filter((d) => !q || `${d.titulo} ${d.unidad}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const tabs: ("todos" | DocTipo)[] = ["todos", "Pago", "Gasto", "Servicio"];

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">Documentos</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Todos los comprobantes cargados: pagos, gastos y servicios.</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden text-xs">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={tipo === t ? "px-3 py-1.5 bg-teal-600 text-white capitalize" : "px-3 py-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 capitalize"}
            >
              {t === "todos" ? "Todos" : t + "s"}
            </button>
          ))}
        </div>
        <select value={uFiltro} onChange={(e) => setUFiltro(e.target.value)} className="input w-auto py-1.5 text-sm">
          <option value="">Todas las unidades</option>
          {unidades.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="input flex-1 min-w-[140px] py-1.5 text-sm" />
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-10 text-center text-slate-500 dark:text-slate-400">
          No hay documentos {tipo !== "todos" || uFiltro || q ? "para este filtro" : "cargados todavía"}.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtrados.map((d) => (
            <button
              key={d.id}
              onClick={() => setVer(d)}
              className="text-left bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/70 shadow-sm hover:border-teal-400 dark:hover:border-teal-500 transition overflow-hidden group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.comprobante} alt={d.titulo} className="w-full h-28 object-cover bg-slate-100 dark:bg-slate-900" />
              <div className="p-2.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${COLOR_TIPO[d.tipo]}`}>{d.tipo}</span>
                <div className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate mt-1.5">{d.titulo}</div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{d.unidad} · {formatearFecha(d.fecha)}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {ver && (
        <Overlay titulo={ver.titulo} onCerrar={() => setVer(null)}>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">{ver.unidad} · {formatearFecha(ver.fecha)}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ver.comprobante} alt={ver.titulo} className="w-full rounded-lg" />
          <div className="flex justify-end pt-3">
            <a href={ver.comprobante} download={`${ver.tipo}-${ver.fecha}.jpg`} className="btn-secundario">Descargar</a>
          </div>
        </Overlay>
      )}
    </div>
  );
}
