import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Webhook de Mercado Pago: actualiza el estado de la suscripción del dueño.
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const mpToken = process.env.MP_ACCESS_TOKEN;
  if (!url || !service || !mpToken) return new Response("config", { status: 200 });

  const body = (await req.json().catch(() => ({}))) as { type?: string; data?: { id?: string } };
  const u = new URL(req.url);
  const id = body.data?.id || u.searchParams.get("data.id") || u.searchParams.get("id");
  const tipo = body.type || u.searchParams.get("type") || u.searchParams.get("topic") || "";
  if (!id || !/preapproval/i.test(String(tipo))) return new Response("ignored", { status: 200 });

  const r = await fetch(`https://api.mercadopago.com/preapproval/${id}`, { headers: { Authorization: `Bearer ${mpToken}` } });
  const pre = (await r.json().catch(() => ({}))) as { status?: string; external_reference?: string; next_payment_date?: string };
  if (!r.ok || !pre.external_reference) return new Response("ok", { status: 200 });

  const estado = pre.status === "authorized" ? "activa" : pre.status === "cancelled" || pre.status === "paused" ? "vencida" : "trial";
  const admin = createClient(url, service);
  await admin.from("suscripciones").update({
    estado,
    periodo_fin: pre.next_payment_date ?? null,
    mp_preapproval_id: id,
    updated_at: new Date().toISOString(),
  }).eq("owner_id", pre.external_reference);

  // Avisar a los admins cuando una suscripción se activa (pago confirmado).
  if (estado === "activa") {
    let email = pre.external_reference;
    try {
      const { data } = await admin.auth.admin.getUserById(pre.external_reference);
      email = data.user?.email ?? email;
    } catch {}
    await admin.rpc("notificar_admins", {
      p_titulo: "Suscripción activada 💳",
      p_cuerpo: `${email} activó su suscripción en tampu.`,
      p_clave: `pago|${id}`,
    });
  }

  return new Response("ok", { status: 200 });
}

// MP a veces verifica el endpoint con un GET.
export async function GET() {
  return new Response("ok", { status: 200 });
}
