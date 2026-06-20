import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const telLink = (t: string) => `tel:${String(t).replace(/[^0-9+]/g, "")}`;
const waLink = (t: string) => `https://wa.me/${String(t).replace(/[^0-9]/g, "")}`;

// Guía pública del huésped para una unidad (se abre escaneando el QR de la unidad).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return new Response("config", { status: 500 });
  const admin = createClient(url, service);

  const { data: u } = await admin
    .from("unidades")
    .select("owner_id, nombre, direccion, localidad, wifi_nombre, wifi_clave, encargado_nombre, encargado_tel, instrucciones, puntos_interes")
    .eq("id", id)
    .maybeSingle();
  if (!u) return new Response("Unidad no encontrada", { status: 404 });

  const { data: provs } = await admin
    .from("proveedores")
    .select("nombre, rubro, telefono")
    .eq("owner_id", u.owner_id)
    .eq("visible_inquilino", true)
    .order("rubro");

  const puntos = (Array.isArray(u.puntos_interes) ? u.puntos_interes : []) as { nombre: string; url: string }[];

  const seccion = (titulo: string, contenido: string) =>
    contenido ? `<section><h2>${esc(titulo)}</h2>${contenido}</section>` : "";

  const wifi = (u.wifi_nombre || u.wifi_clave)
    ? `<div class="kv"><span>Red</span><b>${esc(u.wifi_nombre || "—")}</b></div><div class="kv"><span>Clave</span><b class="mono">${esc(u.wifi_clave || "—")}</b></div>`
    : "";

  const encargado = (u.encargado_nombre || u.encargado_tel)
    ? `<div class="kv"><span>${esc(u.encargado_nombre || "Encargado")}</span>${u.encargado_tel ? `<span class="acc"><a href="${telLink(u.encargado_tel)}">📞 ${esc(u.encargado_tel)}</a> · <a href="${waLink(u.encargado_tel)}">WhatsApp</a></span>` : ""}</div>`
    : "";

  const instrucciones = u.instrucciones ? `<p class="multi">${esc(u.instrucciones)}</p>` : "";

  const puntosHtml = puntos.length
    ? `<ul>${puntos.map((p) => `<li><a href="${esc(p.url)}" target="_blank" rel="noreferrer">📍 ${esc(p.nombre)}</a></li>`).join("")}</ul>`
    : "";

  const provsHtml = (provs && provs.length)
    ? `<ul>${provs.map((p) => `<li><b>${esc(p.nombre)}</b>${p.rubro ? ` · ${esc(p.rubro)}` : ""}${p.telefono ? ` — <a href="${telLink(p.telefono)}">${esc(p.telefono)}</a>` : ""}</li>`).join("")}</ul>`
    : "";

  const mapsDir = (u.direccion || u.localidad)
    ? `<a class="maps" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${u.direccion ?? ""} ${u.localidad ?? ""}`)}" target="_blank" rel="noreferrer">📍 Ver en Google Maps</a>`
    : "";

  const html = `<!doctype html><html lang="es"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(u.nombre)} · Guía</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background:#f1f5f9; color:#0f172a; }
  .wrap { max-width: 640px; margin: 0 auto; padding: 20px 16px 48px; }
  header { background: linear-gradient(135deg,#2f807a,#1f6f6b); color:#fff; border-radius:18px; padding:22px; margin-bottom:18px; }
  header h1 { margin:0 0 4px; font-size:1.5rem; }
  header p { margin:0; opacity:.9; font-size:.9rem; }
  .maps { display:inline-block; margin-top:10px; color:#fff; font-weight:600; text-decoration:none; background:rgba(255,255,255,.18); padding:6px 12px; border-radius:999px; font-size:.85rem; }
  section { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:16px; margin-bottom:14px; }
  h2 { margin:0 0 10px; font-size:1rem; color:#1f6f6b; }
  .kv { display:flex; justify-content:space-between; gap:12px; padding:6px 0; border-bottom:1px solid #f1f5f9; }
  .kv:last-child { border-bottom:0; }
  .kv span { color:#64748b; font-size:.9rem; }
  .mono { font-family: ui-monospace, monospace; letter-spacing:.5px; }
  .acc a, ul a { color:#0d9488; text-decoration:none; }
  .multi { white-space:pre-line; margin:0; color:#334155; line-height:1.5; }
  ul { margin:0; padding-left:18px; } li { margin:6px 0; line-height:1.4; }
  footer { text-align:center; color:#94a3b8; font-size:.8rem; margin-top:24px; }
</style></head><body><div class="wrap">
  <header>
    <h1>${esc(u.nombre)}</h1>
    <p>${esc([u.direccion, u.localidad].filter(Boolean).join(", "))}</p>
    ${mapsDir}
  </header>
  ${seccion("📶 WiFi", wifi)}
  ${seccion("📋 Información útil", instrucciones)}
  ${seccion("🙋 Encargado", encargado)}
  ${seccion("🗺️ Lugares de interés", puntosHtml)}
  ${seccion("🔧 Contactos útiles", provsHtml)}
  <footer>Guía de ${esc(u.nombre)} · tampu</footer>
</div></body></html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=120" },
  });
}
