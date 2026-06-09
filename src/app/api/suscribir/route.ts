import { createClient } from "@supabase/supabase-js";
import { planPorUnidades } from "@/lib/types";

export const dynamic = "force-dynamic";

// Crea una suscripción (preapproval) en Mercado Pago y devuelve el link de pago.
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_KEY;
  const mpToken = process.env.MP_ACCESS_TOKEN;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon) return Response.json({ error: "config" }, { status: 500 });
  if (!mpToken) return Response.json({ error: "Mercado Pago no configurado" }, { status: 500 });

  // Identificar al usuario por su token de Supabase.
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) return Response.json({ error: "no autenticado" }, { status: 401 });

  // El plan (y su precio) depende de cuántas unidades tiene cargadas el dueño.
  const { count } = await sb.from("unidades").select("id", { count: "exact", head: true });
  const plan = planPorUnidades(count ?? 0);
  // El plan Empresas no se cobra automático: se gestiona por contacto.
  if (plan.contacto) return Response.json({ error: "contacto", plan: plan.nombre }, { status: 200 });
  const precio = plan.precio;

  const origin = req.headers.get("origin") || "https://tampu.ar";
  const r = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: { Authorization: `Bearer ${mpToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      reason: `Suscripción tampu — plan ${plan.nombre}`,
      external_reference: user.id,
      payer_email: user.email,
      back_url: origin,
      auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: precio, currency_id: "ARS" },
      status: "pending",
    }),
  });
  const data = (await r.json().catch(() => ({}))) as { init_point?: string; id?: string; message?: string };
  if (!r.ok || !data.init_point) return Response.json({ error: data.message || "Error de Mercado Pago", detalle: data }, { status: 400 });

  // Guardar el id de la suscripción (service role saltea RLS).
  if (service) {
    const admin = createClient(url, service);
    await admin.from("suscripciones").update({ mp_preapproval_id: data.id, updated_at: new Date().toISOString() }).eq("owner_id", user.id);
  }

  return Response.json({ init_point: data.init_point });
}
