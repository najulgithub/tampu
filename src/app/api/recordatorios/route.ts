import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const diffDias = (aIso: string, bIso: string) => Math.round((Date.parse(aIso) - Date.parse(bIso)) / 86400000);
const fmt = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };

// Próximo vencimiento (>= hoy) dado un día del mes, clampeando a fin de mes.
function proximoVencimiento(dia: number, hoy: Date): string {
  const y = hoy.getFullYear(), m = hoy.getMonth();
  const lastThis = new Date(y, m + 1, 0).getDate();
  let due = new Date(y, m, Math.min(dia, lastThis));
  if (isoOf(due) < isoOf(hoy)) {
    const lastNext = new Date(y, m + 2, 0).getDate();
    due = new Date(y, m + 1, Math.min(dia, lastNext));
  }
  return isoOf(due);
}

// Cron diario: genera notificaciones de vencimientos próximos (cobro de alquiler
// y fin de contrato). El insert dispara la push vía webhook. Dedup por 'clave'.
export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cronSecret = process.env.CRON_SECRET;
  if (!url || !service) return new Response("config", { status: 200 });
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return new Response("forbidden", { status: 401 });
  }

  const admin = createClient(url, service);
  const { data: reservas } = await admin
    .from("reservas")
    .select("id, owner_id, huesped, check_out, dia_vencimiento, tipo, estado");

  const hoy = new Date();
  const hoyI = isoOf(hoy);
  const rows: Record<string, unknown>[] = [];

  for (const r of reservas ?? []) {
    if (r.estado === "cancelada" || r.estado === "pendiente") continue;
    if (r.tipo === "temporal") continue; // recordatorios solo para largo plazo
    const huesped = r.huesped || "el inquilino";

    // Fin de contrato dentro de 7 días.
    if (r.check_out) {
      const d = diffDias(r.check_out, hoyI);
      if (d >= 0 && d <= 7) {
        rows.push({
          owner_id: r.owner_id, para: "dueno", reserva_id: r.id, tipo: "info",
          titulo: "Vence un contrato",
          cuerpo: `El contrato de ${huesped} vence el ${fmt(r.check_out)}.`,
          clave: `fincontrato|${r.id}|${r.check_out}`,
        });
      }
    }

    // Cobro mensual: dentro de 3 días del día de vencimiento.
    if (r.dia_vencimiento) {
      const due = proximoVencimiento(Number(r.dia_vencimiento), hoy);
      const d = diffDias(due, hoyI);
      if (d >= 0 && d <= 3) {
        rows.push({
          owner_id: r.owner_id, para: "dueno", reserva_id: r.id, tipo: "pago",
          titulo: "Cobro de alquiler",
          cuerpo: `Cobrar a ${huesped} — vence el ${fmt(due)}.`,
          clave: `cobro|${r.id}|${due}`,
        });
      }
    }
  }

  if (rows.length) {
    await admin.from("notificaciones").upsert(rows, { onConflict: "owner_id,clave", ignoreDuplicates: true });
  }
  return Response.json({ ok: true, generadas: rows.length });
}
