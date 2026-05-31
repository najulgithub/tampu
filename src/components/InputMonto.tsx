"use client";

// Input de dinero: muestra separadores de miles (es-AR) y alinea a la derecha.
// Internamente trabaja con un number entero (pesos).
export default function InputMonto({
  value,
  onChange,
  className = "",
  placeholder,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  placeholder?: string;
}) {
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
