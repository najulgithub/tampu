"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Overlay } from "@/components/ui";

export default function Mensajes() {
  const { mensajes, reservas, getUnidad, mensajesDe, enviarMensaje, marcarLeidos, t } = useStore();
  const [abierta, setAbierta] = useState<string | null>(null);

  // Conversaciones = una por reserva con mensajes, ordenadas por el último mensaje.
  const ids = Array.from(new Set(mensajes.map((m) => m.reservaId)));
  const convos = ids
    .map((rid) => {
      const ms = mensajes.filter((m) => m.reservaId === rid).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const ultimo = ms[ms.length - 1];
      const noLeidos = ms.filter((m) => m.autor === "inquilino" && !m.leidoDueno).length;
      const r = reservas.find((x) => x.id === rid);
      return { rid, ultimo, noLeidos, huesped: r?.huesped ?? t("Inquilino"), unidad: r ? (getUnidad(r.unidadId)?.nombre ?? "—") : "—" };
    })
    .sort((a, b) => (b.ultimo?.createdAt ?? "").localeCompare(a.ultimo?.createdAt ?? ""));

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">{t("Mensajes")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("Conversaciones con tus inquilinos.")}</p>
      </div>

      {convos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-10 text-center text-slate-500 dark:text-slate-400">
          {t("Todavía no hay mensajes. Cuando un inquilino te escriba desde su portal, lo vas a ver acá.")}
        </div>
      ) : (
        <div className="space-y-2">
          {convos.map((c) => (
            <button
              key={c.rid}
              onClick={() => { setAbierta(c.rid); marcarLeidos(c.rid); }}
              className="w-full text-left flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-3 hover:border-teal-400 dark:hover:border-teal-500 transition"
            >
              <span className="shrink-0 w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 grid place-items-center text-sm font-semibold text-slate-600 dark:text-slate-200 uppercase">{c.huesped.trim().charAt(0) || "?"}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{c.huesped}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 truncate">· {c.unidad}</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {c.ultimo ? `${c.ultimo.autor === "dueno" ? t("Vos:") + " " : ""}${c.ultimo.texto}` : ""}
                </div>
              </div>
              {c.noLeidos > 0 && (
                <span className="shrink-0 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-rose-500 text-white text-[10px] font-bold">{c.noLeidos}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {abierta && (
        <HiloChat
          reservaId={abierta}
          titulo={convos.find((c) => c.rid === abierta)?.huesped ?? t("Inquilino")}
          mensajesDe={mensajesDe}
          enviarMensaje={enviarMensaje}
          onCerrar={() => setAbierta(null)}
        />
      )}
    </div>
  );
}

function HiloChat({
  reservaId,
  titulo,
  mensajesDe,
  enviarMensaje,
  onCerrar,
}: {
  reservaId: string;
  titulo: string;
  mensajesDe: (id: string) => { id: string; autor: string; texto: string }[];
  enviarMensaje: (id: string, texto: string) => void;
  onCerrar: () => void;
}) {
  const { t } = useStore();
  const [texto, setTexto] = useState("");
  const msgs = mensajesDe(reservaId);

  function enviar() {
    const txt = texto.trim();
    if (!txt) return;
    enviarMensaje(reservaId, txt);
    setTexto("");
  }

  return (
    <Overlay titulo={titulo} onCerrar={onCerrar}>
      <div className="space-y-1.5 max-h-[55vh] overflow-y-auto mb-3">
        {msgs.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">{t("Sin mensajes.")}</p>
        ) : msgs.map((m) => (
          <div key={m.id} className={`flex ${m.autor === "dueno" ? "justify-end" : "justify-start"}`}>
            <span className={`text-sm px-3 py-1.5 rounded-2xl max-w-[80%] ${m.autor === "dueno" ? "bg-teal-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"}`}>{m.texto}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); enviar(); } }} className="input flex-1" placeholder={t("Escribir respuesta…")} autoFocus />
        <button type="button" onClick={enviar} disabled={!texto.trim()} className="btn-primario disabled:opacity-50">{t("Enviar")}</button>
      </div>
    </Overlay>
  );
}
