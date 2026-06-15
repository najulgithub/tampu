"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import PortalCliente from "@/components/PortalCliente";
import { ChatWidgetDueno } from "@/components/ChatWidget";
import { CampanaDueno } from "@/components/Campana";
import { LogoTampu } from "@/components/Logo";
import { useStore } from "@/lib/store";
import { planPorUnidades, CONTACTO_EMPRESAS, PLANES } from "@/lib/types";

const NAV = [
  { href: "/", label: "Inicio", icon: "home" },
  { href: "/unidades", label: "Unidades", icon: "building" },
  { href: "/gastos", label: "Gastos", icon: "wallet" },
  { href: "/reportes", label: "Reportes", icon: "chart" },
  { href: "/equipo", label: "Equipo", icon: "users" },
] as const;

function NavIcon({ name, size = 22 }: { name: string; size?: number }) {
  const p: Record<string, React.ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>,
    building: <><rect x="5" y="3" width="14" height="18" rx="1.5" /><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M10 21v-3h4v3" /></>,
    wallet: <><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18" /><path d="M16.5 14h.5" /></>,
    chart: <><path d="M4 20V4M4 20h16" /><rect x="7.5" y="12" width="2.5" height="5" /><rect x="12" y="8" width="2.5" height="9" /><rect x="16.5" y="5" width="2.5" height="12" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5" /><path d="M16 6.2a3 3 0 0 1 0 5.6" /><path d="M15.5 15.2c2.6.3 4.5 2.2 4.5 4.8" /></>,
    gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>,
    doc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
    chat: <><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></>,
    shield: <><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9.5 12l1.8 1.8 3.4-3.6" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {p[name]}
    </svg>
  );
}

function esActivo(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const activo = esActivo(href, pathname);
  return (
    <Link
      href={href}
      className={
        activo
          ? "text-sm font-semibold text-teal-600 dark:text-teal-400"
          : "text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition"
      }
    >
      {children}
    </Link>
  );
}

function useTema(): [boolean, () => void] {
  const [oscuro, setOscuro] = useState(false);
  useEffect(() => {
    setOscuro(document.documentElement.classList.contains("dark"));
  }, []);
  const alternar = () => {
    const nuevo = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nuevo);
    try {
      localStorage.setItem("alquileres.tema", nuevo ? "dark" : "light");
    } catch {}
    setOscuro(nuevo);
  };
  return [oscuro, alternar];
}

function BotonTema() {
  const [oscuro, alternar] = useTema();
  return (
    <button
      onClick={alternar}
      className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition text-base leading-none"
      aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={oscuro ? "Modo claro" : "Modo oscuro"}
    >
      {oscuro ? "☀" : "☾"}
    </button>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authListo, setAuthListo] = useState(false);
  const { rol, puedeEditar, avisos, accesoActivo, diasTrial, suscripcion, esAdmin, unidades } = useStore();
  const planActual = planPorUnidades(unidades.length);
  // Días hasta la renovación (solo aplica a suscripciones pagas por Mercado Pago).
  const diasRenovacion = suscripcion?.periodoFin ? Math.ceil((Date.parse(suscripcion.periodoFin) - Date.now()) / 86400000) : Infinity;
  // Avisamos de cambio de plan solo si paga por MP (tiene precio) y está por renovar (< 30 días).
  const ventanaRenovacion = suscripcion?.estado === "activa" && (suscripcion.precio ?? 0) > 0 && diasRenovacion < 30;
  const mantenimiento = avisos.filter((a) => a.tipo === "mantenimiento");
  const pathname = usePathname();
  const navVisible = NAV.filter((n) => n.href !== "/reportes" || puedeEditar("reportes"));

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthListo(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Si la URL trae un link de cliente (?r=slug), lo guardamos para usarlo al registrarse.
  useEffect(() => {
    try {
      const r = new URLSearchParams(window.location.search).get("r");
      if (r) localStorage.setItem("alquileres.ref", r);
    } catch {}
  }, []);

  if (!authListo) {
    return <div className="min-h-screen grid place-items-center text-slate-400 dark:text-slate-500">Cargando…</div>;
  }

  if (!session) return <Login />;

  if (rol === null) {
    return <div className="min-h-screen grid place-items-center text-slate-400 dark:text-slate-500">Cargando…</div>;
  }

  if (rol === "cliente") return <PortalCliente session={session} />;

  if ((rol === "dueno" || rol === "colaborador") && !accesoActivo) {
    return <Paywall esDueno={rol === "dueno"} email={session.user.email ?? ""} />;
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      <header className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/60 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              <LogoTampu size={28} />
              tampu
            </Link>
            <nav className="hidden sm:flex items-center gap-5">
              {navVisible.map((n) => <NavLink key={n.href} href={n.href}>{n.label}</NavLink>)}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <BotonTema />
            <CampanaDueno />
            {esAdmin && (
              <Link
                href="/admin"
                aria-label="Admin"
                title="Admin"
                className={`transition ${esActivo("/admin", pathname) ? "text-teal-600 dark:text-teal-400" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"}`}
              >
                <NavIcon name="shield" size={20} />
              </Link>
            )}
            <Link
              href="/documentos"
              aria-label="Documentos"
              title="Documentos"
              className={`transition ${esActivo("/documentos", pathname) ? "text-teal-600 dark:text-teal-400" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"}`}
            >
              <NavIcon name="doc" size={20} />
            </Link>
            <Link
              href="/configuracion"
              aria-label="Configuración"
              title="Configuración"
              className={`transition ${esActivo("/configuracion", pathname) ? "text-teal-600 dark:text-teal-400" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"}`}
            >
              <NavIcon name="gear" size={20} />
            </Link>
            <span className="text-slate-500 dark:text-slate-400 hidden md:inline max-w-[160px] truncate">{session.user.email}</span>
            <button onClick={() => supabase.auth.signOut()} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition">
              Salir
            </button>
          </div>
        </div>
      </header>

      {mantenimiento.map((a) => (
        <div key={a.id} className="bg-amber-100 dark:bg-amber-500/15 border-b border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-sm px-4 py-2 text-center">
          🛠 <b>{a.titulo}</b>{a.cuerpo ? ` — ${a.cuerpo}` : ""}
        </div>
      ))}

      {rol === "dueno" && suscripcion?.estado === "trial" && (
        <div className="bg-teal-600 text-white text-sm px-4 py-2 text-center">
          Prueba gratis: te quedan <b>{diasTrial} {diasTrial === 1 ? "día" : "días"}</b>.{" "}
          {planActual.contacto ? (
            <>Plan {planActual.nombre} (a medida).{" "}
            <a href={`mailto:${CONTACTO_EMPRESAS}?subject=Plan%20Empresas%20tampu`} className="underline font-medium hover:opacity-90">Escribinos →</a></>
          ) : (
            <>Plan {planActual.nombre} ${planActual.precio.toLocaleString("es-AR")}/mes.{" "}
            <button onClick={iniciarSuscripcion} className="underline font-medium hover:opacity-90">Suscribite ahora →</button></>
          )}
        </div>
      )}

      {rol === "dueno" && ventanaRenovacion && !planActual.contacto && planActual.precio > (suscripcion!.precio ?? 0) && (
        <div className="bg-amber-500 text-white text-sm px-4 py-2 text-center">
          Creciste a <b>{unidades.length} unidades</b> → te corresponde el plan {planActual.nombre} (${planActual.precio.toLocaleString("es-AR")}/mes).{" "}
          <button onClick={actualizarPlan} className="underline font-medium hover:opacity-90">Actualizar mi plan →</button>
        </div>
      )}

      {rol === "dueno" && ventanaRenovacion && planActual.contacto && (
        <div className="bg-amber-500 text-white text-sm px-4 py-2 text-center">
          Tu cuenta creció al plan <b>Empresas</b> ({unidades.length} unidades).{" "}
          <a href={`mailto:${CONTACTO_EMPRESAS}?subject=Plan%20Empresas%20tampu`} className="underline font-medium hover:opacity-90">Escribinos →</a>
        </div>
      )}

      <main key={pathname} className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-8 animate-in">{children}</main>

      {/* Barra inferior tipo app (solo mobile) */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-700/60">
        <div className="grid max-w-md mx-auto" style={{ gridTemplateColumns: `repeat(${navVisible.length}, minmax(0, 1fr))` }}>
          {navVisible.map((n) => {
            const activo = esActivo(n.href, pathname);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex flex-col items-center gap-0.5 py-2 transition ${activo ? "text-teal-600 dark:text-teal-400" : "text-slate-400 dark:text-slate-500"}`}
              >
                <NavIcon name={n.icon} size={22} />
                <span className="text-[10px] font-medium">{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <ChatWidgetDueno />
    </div>
  );
}

// Inicia el flujo de suscripción: pide el link de pago al backend y redirige a Mercado Pago.
async function iniciarSuscripcion() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  try {
    const res = await fetch("/api/suscribir", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } });
    const j = await res.json().catch(() => ({}));
    if (j.init_point) window.location.href = j.init_point;
    else alert("No se pudo iniciar la suscripción. Probá de nuevo en un momento.");
  } catch {
    alert("No se pudo iniciar la suscripción. Probá de nuevo en un momento.");
  }
}

// Sube de plan: actualiza el monto de la suscripción en Mercado Pago.
async function actualizarPlan() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  try {
    const res = await fetch("/api/plan/actualizar", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } });
    const j = await res.json().catch(() => ({}));
    if (j.init_point) { window.location.href = j.init_point; return; }
    if (j.ok) { alert(`Listo, tu plan ahora es ${j.plan} ($${(j.precio ?? 0).toLocaleString("es-AR")}/mes).`); window.location.reload(); return; }
    alert("No se pudo actualizar el plan. Probá de nuevo en un rato.");
  } catch {
    alert("No se pudo actualizar el plan.");
  }
}

function Paywall({ esDueno, email }: { esDueno: boolean; email: string }) {
  const { unidades } = useStore();
  const [cargando, setCargando] = useState(false);
  const plan = planPorUnidades(unidades.length);
  async function suscribir() { setCargando(true); await iniciarSuscripcion(); setCargando(false); }

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-gradient-to-br from-teal-50 via-stone-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-sm text-center animate-in">
        <LogoTampu size={64} className="rounded-2xl shadow-lg shadow-teal-500/25 mx-auto" />
        <h1 className="mt-4 font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">Tu prueba terminó</h1>
        {esDueno && plan.contacto ? (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Con {unidades.length} unidades te corresponde el plan <b>Empresas</b>, a medida. Escribinos y armamos tu suscripción.
            </p>
            <a
              href={`mailto:${CONTACTO_EMPRESAS}?subject=Plan%20Empresas%20tampu&body=Hola,%20tengo%20${unidades.length}%20unidades%20y%20quiero%20el%20plan%20Empresas.`}
              className="mt-5 block w-full rounded-lg bg-teal-600 text-white py-3 text-sm font-semibold shadow-sm hover:bg-teal-700 active:scale-[.98] transition"
            >
              Escribinos para tu plan
            </a>
            <button onClick={() => location.reload()} className="mt-3 text-xs text-teal-600 dark:text-teal-400 hover:underline">Ya está activo — actualizar</button>
          </>
        ) : esDueno ? (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Suscribite para seguir gestionando tus alquileres con tampu. Tus datos están guardados y vuelven apenas reactivás.
            </p>
            <div className="mt-4 rounded-xl border border-teal-200 dark:border-teal-500/30 bg-teal-50/60 dark:bg-teal-500/10 p-4">
              <div className="text-xs uppercase tracking-wide text-teal-700 dark:text-teal-300 font-semibold">Plan {plan.nombre}</div>
              <div className="text-3xl font-semibold text-slate-800 dark:text-slate-100 mt-1 tabular-nums">${plan.precio.toLocaleString("es-AR")}<span className="text-sm font-normal text-slate-500 dark:text-slate-400">/mes</span></div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Según tus {unidades.length} {unidades.length === 1 ? "unidad" : "unidades"} cargadas.</div>
            </div>
            <button
              onClick={suscribir}
              disabled={cargando}
              className="mt-5 w-full rounded-lg bg-teal-600 text-white py-3 text-sm font-semibold shadow-sm hover:bg-teal-700 active:scale-[.98] transition disabled:opacity-50"
            >
              {cargando ? "Redirigiendo…" : "Suscribirme con Mercado Pago"}
            </button>
            <button onClick={() => location.reload()} className="mt-3 text-xs text-teal-600 dark:text-teal-400 hover:underline">Ya pagué — actualizar</button>
          </>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            El acceso del negocio está suspendido. Avisale al propietario para que renueve la suscripción.
          </p>
        )}
        <button onClick={() => supabase.auth.signOut()} className="mt-6 block mx-auto text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">Salir ({email})</button>
      </div>
    </div>
  );
}

// Landing pública de planes (accesible desde el login, sin estar logueado).
function LandingPlanes({ onCerrar }: { onCerrar: () => void }) {
  const rango = (i: number) => {
    const p = PLANES[i];
    const desde = i === 0 ? 1 : PLANES[i - 1].hasta + 1;
    if (p.hasta === Infinity) return `${desde} o más unidades`;
    if (i === 0) return `hasta ${p.hasta} unidades`;
    return `${desde} a ${p.hasta} unidades`;
  };
  return (
    <div className="min-h-screen px-4 py-10 bg-gradient-to-br from-teal-50 via-stone-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-3xl mx-auto animate-in">
        <div className="flex flex-col items-center text-center mb-8">
          <LogoTampu size={56} className="rounded-2xl shadow-lg shadow-teal-500/25" />
          <h1 className="mt-4 font-display text-3xl font-semibold text-slate-800 dark:text-slate-100">Planes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-md">
            Empezá con <b>30 días gratis</b>. El precio depende de cuántas unidades gestiones — todas las funciones incluidas.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLANES.map((p, i) => (
            <div
              key={p.nombre}
              className={`rounded-2xl border bg-white dark:bg-slate-800 shadow-sm p-5 ${p.nombre === "Pro" ? "border-teal-400 dark:border-teal-500/50 ring-1 ring-teal-400/40" : "border-slate-200 dark:border-slate-700/70"}`}
            >
              {p.nombre === "Pro" && <div className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-1">Más elegido</div>}
              <div className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">{p.nombre}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{rango(i)}</div>
              <div className="mt-3">
                {p.contacto ? (
                  <div className="text-2xl font-semibold text-slate-800 dark:text-slate-100">A convenir</div>
                ) : (
                  <div className="text-3xl font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
                    ${p.precio.toLocaleString("es-AR")}<span className="text-sm font-normal text-slate-500 dark:text-slate-400">/mes</span>
                  </div>
                )}
              </div>
              {p.contacto && (
                <a href={`mailto:${CONTACTO_EMPRESAS}?subject=Plan%20Empresas%20tampu`} className="mt-3 inline-block text-sm text-teal-600 dark:text-teal-400 hover:underline">Escribinos →</a>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-6 max-w-lg mx-auto">
          Cambiás de plan automáticamente al sumar unidades. Precios en pesos, podés cancelar cuando quieras.
        </p>

        <button onClick={onCerrar} className="mt-8 mx-auto block rounded-lg bg-teal-600 text-white px-6 py-2.5 text-sm font-semibold shadow-sm hover:bg-teal-700 active:scale-[.98] transition">
          ← Volver a ingresar
        </button>
      </div>
    </div>
  );
}

function Login() {
  const [modo, setModo] = useState<"ingresar" | "crear">("ingresar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [cargando, setCargando] = useState(false);
  const [verPlanes, setVerPlanes] = useState(false);
  // Si llegó por un link de cliente (?r=slug), saludamos con el nombre del negocio.
  const [negocioInvita, setNegocioInvita] = useState<string | null>(null);

  useEffect(() => {
    let ref: string | null = null;
    try { ref = new URLSearchParams(window.location.search).get("r") ?? localStorage.getItem("alquileres.ref"); } catch {}
    if (!ref) return;
    setModo("crear"); // viene a reservar → registro por defecto
    supabase.rpc("negocio_por_slug", { p_slug: ref }).then(({ data }) => {
      if (typeof data === "string" && data) setNegocioInvita(data);
    });
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAviso("");
    setCargando(true);
    try {
      if (modo === "ingresar") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setError(traducir(error.message));
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) setError(traducir(error.message));
        else if (!data.session) setAviso("Te enviamos un email para confirmar la cuenta. Confirmalo y volvé a ingresar.");
      }
    } finally {
      setCargando(false);
    }
  }

  if (verPlanes) return <LandingPlanes onCerrar={() => setVerPlanes(false)} />;

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-gradient-to-br from-teal-50 via-stone-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-sm animate-in">
        <div className="flex flex-col items-center text-center mb-6">
          <LogoTampu size={64} className="rounded-2xl shadow-lg shadow-teal-500/25" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">tampu</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            {negocioInvita ? `Reservá tu estadía en ${negocioInvita}.` : "Gestioná tus propiedades, todo el año."}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-xl p-7">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-4">
            {modo === "ingresar" ? "Ingresá a tu cuenta" : "Creá tu cuenta"}
          </p>

          <form onSubmit={enviar} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Email</label>
              <input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} required className="input" placeholder="email@ejemplo.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="input" placeholder="••••••••" />
            </div>

            {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
            {aviso && <p className="text-sm text-emerald-600 dark:text-emerald-400">{aviso}</p>}

            <button type="submit" disabled={cargando} className="w-full rounded-lg bg-teal-600 text-white py-2.5 text-sm font-semibold shadow-sm hover:bg-teal-700 active:scale-[.98] transition disabled:opacity-50">
              {cargando ? "..." : modo === "ingresar" ? "Ingresar" : "Crear cuenta"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-400 dark:text-slate-500">o</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          <button
            type="button"
            onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } })}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
            Continuar con Google
          </button>

          <button
            onClick={() => { setModo(modo === "ingresar" ? "crear" : "ingresar"); setError(""); setAviso(""); }}
            className="mt-4 text-sm text-teal-600 dark:text-teal-400 hover:underline"
          >
            {modo === "ingresar" ? "¿No tenés cuenta? Crear una" : "¿Ya tenés cuenta? Ingresar"}
          </button>
        </div>

        <button
          onClick={() => setVerPlanes(true)}
          className="mt-5 mx-auto block text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition"
        >
          Ver planes y precios →
        </button>
      </div>
    </div>
  );
}

function traducir(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "Email o contraseña incorrectos.";
  if (/already registered/i.test(msg)) return "Ese email ya tiene cuenta.";
  if (/password should be at least/i.test(msg)) return "La contraseña debe tener al menos 6 caracteres.";
  if (/email not confirmed/i.test(msg)) return "Tenés que confirmar tu email antes de ingresar.";
  return msg;
}
