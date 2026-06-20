"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

function IconoChat({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

const burbuja = (propio: boolean) =>
  `text-sm px-3 py-1.5 rounded-2xl max-w-[80%] whitespace-pre-wrap break-words ${propio ? "bg-teal-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"}`;

// Fila de "escribir + enviar". El textarea crece con el texto (hasta un tope) y
// Enter envía / Shift+Enter hace salto de línea.
function CampoMensaje({ value, onChange, onEnviar }: { value: string; onChange: (v: string) => void; onEnviar: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [value]);
  return (
    <div className="p-2 border-t border-slate-100 dark:border-slate-700 flex items-end gap-2 shrink-0">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onEnviar(); } }}
        className="input flex-1 resize-none leading-snug py-2 max-h-[120px] overflow-y-auto"
        placeholder="Escribir…"
        autoFocus
      />
      <button onClick={onEnviar} disabled={!value.trim()} className="btn-primario shrink-0 disabled:opacity-50">Enviar</button>
    </div>
  );
}

// Cáscara visual del widget (botón flotante + panel).
function Burbuja({
  abierto,
  setAbierto,
  badge,
  titulo,
  onAtras,
  children,
}: {
  abierto: boolean;
  setAbierto: (v: boolean) => void;
  badge?: number;
  titulo: string;
  onAtras?: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {abierto && (
        <div className="fixed z-40 right-4 bottom-40 sm:bottom-20 w-[min(360px,calc(100vw-2rem))] h-[70vh] max-h-[520px] rounded-2xl shadow-2xl ring-1 ring-black/10 bg-white dark:bg-slate-800 flex flex-col overflow-hidden animate-in">
          <div className="flex items-center gap-2 px-4 h-12 shrink-0 bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
            {onAtras && <button onClick={onAtras} className="text-white/90 hover:text-white text-lg leading-none">‹</button>}
            <span className="font-medium text-sm truncate flex-1">{titulo}</span>
            <button onClick={() => setAbierto(false)} className="text-white/90 hover:text-white text-xl leading-none">×</button>
          </div>
          {children}
        </div>
      )}
      <button
        onClick={() => setAbierto(!abierto)}
        aria-label="Mensajes"
        className="fixed z-40 right-4 bottom-20 sm:bottom-6 w-14 h-14 rounded-full bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/30 grid place-items-center transition active:scale-95"
      >
        {abierto ? <span className="text-2xl leading-none">×</span> : <IconoChat />}
        {!abierto && badge ? (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 grid place-items-center rounded-full bg-rose-500 text-white text-[11px] font-bold ring-2 ring-white dark:ring-slate-900">{badge}</span>
        ) : null}
      </button>
    </>
  );
}

// ---------- Widget del dueño (conversaciones desde el store) ----------
export function ChatWidgetDueno() {
  const { mensajes, reservas, getUnidad, mensajesDe, enviarMensaje, marcarLeidos, enviarConsultaDueno, marcarLeidosConsulta, mensajesNoLeidos } = useStore();
  const [abierto, setAbierto] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [texto, setTexto] = useState("");

  // Inquilinos con quien se puede iniciar conversación (vinculados por email o portal).
  const elegibles = reservas
    .filter((r) => r.emailInquilino || r.clienteId)
    .map((r) => ({ rid: r.id, huesped: r.huesped, unidad: getUnidad(r.unidadId)?.nombre ?? "—" }))
    .sort((a, b) => a.huesped.localeCompare(b.huesped));

  // Conversaciones por reserva.
  const ids = Array.from(new Set(mensajes.filter((m) => m.reservaId).map((m) => m.reservaId)));
  const convoReservas = ids.map((rid) => {
    const ms = mensajes.filter((m) => m.reservaId === rid).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const r = reservas.find((x) => x.id === rid);
    return {
      key: rid, esConsulta: false, cid: "", email: "",
      ultimo: ms[ms.length - 1], noLeidos: ms.filter((m) => m.autor === "inquilino" && !m.leidoDueno).length,
      huesped: r?.huesped ?? "Inquilino", unidad: r ? (getUnidad(r.unidadId)?.nombre ?? "—") : "—",
    };
  });
  // Consultas pre-reserva (sin reserva), agrupadas por huésped.
  const cids = Array.from(new Set(mensajes.filter((m) => m.clienteId && !m.reservaId).map((m) => m.clienteId!)));
  const convoConsultas = cids.map((cid) => {
    const ms = mensajes.filter((m) => m.clienteId === cid && !m.reservaId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const email = ms.find((m) => m.clienteEmail)?.clienteEmail ?? "Consulta";
    return {
      key: "c:" + cid, esConsulta: true, cid, email,
      ultimo: ms[ms.length - 1], noLeidos: ms.filter((m) => m.autor === "inquilino" && !m.leidoDueno).length,
      huesped: email, unidad: "Consulta (sin reserva)",
    };
  });
  const convos = [...convoReservas, ...convoConsultas].sort((a, b) => (b.ultimo?.createdAt ?? "").localeCompare(a.ultimo?.createdAt ?? ""));

  const selConvo = convos.find((c) => c.key === sel);
  function abrir(key: string) {
    setSel(key); setNuevo(false);
    if (key.startsWith("c:")) marcarLeidosConsulta(key.slice(2)); else marcarLeidos(key);
  }
  function enviar() {
    if (!sel || !texto.trim()) return;
    if (sel.startsWith("c:") && selConvo) enviarConsultaDueno(selConvo.cid, selConvo.email, texto.trim());
    else enviarMensaje(sel, texto.trim());
    setTexto("");
  }

  const msgs = !sel ? [] : sel.startsWith("c:")
    ? mensajes.filter((m) => m.clienteId === sel.slice(2) && !m.reservaId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    : mensajesDe(sel);
  const titulo = sel ? (selConvo?.huesped ?? "Inquilino") : nuevo ? "Escribir a…" : "Mensajes";
  const onAtras = sel ? () => setSel(null) : nuevo ? () => setNuevo(false) : undefined;

  return (
    <Burbuja abierto={abierto} setAbierto={(v) => { setAbierto(v); if (!v) { setSel(null); setNuevo(false); } }} badge={mensajesNoLeidos} titulo={titulo} onAtras={onAtras}>
      {sel ? null : nuevo ? (
        <div className="flex-1 overflow-y-auto">
          {elegibles.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 p-6 text-center">No hay inquilinos con portal vinculado. Cargá el email del inquilino en el contrato.</p>
          ) : elegibles.map((e) => (
            <button key={e.rid} onClick={() => abrir(e.rid)} className="w-full text-left flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/40">
              <span className="shrink-0 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 grid place-items-center text-xs font-semibold text-slate-600 dark:text-slate-200 uppercase">{e.huesped.trim().charAt(0) || "?"}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{e.huesped}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500 truncate">{e.unidad}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <button onClick={() => setNuevo(true)} className="w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 text-sm font-medium text-teal-600 dark:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-700/40">
            + Escribir a un inquilino
          </button>
          {convos.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 p-6 text-center">Sin conversaciones todavía.</p>
          ) : convos.map((c) => (
            <button key={c.key} onClick={() => abrir(c.key)} className="w-full text-left flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/40">
              <span className="shrink-0 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 grid place-items-center text-xs font-semibold text-slate-600 dark:text-slate-200 uppercase">{c.huesped.trim().charAt(0) || "?"}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{c.huesped} <span className="text-xs text-slate-400">· {c.unidad}</span></div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{c.ultimo ? `${c.ultimo.autor === "dueno" ? "Vos: " : ""}${c.ultimo.texto}` : ""}</div>
              </div>
              {c.noLeidos > 0 && <span className="shrink-0 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-rose-500 text-white text-[10px] font-bold">{c.noLeidos}</span>}
            </button>
          ))}
        </div>
      )}
      {sel && (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {msgs.length === 0 ? <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">Sin mensajes.</p> :
              msgs.map((m) => <div key={m.id} className={`flex ${m.autor === "dueno" ? "justify-end" : "justify-start"}`}><span className={burbuja(m.autor === "dueno")}>{m.texto}</span></div>)}
          </div>
          <CampoMensaje value={texto} onChange={setTexto} onEnviar={enviar} />
        </>
      )}
    </Burbuja>
  );
}

// ---------- Widget de consulta pre-reserva (huésped → dueño del slug, vía RPC) ----------
export function ChatWidgetConsulta({ slug }: { slug: string }) {
  const [abierto, setAbierto] = useState(false);
  const [msgs, setMsgs] = useState<{ autor: string; texto: string; created_at: string }[]>([]);
  const [texto, setTexto] = useState("");

  const recargar = useCallback(async () => {
    const { data } = await supabase.rpc("consulta_mensajes", { p_slug: slug });
    setMsgs((data as { autor: string; texto: string; created_at: string }[]) ?? []);
  }, [slug]);

  // Refresca al abrir y cada 5s mientras está abierto.
  useEffect(() => {
    if (!abierto) return;
    recargar();
    const t = setInterval(recargar, 5000);
    return () => clearInterval(t);
  }, [abierto, recargar]);

  async function enviar() {
    const t = texto.trim();
    if (!t) return;
    setTexto("");
    setMsgs((prev) => [...prev, { autor: "inquilino", texto: t, created_at: new Date().toISOString() }]);
    const { error } = await supabase.rpc("consulta_enviar", { p_slug: slug, p_texto: t });
    if (!error) await recargar();
  }

  return (
    <Burbuja abierto={abierto} setAbierto={setAbierto} titulo="Consultá al dueño">
      <>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {msgs.length === 0 ? <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">¿Dudas? Escribile al dueño por acá.</p> :
            msgs.map((m, i) => <div key={i} className={`flex ${m.autor === "inquilino" ? "justify-end" : "justify-start"}`}><span className={burbuja(m.autor === "inquilino")}>{m.texto}</span></div>)}
        </div>
        <CampoMensaje value={texto} onChange={setTexto} onEnviar={enviar} />
      </>
    </Burbuja>
  );
}

// ---------- Widget del inquilino (chat por contrato, vía RPC) ----------
export function ChatWidgetInquilino({ contratos }: { contratos: { id: string; unidad: string }[] }) {
  const [abierto, setAbierto] = useState(false);
  const [sel, setSel] = useState<string | null>(contratos.length === 1 ? contratos[0].id : null);
  const [msgs, setMsgs] = useState<{ autor: string; texto: string; created_at: string }[]>([]);
  const [texto, setTexto] = useState("");

  const recargar = useCallback(async () => {
    if (!sel) { setMsgs([]); return; }
    const { data } = await supabase.rpc("portal_mensajes", { p_reserva: sel });
    setMsgs((data as { autor: string; texto: string; created_at: string }[]) ?? []);
  }, [sel]);

  useEffect(() => { if (abierto) recargar(); }, [abierto, recargar]);

  async function enviar() {
    const t = texto.trim();
    if (!sel || !t) return;
    setTexto("");
    const { error } = await supabase.rpc("portal_enviar_mensaje", { p_reserva: sel, p_texto: t });
    if (!error) await recargar();
  }

  if (contratos.length === 0) return null;
  const titulo = sel ? "Dueño" : "Mensajes";

  return (
    <Burbuja abierto={abierto} setAbierto={(v) => { setAbierto(v); if (!v && contratos.length > 1) setSel(null); }} titulo={titulo} onAtras={sel && contratos.length > 1 ? () => setSel(null) : undefined}>
      {!sel ? (
        <div className="flex-1 overflow-y-auto">
          {contratos.map((c) => (
            <button key={c.id} onClick={() => setSel(c.id)} className="w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/40 text-sm text-slate-700 dark:text-slate-200">
              {c.unidad}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {msgs.length === 0 ? <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">Escribile al dueño por acá.</p> :
              msgs.map((m, i) => <div key={i} className={`flex ${m.autor === "inquilino" ? "justify-end" : "justify-start"}`}><span className={burbuja(m.autor === "inquilino")}>{m.texto}</span></div>)}
          </div>
          <CampoMensaje value={texto} onChange={setTexto} onEnviar={enviar} />
        </>
      )}
    </Burbuja>
  );
}
