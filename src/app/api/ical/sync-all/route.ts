import { createClient } from "@supabase/supabase-js";
import { sincronizarUnidad } from "@/lib/icalSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sincroniza TODAS las unidades con calendarios externos. Lo dispara el cron de Vercel.
export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cronSecret = process.env.CRON_SECRET;
  if (!url || !service) return new Response("config", { status: 200 });

  // Si hay secreto configurado, exigirlo (Vercel lo manda en el header Authorization).
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return new Response("forbidden", { status: 401 });
  }

  const admin = createClient(url, service);
  const { data: unidades } = await admin.from("unidades").select("id, owner_id, icals");

  let total = 0, conIcal = 0;
  for (const u of unidades ?? []) {
    const icals = (u as { icals?: unknown[] }).icals;
    if (!Array.isArray(icals) || icals.length === 0) continue;
    conIcal++;
    total += await sincronizarUnidad(admin, u as { id: string; owner_id: string; icals: { plataforma: string; url: string }[] | null });
  }
  return Response.json({ ok: true, unidades: conIcal, bloqueos: total });
}
