"use client";

import type { Unidad } from "@/lib/types";
import { IconoUnidad } from "@/components/iconos";

// Avatar identificable de una unidad: la foto si tiene, o el ícono del tipo
// sobre su color, con degradé y brillo.
export default function AvatarUnidad({ unidad, size = 40 }: { unidad: Unidad; size?: number }) {
  if (unidad.foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={unidad.foto}
        alt={unidad.nombre}
        className="rounded-xl object-cover shrink-0 ring-1 ring-black/5"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="relative rounded-xl shrink-0 overflow-hidden shadow-sm ring-1 ring-black/5"
      style={{ width: size, height: size, background: unidad.color }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-black/10" />
      <div className="absolute inset-0 grid place-items-center text-white">
        <IconoUnidad tipo={unidad.tipoUnidad} size={Math.round(size * 0.52)} />
      </div>
    </div>
  );
}
