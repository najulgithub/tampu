"use client";

import { useState, useEffect } from "react";

// Input de dinero. En pesos trabaja con enteros y separadores de miles.
// Con `decimales` permite centavos (para montos en dólares).
export default function InputMonto({
  value,
  onChange,
  className = "",
  placeholder,
  decimales = false,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  placeholder?: string;
  decimales?: boolean;
}) {
  // Modo decimal: texto libre (dígitos + una coma/punto), para tipear centavos sin pelear con el formateo.
  const [txt, setTxt] = useState("");
  useEffect(() => {
    if (!decimales) return;
    const actual = parseFloat(txt.replace(",", ".")) || 0;
    if (actual !== (value || 0)) setTxt(value ? String(value).replace(".", ",") : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimales]);

  if (decimales) {
    return (
      <input
        type="text"
        inputMode="decimal"
        value={txt}
        placeholder={placeholder ?? "0"}
        onChange={(e) => {
          let raw = e.target.value.replace(/[^0-9.,]/g, "").replace(/\./g, ",");
          const parts = raw.split(",");
          if (parts.length > 2) raw = parts[0] + "," + parts.slice(1).join(""); // una sola coma
          setTxt(raw);
          const n = parseFloat(raw.replace(",", "."));
          onChange(isNaN(n) ? 0 : n);
        }}
        className={`input text-right ${className}`}
      />
    );
  }

  const formateado = value > 0 ? value.toLocaleString("es-AR") : "";
  return (
    <input
      type="text"
      inputMode="numeric"
      value={formateado}
      placeholder={placeholder ?? "0"}
      onChange={(e) => {
        const soloDigitos = e.target.value.replace(/\D/g, "");
        onChange(soloDigitos ? parseInt(soloDigitos, 10) : 0);
      }}
      className={`input text-right ${className}`}
    />
  );
}
