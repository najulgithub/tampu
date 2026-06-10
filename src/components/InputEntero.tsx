"use client";

import { useEffect, useState } from "react";

// Input para números enteros (ambientes, capacidad…) que SÍ se puede vaciar
// para reescribir. Mientras tipeás deja cualquier texto; al salir del campo
// (blur) recién valida y ajusta al mínimo. Evita el bug de "1" → "12".
export default function InputEntero({
  value,
  onChange,
  min = 1,
  className = "input",
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  className?: string;
}) {
  const [txt, setTxt] = useState(String(value));

  // Si el valor cambia desde afuera, sincronizamos el texto.
  useEffect(() => { setTxt(String(value)); }, [value]);

  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      value={txt}
      onChange={(e) => {
        setTxt(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value !== "" && Number.isFinite(n)) onChange(Math.floor(n));
      }}
      onBlur={() => {
        const n = Number(txt);
        const ok = txt !== "" && Number.isFinite(n) && n >= min;
        const final = ok ? Math.floor(n) : min;
        setTxt(String(final));
        onChange(final);
      }}
      className={className}
    />
  );
}
