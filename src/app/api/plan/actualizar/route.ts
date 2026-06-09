import { createClient } from "@supabase/supabase-js";
import { planPorUnidades } from "@/lib/types";

export const dynamic = "force-dynamic";

// Sube de plan: actualiza el monto de la suscripción existente en Mercado Pago
// según las unidades actuales del dueño. Solo permite subir (no bajar).
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_KEY;
  const mpToken = process.env.MP_ACCESS_TOKEN;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon || !mpToken) return Response.json({ error: "config" }, { status: 500 });

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) return Response.json({ error: "no autenticado" }, { status: 401 });

  // Plan que le corresponde por sus unidades actuales.
  const { count } = await sb.from("unidades").select("id", { count: "exact", head: true });
  const plan = planPorUnidades(count ?? 0);
  if (plan.contacto) return Response.json({ error: "contacto", plan: plan.nombre }, { status: 200 });

  // Suscripción actual.
  const { data: susc } = await sb.from("suscripciones").select("mp_preapproval_id, precio").maybeSingle();
  if (!susc?.mp_preapproval_id) return Response.json({ error: "sin_suscripcion" }, { status: 200 });
  if (plan.precio <= (susc.precio ?? 0)) return Response.json({ error: "sin_cambio" }, { status: 200 });

  // Actualizar el monto en Mercado Pago.
  const r = await fetch(`https://api.mercadopago.com/preapproval/${susc.mp_preapproval_id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${mpToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ auto_recurring: { transaction_amount: plan.precio, currency_id: "ARS" } }),
  });
  const data = (await r.json().catch(() => ({}))) as { init_point?: string; message?: string };
  if (!r.ok) return Response.json({ error: data.message || "No se pudo actualizar en Mercado Pago", detalle: data }, { status: 400 });

  // Guardar el nuevo precio pactado.
  if (service) {
    const admin = createClient(url, service);
    await admin.from("suscripciones").update({ precio: plan.precio, updated_at: new Date().toISOString() }).eq("owner_id", user.id);
  }

  // Si MP exige re-autorización del nuevo monto, devuelve un link para confirmar.
  return Response.json({ ok: true, precio: plan.precio, plan: plan.nombre, init_point: data.init_point });
}
