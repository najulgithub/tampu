// Parser mínimo de iCalendar: extrae los rangos ocupados (VEVENT con DTSTART/DTEND).
// Soporta fechas VALUE=DATE (yyyymmdd) y datetime (yyyymmddThhmmssZ).
export function parseICS(texto: string): { desde: string; hasta: string }[] {
  // Desplegar líneas plegadas (continúan con espacio/tab al inicio).
  const unfolded = texto.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const lineas = unfolded.split(/\r\n|\n|\r/);
  const rangos: { desde: string; hasta: string }[] = [];
  let inEvent = false, dtstart = "", dtend = "";

  const fecha = (v: string): string => {
    const m = v.match(/(\d{4})(\d{2})(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
  };

  for (const ln of lineas) {
    if (ln.startsWith("BEGIN:VEVENT")) { inEvent = true; dtstart = ""; dtend = ""; continue; }
    if (ln.startsWith("END:VEVENT")) {
      if (dtstart && dtend) rangos.push({ desde: dtstart, hasta: dtend });
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;
    if (ln.startsWith("DTSTART")) dtstart = fecha(ln.split(":").pop() ?? "");
    else if (ln.startsWith("DTEND")) dtend = fecha(ln.split(":").pop() ?? "");
  }
  return rangos.filter((r) => r.desde && r.hasta && r.desde < r.hasta);
}
