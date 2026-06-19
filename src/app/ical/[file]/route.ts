import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// yyyy-mm-dd -> yyyymmdd (formato fecha de iCal para eventos de día completo)
function fechaICal(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, "");
}

// Exporta un calendario .ics vivo con las reservas de una unidad, para que
// Airbnb/Booking/Google lo importen y bloqueen esas fechas.
// URL pública: /ical/<unidadId>.ics  (el UUID hace de "token", como en Airbnb).
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const unidadId = file.replace(/\.ics$/i, "");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return new Response("config", { status: 500 });

  // Service role: el feed es público (sin sesión), así que saltea RLS.
  const admin = createClient(url, service);

  const { data: unidad } = await admin.from("unidades").select("nombre").eq("id", unidadId).maybeSingle();
  if (!unidad) return new Response("Unidad no encontrada", { status: 404 });

  const { data: reservas } = await admin
    .from("reservas")
    .select("id, check_in, check_out, estado")
    .eq("unidad_id", unidadId)
    .neq("estado", "cancelada");

  // También exportamos los bloqueos importados de OTRAS plataformas, así tampu
  // funciona de hub: una reserva de Airbnb (importada) bloquea también en Booking.
  const { data: bloqueos } = await admin
    .from("bloqueos")
    .select("id, desde, hasta, plataforma")
    .eq("unidad_id", unidadId);

  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//tampu//iCal//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${unidad.nombre} - tampu`,
  ];

  for (const r of reservas ?? []) {
    if (!r.check_in || !r.check_out) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${r.id}@tampu.ar`,
      `DTSTAMP:${stamp}`,
      // Día completo: DTEND es exclusivo, así el día de check-out queda libre para otra reserva.
      `DTSTART;VALUE=DATE:${fechaICal(r.check_in)}`,
      `DTEND;VALUE=DATE:${fechaICal(r.check_out)}`,
      "SUMMARY:Reservado (tampu)",
      "END:VEVENT"
    );
  }

  for (const b of bloqueos ?? []) {
    if (!b.desde || !b.hasta) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:bloq-${b.id}@tampu.ar`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${fechaICal(b.desde)}`,
      `DTEND;VALUE=DATE:${fechaICal(b.hasta)}`,
      `SUMMARY:Reservado (${b.plataforma || "otra plataforma"})`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");

  const body = lines.join("\r\n") + "\r\n";
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${unidadId}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
