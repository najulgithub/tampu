import { createClient } from "@supabase/supabase-js";
import { sincronizarUnidad } from "@/lib/icalSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sincroniza los calendarios externos del dueño autenticado.
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return Response.json({ error: "config" }, { status: 500 });

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) return Response.json({ error: "no autenticado" }, { status: 401 });

  const admin = createClient(url, service);
  const { data: unidades } = await admin.from("unidades").select("id, owner_id, icals").eq("owner_id", user.id);

  let total = 0;
  for (const u of unidades ?? []) {
    total += await sincronizarUnidad(admin, u as { id: string; owner_id: string; icals: { plataforma: string; url: string }[] | null });
  }
  return Response.json({ ok: true, bloqueos: total });
}
