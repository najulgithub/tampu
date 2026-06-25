"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Overlay } from "@/components/ui";

// Combo de medios de pago: muestra los activos, permite crear uno nuevo
// y administrar (activar/desactivar/renombrar/borrar).
export default function SelectMedio({
  value,
  onChange,
}: {
  value: string;
  onChange: (nombre: string) => void;
}) {
  const { mediosPago, addMedioPago, t } = useStore();
  const [creando, setCreando] = useState(false);
  const [nuevo, setNuevo] = useState("");
  const [admin, setAdmin] = useState(false);

  const activos = mediosPago.filter((m) => m.activo);
  // Si el valor actual es un medio desactivado, igual lo mostramos para no perderlo.
  const opciones = activos.some((m) => m.nombre === value) || !value
    ? activos
    : [...activos, ...mediosPago.filter((m) => m.nombre === value)];

  function confirmar() {
    const n = nuevo.trim();
    if (!n) return;
    addMedioPago(n);
    onChange(n);
    setCreando(false);
    setNuevo("");
  }

  if (creando) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus value={nuevo} onChange={(e) => setNuevo(e.target.value)}
          placeholder={t("Nuevo medio (ej: Transferencia Galicia)")} className="input"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmar(); } if (e.key === "Escape") { setCreando(false); setNuevo(""); } }}
        />
        <button type="button" onClick={confirmar} className="btn-primario whitespace-nowrap">{t("Crear")}</button>
        <button type="button" onClick={() => { setCreando(false); setNuevo(""); }} className="btn-secundario" aria-label="Cancelar">×</button>
      </div>
    );
  }

  return (
    <>
      <select
        className="input"
        value={value}
        onChange={(e) => {
          if (e.target.value === "__nuevo__") setCreando(true);
          else if (e.target.value === "__admin__") setAdmin(true);
          else onChange(e.target.value);
        }}
      >
        {opciones.map((m) => (
          <option key={m.id} value={m.nombre}>{t(m.nombre)}</option>
        ))}
        <option value="__nuevo__">{t("➕ Nuevo medio…")}</option>
        <option value="__admin__">{t("⚙ Administrar…")}</option>
      </select>
      {admin && <AdminMedios onCerrar={() => setAdmin(false)} />}
    </>
  );
}

function AdminMedios({ onCerrar }: { onCerrar: () => void }) {
  const { mediosPago, addMedioPago, updateMedioPago, deleteMedioPago, t } = useStore();
  const [nuevo, setNuevo] = useState("");

  return (
    <Overlay titulo={t("Medios de pago")} onCerrar={onCerrar}>
      <div className="space-y-2">
        {mediosPago.map((m) => (
          <div key={m.id} className="flex items-center gap-2">
            <input
              value={m.nombre}
              onChange={(e) => updateMedioPago(m.id, { nombre: e.target.value })}
              className={`input flex-1 ${m.activo ? "" : "opacity-50 line-through"}`}
            />
            <button
              type="button"
              onClick={() => updateMedioPago(m.id, { activo: !m.activo })}
              className={`text-xs px-2 py-1 rounded-md whitespace-nowrap ${m.activo ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}
            >
              {m.activo ? t("Activo") : t("Inactivo")}
            </button>
            <button
              type="button"
              onClick={() => { if (confirm(`¿Borrar "${m.nombre}"? (los pagos viejos conservan el nombre)`)) deleteMedioPago(m.id); }}
              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-sm px-1"
              aria-label="Borrar"
            >
              ×
            </button>
          </div>
        ))}

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <input
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            placeholder={t("Agregar medio (ej: Transferencia BNA)")}
            className="input flex-1"
            onKeyDown={(e) => { if (e.key === "Enter" && nuevo.trim()) { e.preventDefault(); addMedioPago(nuevo); setNuevo(""); } }}
          />
          <button type="button" onClick={() => { if (nuevo.trim()) { addMedioPago(nuevo); setNuevo(""); } }} className="btn-primario">{t("Agregar")}</button>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 pt-1">
          {t("Desactivá una cuenta bloqueada para que no aparezca al cobrar, sin perder el historial.")}
        </p>

        <div className="flex justify-end pt-2">
          <button type="button" onClick={onCerrar} className="btn-primario">{t("Listo")}</button>
        </div>
      </div>
    </Overlay>
  );
}
