// Isotipo de Tampu: montaña (Sierra) + olas (mar), en los teales de la marca.
// SVG inline para que escale nítido en cualquier tamaño y funcione en modo oscuro.
// Si más adelante querés el PNG/SVG exacto del diseño, se puede reemplazar este
// componente por una <img src="/tampu-icono.svg" />.
export function TampuIcon({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Montaña con pico secundario */}
      <path d="M12 42 L26 18 L31 27 L39 11 L52 42 Z" fill="#1f6f6b" />
      {/* Olas */}
      <path d="M9 43 q7 -5.5 14 0 t14 0 t14 0" stroke="#56a996" strokeWidth="4.2" strokeLinecap="round" fill="none" />
      <path d="M11 50.5 q7 -5.5 14 0 t14 0 t13 0" stroke="#2f807a" strokeWidth="4.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
