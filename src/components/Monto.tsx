"use client";

import { useStore } from "@/lib/store";

// Muestra un importe; si el usuario no tiene permiso para ver montos, lo oculta
// estilo app de banco ($••••• con el ojo cerrado).
export function Monto({ valor, simbolo = "$", className = "" }: { valor: number; simbolo?: string; className?: string }) {
  const { puedeVerMontos } = useStore();
  if (puedeVerMontos) {
    return <span className={className}>{simbolo}{Math.round(valor).toLocaleString("es-AR")}</span>;
  }
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} title="Importe oculto">
      <span className="tracking-tight">{simbolo}•••••</span>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
        <line x1="2" y1="2" x2="22" y2="22" />
      </svg>
    </span>
  );
}
