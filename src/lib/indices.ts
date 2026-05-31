// Obtención de variación de índices para ajuste de alquileres.
// Nota: se consume desde el navegador. Cuando haya backend conviene cachear
// los valores (IPC mensual, ICL diario) en vez de pegarle a la API en cada uso.

interface PuntoIndice {
  fecha: string; // "yyyy-mm-dd"
  valor: number;
}

// Variación acumulada de IPC entre dos fechas (meses transcurridos en [desde, hasta)).
// Fuente: ArgentinaDatos (pública, con CORS). Devuelve % o null si falla / faltan datos.
export async function variacionIPC(desde: string, hasta: string): Promise<number | null> {
  try {
    const res = await fetch("https://api.argentinadatos.com/v1/finanzas/indices/inflacion");
    if (!res.ok) return null;
    const data: PuntoIndice[] = await res.json();
    const dM = desde.slice(0, 7); // yyyy-mm
    const hM = hasta.slice(0, 7);
    let factor = 1;
    let count = 0;
    for (const it of data) {
      const m = it.fecha.slice(0, 7);
      if (m >= dM && m < hM) {
        factor *= 1 + it.valor / 100;
        count++;
      }
    }
    if (count === 0) return null;
    return Math.round((factor - 1) * 10000) / 100; // % con 2 decimales
  } catch {
    return null;
  }
}

// ICL: el BCRA lo publica a diario, pero traerlo desde el navegador es poco
// confiable (CORS). Lo dejamos para la fase con backend; por ahora devuelve null
// y la UI pide la variación a mano.
export async function variacionICL(): Promise<number | null> {
  return null;
}
