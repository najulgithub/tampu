"use client";

import { useRef } from "react";

// Componentes de UI reutilizables (modal y campo de formulario).

export function Overlay({
  titulo,
  onCerrar,
  children,
}: {
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  // Cerramos solo si el gesto EMPEZÓ en el fondo. Así, seleccionar texto dentro
  // del modal y soltar el mouse sobre el fondo no cierra el modal.
  const desdeFondo = useRef(false);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 grid place-items-center p-4"
      onMouseDown={(e) => {
        desdeFondo.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && desdeFondo.current) onCerrar();
      }}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl ring-1 ring-black/5 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">{titulo}</h3>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 text-xl leading-none">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</span>
      {children}
    </label>
  );
}
