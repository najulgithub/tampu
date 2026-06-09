import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Recibe el Database Webhook de Supabase cuando se inserta una notificación
// y manda la push a los dispositivos del destinatario.
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:soporte@tampu.ar";
  const secret = process.env.PUSH_WEBHOOK_SECRET;

  // Seguridad: solo acepta llamadas con el secreto compartido.
  if (secret && req.headers.get("x-webhook-secret") !== secret) {
    return new Response("forbidden", { status: 401 });
  }
  if (!url || !service || !pub || !priv) return new Response("config", { status: 200 });

  const body = (await req.json().catch(() => ({}))) as {
    record?: { owner_id?: string; para?: string; reserva_id?: string; tipo?: string; titulo?: string; cuerpo?: string };
  };
  const n = body.record;
  if (!n || !n.titulo) return new Response("ignored", { status: 200 });

  const admin = createClient(url, service);

  // Resolver a qué usuario(s) le mandamos según el destinatario de la notificación.
  const targets: string[] = [];
  if (n.para === "dueno" && n.owner_id) {
    targets.push(n.owner_id);
  } else if (n.para === "inquilino" && n.reserva_id) {
    const { data: r } = await admin.from("reservas").select("cliente_id").eq("id", n.reserva_id).maybeSingle();
    if (r?.cliente_id) targets.push(r.cliente_id);
  }
  if (targets.length === 0) return new Response("no-target", { status: 200 });

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", targets);
  if (!subs || subs.length === 0) return new Response("no-subs", { status: 200 });

  webpush.setVapidDetails(subject, pub, priv);

  const ruta = n.tipo === "mensaje" ? "/mensajes" : "/";
  const payload = JSON.stringify({
    title: n.titulo,
    body: n.cuerpo || "",
    url: ruta,
    tag: n.reserva_id || n.tipo || undefined,
  });

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
      } catch (err: unknown) {
        // Suscripción muerta (navegador desinstalado / permiso revocado): la borramos.
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    })
  );

  return new Response("ok", { status: 200 });
}
