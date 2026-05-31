"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

// Combo que lista todos los grupos existentes + opción "Sin grupo" + crear uno nuevo.
export default function SelectGrupo({
  value,
  onChange,
}: {
  value: string; // grupoId ("" = sin grupo)
  onChange: (grupoId: string) => void;
}) {
  const { grupos, addGrupo } = useStore();
  const [creando, setCreando] = useState(false);
  const [nuevo, setNuevo] = useState("");

  function confirmar() {
    const n = nuevo.trim();
    if (!n) return;
    const id = addGrupo(n);
    onChange(id);
    setCreando(false);
    setNuevo("");
  }

  function cancelar() {
    setCreando(false);
    setNuevo("");
  }

  if (creando) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder="Nombre del grupo"
          className="input"
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); confirmar(); }
            if (e.key === "Escape") cancelar();
          }}
        />
        <button type="button" onClick={confirmar} className="btn-primario whitespace-nowrap">Crear</button>
        <button type="button" onClick={cancelar} className="btn-secundario" aria-label="Cancelar">×</button>
      </div>
    );
  }

  return (
    <select
      className="input"
      value={value}
      onChange={(e) => {
        if (e.target.value === "__nuevo__") setCreando(true);
        else onChange(e.target.value);
      }}
    >
      <option value="">Sin grupo</option>
      {grupos.map((g) => (
        <option key={g.id} value={g.id}>{g.nombre}</option>
      ))}
      <option value="__nuevo__">➕ Nuevo grupo…</option>
    </select>
  );
}
