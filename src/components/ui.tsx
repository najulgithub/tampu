"use client";

import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";

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
  // Renderizamos en un portal al <body> para escapar del contexto de apilamiento
  // de <main> (que tiene transform), si no el menú inferior tapa el modal.
  const [montado, setMontado] = useState(false);
  useEffect(() => { setMontado(true); }, []);

  const contenido = (
    <div className="fixed inset-0 z-50 bg-slate-900/40 overflow-y-auto overscroll-contain">
      {/* Centrado en desktop; arriba en mobile para poder scrollear formularios largos
          y llegar al botón de guardar sin que lo tape la barra inferior. */}
      <div
        className="min-h-full flex items-start sm:items-center justify-center p-4"
        onMouseDown={(e) => {
          desdeFondo.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && desdeFondo.current) onCerrar();
        }}
      >
        <div
          className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl ring-1 ring-black/5 p-6"
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
    </div>
  );

  if (!montado) return null;
  return createPortal(contenido, document.body);
}

export function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</span>
      {children}
    </label>
  );
}
