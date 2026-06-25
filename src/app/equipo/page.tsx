"use client";

import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/lib/store";
import { ROLES, MODULOS_PERMISO, permisosDeRol } from "@/lib/types";
import type { Colaborador, Rol } from "@/lib/types";
import { Overlay, Campo } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import QRCode from "qrcode";

const COLOR_ROL: Record<Rol, string> = {
  Propietario: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  Administrador: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  Encargado: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  Lectura: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export default function Equipo() {
  const { colaboradores, grupos, puedeEditar, t } = useStore();
  const puedeEdit = puedeEditar("equipo");
  const [abrir, setAbrir] = useState(false);
  const [editando, setEditando] = useState<Colaborador | undefined>();

  const alcanceTexto = (col: Colaborador) =>
    col.gruposIds.length === 0
      ? t("Todas las unidades")
      : col.gruposIds.map((id) => grupos.find((g) => g.id === id)?.nombre ?? "?").join(", ");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">{t("Equipo")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {colaboradores.length} {colaboradores.length === 1 ? t("colaborador") : t("colaboradores")}
          </p>
        </div>
        {puedeEdit && (
          <button onClick={() => setAbrir(true)} className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition">
            + {t("Invitar colaborador")}
          </button>
        )}
      </div>

      {puedeEdit && <LinkClientes />}

      <div className="space-y-2">
        {colaboradores.map((c) => (
          <button
            key={c.id}
            onClick={() => puedeEdit && setEditando(c)}
            className={`w-full text-left flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-3 transition ${puedeEdit ? "hover:border-teal-400 dark:hover:border-teal-500" : "cursor-default"}`}
          >
            <span className="shrink-0 w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 grid place-items-center text-sm font-medium text-slate-600 dark:text-slate-200 uppercase">
              {c.nombre.trim().charAt(0) || "?"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{c.nombre}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{c.email} · {alcanceTexto(c)}</div>
            </div>
            <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${COLOR_ROL[c.rol]}`}>{t(c.rol)}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mt-6">
        {t("Prototipo: la invitación por email, el login de cada colaborador y el control real de permisos se activan al conectar el backend (Supabase Auth).")}
      </p>

      {abrir && <FormColaborador onCerrar={() => setAbrir(false)} />}
      {editando && <FormColaborador colaborador={editando} onCerrar={() => setEditando(undefined)} />}
    </div>
  );
}

// Tarjeta con el link público para que los clientes se registren y reserven.
function LinkClientes() {
  const { t } = useStore();
  const [slug, setSlug] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [borrador, setBorrador] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [qr, setQr] = useState("");
  const [verQr, setVerQr] = useState(false);
  const [editandoSlug, setEditandoSlug] = useState(false);
  const [borradorSlug, setBorradorSlug] = useState("");
  const [errorSlug, setErrorSlug] = useState("");

  const cargar = useCallback(async () => {
    const { data } = await supabase.rpc("mi_negocio");
    const fila = Array.isArray(data) ? data[0] : null;
    if (fila?.slug) { setSlug(fila.slug); setNombre(fila.nombre ?? ""); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Genera el QR del link (localmente, sin servicios externos).
  useEffect(() => {
    if (!slug) return;
    const url = `${window.location.origin}/p/${slug}`;
    QRCode.toDataURL(url, { width: 512, margin: 2, color: { dark: "#0f172a", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [slug]);

  if (!slug) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://tampu.ar";
  const link = `${origin}/p/${slug}`;
  const linkCorto = link.replace(/^https?:\/\//, "");

  async function guardarSlug() {
    const v = borradorSlug.trim();
    setErrorSlug("");
    if (!v || v === slug) { setEditandoSlug(false); return; }
    const { data, error } = await supabase.rpc("cambiar_slug", { p_slug: v });
    if (error) { setErrorSlug(error.message); return; }
    if (typeof data === "string") setSlug(data);
    setEditandoSlug(false);
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {}
  }

  async function guardarNombre() {
    const n = borrador.trim();
    setEditandoNombre(false);
    if (!n || n === nombre) return;
    setNombre(n);
    await supabase.rpc("renombrar_negocio", { p_nombre: n });
  }

  return (
    <div className="mb-6 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-500/10 dark:to-emerald-500/10 rounded-2xl border border-teal-200/70 dark:border-teal-500/20 p-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="font-display text-base font-semibold text-slate-800 dark:text-slate-100">{t("Link para clientes")}</h2>
        {editandoNombre ? (
          <input
            autoFocus value={borrador} onChange={(e) => setBorrador(e.target.value)}
            onBlur={guardarNombre}
            onKeyDown={(e) => { if (e.key === "Enter") guardarNombre(); if (e.key === "Escape") setEditandoNombre(false); }}
            className="input max-w-[180px] py-1 text-sm" placeholder={t("Nombre del negocio")}
          />
        ) : (
          <button
            onClick={() => { setBorrador(nombre); setEditandoNombre(true); }}
            className="text-xs text-teal-700 dark:text-teal-400 hover:underline"
          >
            {nombre || t("Poner nombre")} · {t("editar")}
          </button>
        )}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
        {t("Compartí este link. Quien se registre desde acá entra como cliente y solo puede reservar tus unidades y subir la seña.")}
      </p>

      {/* Dirección personalizable */}
      <div className="mb-3">
        {editandoSlug ? (
          <div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-slate-400 dark:text-slate-500">{origin.replace(/^https?:\/\//, "")}/p/</span>
              <input
                autoFocus value={borradorSlug}
                onChange={(e) => setBorradorSlug(e.target.value)}
                onBlur={guardarSlug}
                onKeyDown={(e) => { if (e.key === "Enter") guardarSlug(); if (e.key === "Escape") setEditandoSlug(false); }}
                className="input py-1 text-sm flex-1" placeholder={t("estadiaspepe")}
              />
            </div>
            {errorSlug && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errorSlug}</p>}
          </div>
        ) : (
          <button
            onClick={() => { setBorradorSlug(slug ?? ""); setErrorSlug(""); setEditandoSlug(true); }}
            className="text-xs text-teal-700 dark:text-teal-400 hover:underline"
          >
            {t("Dirección:")} <b>{linkCorto}</b> · {t("personalizar")}
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="input flex-1 text-sm" />
        <button onClick={copiar} className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition whitespace-nowrap">
          {copiado ? t("¡Copiado!") : t("Copiar")}
        </button>
        {qr && (
          <button
            onClick={() => setVerQr(true)}
            className="rounded-lg border border-teal-300 dark:border-teal-500/40 text-teal-700 dark:text-teal-400 px-3 py-2 text-sm font-medium hover:bg-teal-100/60 dark:hover:bg-teal-500/10 transition whitespace-nowrap"
            title={t("Ver código QR")}
          >
            QR
          </button>
        )}
      </div>

      {verQr && qr && (
        <Overlay titulo={t("Código QR para clientes")} onCerrar={() => setVerQr(false)}>
          <div className="flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={t("Código QR")} className="w-56 h-56 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700" />
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
              {nombre || t("Tu negocio")} · {t("escaneá para reservar")}
            </p>
            <a
              href={qr}
              download={`qr-${slug}.png`}
              className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition"
            >
              {t("Descargar QR")}
            </a>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function FormColaborador({ colaborador, onCerrar }: { colaborador?: Colaborador; onCerrar: () => void }) {
  const { grupos, addColaborador, updateColaborador, deleteColaborador, t } = useStore();
  const esEdicion = Boolean(colaborador);

  const [nombre, setNombre] = useState(colaborador?.nombre ?? "");
  const [email, setEmail] = useState(colaborador?.email ?? "");
  const [rol, setRol] = useState<Rol>(colaborador?.rol ?? "Encargado");
  const [todos, setTodos] = useState((colaborador?.gruposIds.length ?? 0) === 0);
  const [gruposIds, setGruposIds] = useState<string[]>(colaborador?.gruposIds ?? []);
  const [permisos, setPermisos] = useState<string[]>(colaborador?.permisos ?? permisosDeRol(colaborador?.rol ?? "Encargado"));

  const valido = nombre.trim().length > 0;
  const descRol = ROLES.find((r) => r.valor === rol)?.desc;

  function toggleGrupo(id: string) {
    setGruposIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }
  function togglePermiso(clave: string) {
    setPermisos((prev) => (prev.includes(clave) ? prev.filter((p) => p !== clave) : [...prev, clave]));
  }
  function cambiarRol(nuevo: Rol) {
    setRol(nuevo);
    setPermisos(permisosDeRol(nuevo)); // el rol propone permisos; después se ajustan
  }

  function guardar() {
    if (!valido) return;
    const datos = { nombre: nombre.trim(), email: email.trim(), rol, gruposIds: todos ? [] : gruposIds, permisos };
    if (esEdicion && colaborador) updateColaborador(colaborador.id, datos);
    else addColaborador(datos);
    onCerrar();
  }

  return (
    <Overlay titulo={esEdicion ? t("Editar colaborador") : t("Invitar colaborador")} onCerrar={onCerrar}>
      <form onSubmit={(e) => { e.preventDefault(); guardar(); }} className="space-y-4">
        <Campo label={t("Nombre")}>
          <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} className="input" placeholder={t("Nombre y apellido")} />
        </Campo>
        <Campo label={t("Email")}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="email@ejemplo.com" />
        </Campo>
        <Campo label={t("Rol (preset de permisos)")}>
          <select value={rol} onChange={(e) => cambiarRol(e.target.value as Rol)} className="input">
            {ROLES.map((r) => (<option key={r.valor} value={r.valor}>{t(r.label)}</option>))}
          </select>
          {descRol && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t(descRol)}</p>}
        </Campo>

        <Campo label={t("¿Qué puede gestionar?")}>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">{t("Ve todo el negocio. Tildá lo que puede crear/editar.")}</p>
          <div className="space-y-1.5">
            {MODULOS_PERMISO.map((m) => (
              <label key={m.clave} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" className="mt-0.5" checked={permisos.includes(m.clave)} onChange={() => togglePermiso(m.clave)} />
                <span>
                  {t(m.label)}
                  <span className="block text-xs text-slate-400 dark:text-slate-500">{t(m.desc)}</span>
                </span>
              </label>
            ))}
          </div>
        </Campo>

        <Campo label={t("Acceso")}>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mb-2">
            <input type="checkbox" checked={todos} onChange={(e) => setTodos(e.target.checked)} />
            {t("Todas las unidades")}
          </label>
          {!todos && (
            <div className="space-y-1 pl-1">
              {grupos.map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={gruposIds.includes(g.id)} onChange={() => toggleGrupo(g.id)} />
                  {g.nombre}
                </label>
              ))}
            </div>
          )}
        </Campo>

        <div className="flex justify-between items-center pt-2">
          {esEdicion ? (
            <button type="button" onClick={() => { if (colaborador && confirm(t("¿Quitar a este colaborador?"))) { deleteColaborador(colaborador.id); onCerrar(); } }} className="text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400">
              {t("Quitar")}
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onCerrar} className="btn-secundario">{t("Cancelar")}</button>
            <button type="submit" disabled={!valido} className="btn-primario">{t("Guardar")}</button>
          </div>
        </div>
      </form>
    </Overlay>
  );
}
