"use client";

import type { Grupo } from "@/lib/types";
import { IconoAmbiente } from "@/components/iconos";

// Avatar identificable de un grupo: foto si tiene, o el ícono del ambiente
// sobre su color, con degradé y brillo.
export default function AvatarGrupo({ grupo, size = 32 }: { grupo: Grupo; size?: number }) {
  if (grupo.foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={grupo.foto}
        alt={grupo.nombre}
        className="rounded-lg object-cover shrink-0 ring-1 ring-black/5"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="relative rounded-lg shrink-0 overflow-hidden shadow-sm ring-1 ring-black/5"
      style={{ width: size, height: size, background: grupo.color }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-black/10" />
      <div className="absolute inset-0 grid place-items-center text-white">
        <IconoAmbiente ambiente={grupo.ambiente} size={Math.round(size * 0.55)} />
      </div>
    </div>
  );
}
