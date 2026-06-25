"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { hoyISO, formatearFecha, diaOcupado } from "@/lib/fechas";
import type { Reserva, Unidad, TipoUnidad, AmbienteGrupo } from "@/lib/types";
import { TIPOS_UNIDAD, COLORES_UNIDAD, AMBIENTES_GRUPO } from "@/lib/types";
import { Overlay, Campo } from "@/components/ui";
import SelectGrupo from "@/components/SelectGrupo";
import AvatarUnidad from "@/components/AvatarUnidad";
import AvatarGrupo from "@/components/AvatarGrupo";
import InputEntero from "@/components/InputEntero";
import { subirArchivo } from "@/lib/storage";

export default function Unidades() {
  const { unidades, reservas, grupos, addUnidad, getGrupo, vacio, seedCuenta, puedeEditar, esAdmin, t } = useStore();
  const [abrirAlta, setAbrirAlta] = useState(false);
  const puedeEdit = puedeEditar("unidades");
  const [editarGrupoId, setEditarGrupoId] = useState<string | null>(null);
  const hoy = hoyISO();

  // Agrupamos por grupoId. Las que no tienen grupo (o grupo inexistente) van a "".
  const porGrupo = new Map<string, Unidad[]>();
  for (const u of unidades) {
    const clave = getGrupo(u.grupoId) ? u.grupoId : "";
    if (!porGrupo.has(clave)) porGrupo.set(clave, []);
    porGrupo.get(clave)!.push(u);
  }
  // Orden: grupos por nombre, "Sin grupo" al final.
  const gruposOrdenados = [...porGrupo.entries()].sort((a, b) => {
    if (a[0] === "") return 1;
    if (b[0] === "") return -1;
    const na = getGrupo(a[0])?.nombre ?? "";
    const nb = getGrupo(b[0])?.nombre ?? "";
    return na.localeCompare(nb);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">{t("Mis unidades")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {unidades.length} {unidades.length === 1 ? t("unidad") : t("unidades")} ·{" "}
            {grupos.length} {grupos.length === 1 ? t("grupo") : t("grupos")} · {reservas.length} {t("reservas")}
          </p>
        </div>
        {puedeEdit && (
          <button
            onClick={() => setAbrirAlta(true)}
            className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition"
          >
            + {t("Agregar unidad")}
          </button>
        )}
      </div>

      {unidades.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-10 text-center text-slate-500 dark:text-slate-400">
          {t("Todavía no cargaste unidades. Empezá agregando una.")}
          {vacio && esAdmin && (
            <div className="mt-4">
              <button
                onClick={() => { if (confirm(t("Esto carga un set de datos de PRUEBA (unidades, reservas, pagos…) en tu cuenta. Es solo para explorar la app. ¿Continuar?"))) seedCuenta(); }}
                className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 underline"
              >
                {t("(admin) Cargar datos de ejemplo")}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {gruposOrdenados.map(([grupoId, items]) => (
            <section key={grupoId || "sin-grupo"}>
              <div className="flex items-center gap-2 mb-3">
                {getGrupo(grupoId) && <AvatarGrupo grupo={getGrupo(grupoId)!} size={28} />}
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  {getGrupo(grupoId)?.nombre ?? t("Sin grupo")}
                </h2>
                <span className="text-xs text-slate-400 dark:text-slate-500">· {items.length}</span>
                {grupoId && (
                  <button onClick={() => setEditarGrupoId(grupoId)} className="text-xs text-slate-400 dark:text-slate-500 hover:text-teal-600 dark:hover:text-teal-400">
                    {t("Editar")}
                  </button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((u) => (
                  <TarjetaUnidad
                    key={u.id}
                    id={u.id}
                    hoy={hoy}
                    reservas={reservas.filter((r) => r.unidadId === u.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {abrirAlta && (
        <ModalAltaUnidad
          onCerrar={() => setAbrirAlta(false)}
          onGuardar={(datos) => {
            addUnidad(datos);
            setAbrirAlta(false);
          }}
        />
      )}

      {editarGrupoId && <ModalEditarGrupo grupoId={editarGrupoId} onCerrar={() => setEditarGrupoId(null)} />}
    </div>
  );
}

function ModalEditarGrupo({ grupoId, onCerrar }: { grupoId: string; onCerrar: () => void }) {
  const { getGrupo, updateGrupo, deleteGrupo, t } = useStore();
  const grupo = getGrupo(grupoId);
  if (!grupo) return null;

  return (
    <Overlay titulo={t("Editar grupo")} onCerrar={onCerrar}>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <AvatarGrupo grupo={grupo} size={56} />
          <div className="flex gap-2">
            <label className="btn-secundario cursor-pointer">
              {grupo.foto ? t("Cambiar foto") : t("Subir foto")}
              <input
                type="file" accept="image/*" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) updateGrupo(grupo.id, { foto: await subirArchivo(file, "fotos") });
                  e.target.value = "";
                }}
              />
            </label>
            {grupo.foto && (
              <button onClick={() => updateGrupo(grupo.id, { foto: undefined })} className="btn-secundario">{t("Quitar")}</button>
            )}
          </div>
        </div>

        <Campo label={t("Nombre")}>
          <input className="input" value={grupo.nombre} onChange={(e) => updateGrupo(grupo.id, { nombre: e.target.value })} />
        </Campo>

        <div className="grid grid-cols-2 gap-4">
          <Campo label={t("Ambiente")}>
            <select className="input" value={grupo.ambiente} onChange={(e) => updateGrupo(grupo.id, { ambiente: e.target.value as AmbienteGrupo })}>
              {AMBIENTES_GRUPO.map((a) => (
                <option key={a} value={a}>{t(a)}</option>
              ))}
            </select>
          </Campo>
          <Campo label={t("Color")}>
            <div className="flex gap-2 flex-wrap pt-1">
              {COLORES_UNIDAD.map((c) => (
                <button
                  key={c} type="button"
                  onClick={() => updateGrupo(grupo.id, { color: c })}
                  className={`w-7 h-7 rounded-full ${grupo.color === c ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-800" : ""}`}
                  style={{ background: c }}
                  aria-label={`${t("Color")} ${c}`}
                />
              ))}
            </div>
          </Campo>
        </div>

        <div className="flex justify-between items-center pt-2">
          <button
            onClick={() => {
              if (confirm(`${t("¿Eliminar el grupo")} "${grupo.nombre}"? ${t("Las unidades quedarán sin grupo.")}`)) {
                deleteGrupo(grupo.id);
                onCerrar();
              }
            }}
            className="text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400"
          >
            {t("Eliminar grupo")}
          </button>
          <button onClick={onCerrar} className="btn-primario">{t("Listo")}</button>
        </div>
      </div>
    </Overlay>
  );
}

function TarjetaUnidad({
  id,
  reservas,
  hoy,
}: {
  id: string;
  reservas: Reserva[];
  hoy: string;
}) {
  const { getUnidad, t } = useStore();
  const uni = getUnidad(id)!;

  const ocupadaHoy = reservas.find((r) => diaOcupado(hoy, r.checkIn, r.checkOut));
  const proxima = reservas
    .filter((r) => r.checkIn >= hoy)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];

  return (
    <Link
      href={`/unidades/${id}`}
      className="block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-5 hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-sm transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <AvatarUnidad unidad={uni} size={44} />
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{uni.nombre}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
              {t(uni.tipoUnidad)} · {uni.localidad}
            </p>
          </div>
        </div>
        {ocupadaHoy ? (
          <span className="shrink-0 text-xs font-medium px-2 py-1 rounded-full bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400">
            {t("Ocupada")}
          </span>
        ) : (
          <span className="shrink-0 text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            {t("Libre")}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        {uni.tipoUnidad === "Cochera" ? (
          <>
            <span>🅿 {t("Cochera")}</span>
            {uni.ubicacionCochera && <span>· {uni.ubicacionCochera}</span>}
            {uni.aptoCamioneta && <span>· {t("apta camioneta")}</span>}
            <span>·</span>
            <span>{reservas.length} {t("reservas")}</span>
          </>
        ) : (
          <>
            <span>{uni.ambientes === 1 ? t("Monoambiente") : `${uni.ambientes} ${t("ambientes")}`}</span>
            <span>·</span>
            <span>{t("Hasta")} {uni.capacidad} {t("huéspedes")}</span>
            <span>·</span>
            <span>{reservas.length} {t("reservas")}</span>
            {uni.cochera && <span className="text-teal-600 dark:text-teal-400">· 🅿 {t("cochera")}{uni.aptoCamioneta ? ` (${t("camioneta")})` : ""}</span>}
          </>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-sm">
        {proxima ? (
          <span className="text-slate-600 dark:text-slate-300">
            {t("Próxima")}: <span className="font-medium">{proxima.huesped}</span> ·{" "}
            {formatearFecha(proxima.checkIn)}
          </span>
        ) : (
          <span className="text-slate-400 dark:text-slate-500">{t("Sin próximas reservas")}</span>
        )}
      </div>
    </Link>
  );
}

function ModalAltaUnidad({
  onCerrar,
  onGuardar,
}: {
  onCerrar: () => void;
  onGuardar: (datos: Omit<Unidad, "id">) => void;
}) {
  const { t } = useStore();
  const [nombre, setNombre] = useState("");
  const [grupoId, setGrupoId] = useState("");
  const [tipoUnidad, setTipoUnidad] = useState<TipoUnidad>("Departamento");
  const [color, setColor] = useState(COLORES_UNIDAD[0]);
  const [direccion, setDireccion] = useState("");
  const [localidad, setLocalidad] = useState("Mar del Plata");
  const [ambientes, setAmbientes] = useState(2);
  const [capacidad, setCapacidad] = useState(4);
  const [cochera, setCochera] = useState(false);
  const [aptoCamioneta, setAptoCamioneta] = useState(false);
  const [ubicacionCochera, setUbicacionCochera] = useState("");

  const esCochera = tipoUnidad === "Cochera";
  const valido = nombre.trim().length > 0;

  return (
    <Overlay onCerrar={onCerrar} titulo={t("Nueva unidad")}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!valido) return;
          onGuardar({
            nombre: nombre.trim(),
            grupoId,
            tipoUnidad,
            color,
            direccion: direccion.trim(),
            localidad: localidad.trim(),
            ambientes: esCochera ? 0 : ambientes,
            capacidad: esCochera ? 0 : capacidad,
            cochera: esCochera ? false : cochera,
            aptoCamioneta: (esCochera || cochera) ? aptoCamioneta : false,
            ubicacionCochera: (esCochera || cochera) ? (ubicacionCochera.trim() || undefined) : undefined,
            icals: [],
            notas: "",
          });
        }}
        className="space-y-4"
      >
        <Campo label={t("Nombre")}>
          <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={t("ej: Depto Güemes")} className="input" />
        </Campo>
        <Campo label={t("Grupo")}>
          <SelectGrupo value={grupoId} onChange={setGrupoId} />
        </Campo>
        <div className="grid grid-cols-2 gap-4">
          <Campo label={t("Tipo")}>
            <select value={tipoUnidad} onChange={(e) => setTipoUnidad(e.target.value as TipoUnidad)} className="input">
              {TIPOS_UNIDAD.map((tu) => (
                <option key={tu} value={tu}>{t(tu)}</option>
              ))}
            </select>
          </Campo>
          <Campo label={t("Color")}>
            <div className="flex gap-2 flex-wrap pt-1">
              {COLORES_UNIDAD.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-800" : ""}`}
                  style={{ background: c }}
                  aria-label={`${t("Color")} ${c}`}
                />
              ))}
            </div>
          </Campo>
        </div>
        <Campo label={t("Dirección")}>
          <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder={t("Calle y número")} className="input" />
        </Campo>
        <Campo label={t("Localidad")}>
          <input value={localidad} onChange={(e) => setLocalidad(e.target.value)} className="input" />
        </Campo>
        {!esCochera && (
          <div className="grid grid-cols-2 gap-4">
            <Campo label={t("Ambientes")}>
              <InputEntero value={ambientes} onChange={setAmbientes} min={1} />
            </Campo>
            <Campo label={t("Capacidad (huéspedes)")}>
              <InputEntero value={capacidad} onChange={setCapacidad} min={1} />
            </Campo>
          </div>
        )}
        {!esCochera && (
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={cochera} onChange={(e) => setCochera(e.target.checked)} />
            {t("Tiene cochera")}
          </label>
        )}
        {(esCochera || cochera) && (
          <>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={aptoCamioneta} onChange={(e) => setAptoCamioneta(e.target.checked)} />
              {t("Apta para camioneta / pickup")}
            </label>
            <Campo label={t("Ubicación de la cochera")}>
              <input value={ubicacionCochera} onChange={(e) => setUbicacionCochera(e.target.value)} className="input" placeholder={t("ej: Subsuelo 2, lugar 14")} />
            </Campo>
          </>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCerrar} className="btn-secundario">{t("Cancelar")}</button>
          <button type="submit" disabled={!valido} className="btn-primario">{t("Guardar")}</button>
        </div>
      </form>
    </Overlay>
  );
}
