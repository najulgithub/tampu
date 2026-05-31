import type { TipoUnidad, AmbienteGrupo } from "@/lib/types";

function Svg({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const UNIDAD: Record<TipoUnidad, React.ReactNode> = {
  Departamento: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M10 21v-3h4v3" />
    </>
  ),
  Casa: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-5h4v5" />
    </>
  ),
  "Cabaña": (
    <>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-5h4v5" />
      <path d="M16 6V4" />
    </>
  ),
  Monoambiente: (
    <>
      <rect x="6" y="4" width="12" height="16" rx="1.5" />
      <path d="M10 20v-4h4v4M9 8h6" />
    </>
  ),
  PH: (
    <>
      <path d="M3 21V9l6-4v16" />
      <path d="M9 11l6-3v13" />
      <path d="M15 12l6 2v7" />
    </>
  ),
  Local: (
    <>
      <path d="M4 9 5 4h14l1 5" />
      <path d="M5 9v11h14V9" />
      <path d="M4 9h16M10 20v-5h4v5" />
    </>
  ),
  Otro: (
    <>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
};

const AMBIENTE: Record<AmbienteGrupo, React.ReactNode> = {
  Edificio: (
    <>
      <path d="M6 21V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v16" />
      <path d="M14 9h3a2 2 0 0 1 2 2v10" />
      <path d="M9 7h.01M9 11h.01M9 15h.01" />
    </>
  ),
  Playa: (
    <>
      <circle cx="12" cy="7.5" r="3" />
      <path d="M3 15c1.4-1.1 2.8-1.1 4.2 0s2.8 1.1 4.2 0 2.8-1.1 4.2 0 2.8 1.1 4.2 0" />
      <path d="M3 19.5c1.4-1.1 2.8-1.1 4.2 0s2.8 1.1 4.2 0 2.8-1.1 4.2 0 2.8 1.1 4.2 0" />
    </>
  ),
  "Montaña": (
    <>
      <path d="m3 19 6-11 4 6 2-3 6 8Z" />
    </>
  ),
  "Río": (
    <>
      <path d="M3 7c1.4-1.1 2.8-1.1 4.2 0s2.8 1.1 4.2 0 2.8-1.1 4.2 0 2.8 1.1 4.2 0" />
      <path d="M3 12.5c1.4-1.1 2.8-1.1 4.2 0s2.8 1.1 4.2 0 2.8-1.1 4.2 0 2.8 1.1 4.2 0" />
      <path d="M3 18c1.4-1.1 2.8-1.1 4.2 0s2.8 1.1 4.2 0 2.8-1.1 4.2 0 2.8 1.1 4.2 0" />
    </>
  ),
  Nieve: (
    <>
      <path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19" />
    </>
  ),
  Ciudad: (
    <>
      <path d="M3 21V11l4-1.5V21" />
      <path d="M9 21V5l6-2.5V21" />
      <path d="M17 21V12l4 1.5V21" />
      <path d="M2 21h20" />
    </>
  ),
  Campo: (
    <>
      <path d="M12 21V8" />
      <path d="M12 11c-2.2 0-4-1.8-4-4 2.2 0 4 1.8 4 4Z" />
      <path d="M12 11c2.2 0 4-1.8 4-4-2.2 0-4 1.8-4 4Z" />
      <path d="M12 16c-2 0-3.5-1.5-3.5-3.5C10.5 12.5 12 14 12 16Z" />
    </>
  ),
  Otro: (
    <>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
};

export function IconoUnidad({ tipo, size = 22 }: { tipo: TipoUnidad; size?: number }) {
  return <Svg size={size}>{UNIDAD[tipo]}</Svg>;
}

export function IconoAmbiente({ ambiente, size = 18 }: { ambiente: AmbienteGrupo; size?: number }) {
  return <Svg size={size}>{AMBIENTE[ambiente]}</Svg>;
}
