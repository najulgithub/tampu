"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { useStore } from "@/lib/store";
import type { PlataformaICal, TipoUnidad, Unidad, Moneda } from "@/lib/types";
import { TIPOS_UNIDAD, COLORES_UNIDAD, MONEDAS } from "@/lib/types";
import { Campo } from "@/components/ui";
import SelectGrupo from "@/components/SelectGrupo";
import AvatarUnidad from "@/components/AvatarUnidad";
import InputEntero from "@/components/InputEntero";
import InputMonto from "@/components/InputMonto";
import { subirArchivo } from "@/lib/storage";

export default function ConfigUnidad() {
  const params = useParams<{ id: string }>();
  const { cargado, getUnidad, updateUnidad, deleteUnidad, t } = useStore();

  if (!cargado) return null;
  const uni = getUnidad(params.id);

  if (!uni) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 dark:text-slate-400 mb-4">{t("No se encontró esta unidad.")}</p>
        <Link href="/unidades" className="text-teal-600 hover:underline">← {t("Volver a unidades")}</Link>
      </div>
    );
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://tampu.ar";
  const urlExport = `${baseUrl}/ical/${uni.id}.ics`;

  return (
    <div className="max-w-2xl">
      <Link href={`/unidades/${uni.id}`} className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">
        ← {uni.nombre}
      </Link>
      <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100 mt-2 mb-6">{t("Configuración")}</h1>

      {/* Identificación */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-5 mb-5">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">{t("Identificación")}</h2>
        <div className="flex items-center gap-4 mb-4">
          <AvatarUnidad unidad={uni} size={64} />
          <div className="flex gap-2">
            <label className="btn-secundario cursor-pointer">
              {uni.foto ? t("Cambiar foto") : t("Subir foto")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) updateUnidad(uni.id, { foto: await subirArchivo(file, "fotos") });
                  e.target.value = "";
                }}
              />
            </label>
            {uni.foto && (
              <button onClick={() => updateUnidad(uni.id, { foto: undefined })} className="btn-secundario">
                {t("Quitar")}
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Campo label={t("Tipo")}>
            <select className="input" value={uni.tipoUnidad} onChange={(e) => updateUnidad(uni.id, { tipoUnidad: e.target.value as TipoUnidad })}>
              {TIPOS_UNIDAD.map((tipo) => (
                <option key={tipo} value={tipo}>{t(tipo)}</option>
              ))}
            </select>
          </Campo>
          <Campo label={t("Color")}>
            <div className="flex gap-2 flex-wrap pt-1">
              {COLORES_UNIDAD.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateUnidad(uni.id, { color: c })}
                  className={`w-7 h-7 rounded-full ${uni.color === c ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-800" : ""}`}
                  style={{ background: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </Campo>
        </div>
      </section>

      {/* Datos básicos */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-5 mb-5">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">{t("Datos de la unidad")}</h2>
        <div className="space-y-4">
          <Campo label={t("Nombre")}>
            <input className="input" value={uni.nombre} onChange={(e) => updateUnidad(uni.id, { nombre: e.target.value })} />
          </Campo>
          <Campo label={t("Grupo")}>
            <SelectGrupo value={uni.grupoId} onChange={(grupoId) => updateUnidad(uni.id, { grupoId })} />
          </Campo>
          <Campo label={t("Dirección")}>
            <input className="input" value={uni.direccion} onChange={(e) => updateUnidad(uni.id, { direccion: e.target.value })} />
          </Campo>
          <Campo label={t("Localidad")}>
            <input className="input" value={uni.localidad} onChange={(e) => updateUnidad(uni.id, { localidad: e.target.value })} />
          </Campo>
          {uni.tipoUnidad !== "Cochera" && (
            <div className="grid grid-cols-2 gap-4">
              <Campo label={t("Ambientes")}>
                <InputEntero value={uni.ambientes} onChange={(n) => updateUnidad(uni.id, { ambientes: n })} min={1} />
              </Campo>
              <Campo label={t("Capacidad")}>
                <InputEntero value={uni.capacidad} onChange={(n) => updateUnidad(uni.id, { capacidad: n })} min={1} />
              </Campo>
            </div>
          )}
          {uni.tipoUnidad !== "Cochera" && (
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={uni.cochera ?? false} onChange={(e) => updateUnidad(uni.id, { cochera: e.target.checked })} />
              {t("Tiene cochera")}
            </label>
          )}
          {(uni.tipoUnidad === "Cochera" || uni.cochera) && (
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={uni.aptoCamioneta ?? false} onChange={(e) => updateUnidad(uni.id, { aptoCamioneta: e.target.checked })} />
              {t("Apta para camioneta / pickup")}
            </label>
          )}

          {(uni.tipoUnidad === "Cochera" || uni.cochera) && (
            <Campo label={t("Ubicación de la cochera")}>
              <input className="input" value={uni.ubicacionCochera ?? ""} onChange={(e) => updateUnidad(uni.id, { ubicacionCochera: e.target.value })} placeholder={t("ej: Subsuelo 2, lugar 14")} />
            </Campo>
          )}

          <Campo label={t("Moneda")}>
            <select className="input max-w-[200px]" value={uni.moneda ?? ""} onChange={(e) => updateUnidad(uni.id, { moneda: (e.target.value || undefined) as Moneda | undefined })}>
              <option value="">{t("Según configuración del negocio")}</option>
              {MONEDAS.map((m) => <option key={m.valor} value={m.valor}>{m.label}</option>)}
            </select>
          </Campo>

          {/* Tarifa por día para alquiler temporal (opcional: si la ponés, la reserva calcula el total sola). */}
          <TarifasDia uni={uni} set={(c) => updateUnidad(uni.id, c)} />

          <Campo label={t("Notas")}>
            <textarea className="input min-h-20" value={uni.notas} onChange={(e) => updateUnidad(uni.id, { notas: e.target.value })} />
          </Campo>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">{t("Los cambios se guardan automáticamente.")}</p>
      </section>

      {/* Sincronización iCal */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-5 mb-5">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{t("Sincronización de calendarios (iCal)")}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {t("Pegá los links iCal de tus plataformas para importar sus reservas. Y copiá el link de exportación de tampu en cada plataforma para que vean tu calendario.")}
        </p>

        <ListaICals
          icals={uni.icals}
          onCambiar={(icals) => updateUnidad(uni.id, { icals })}
        />

        {uni.icals.length > 0 && <SyncIcal unidadId={uni.id} />}

        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            {t("Tu link de exportación (pegalo en Airbnb / Booking)")}
          </span>
          <div className="flex gap-2">
            <input readOnly value={urlExport} className="input bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400" />
            <button
              onClick={() => navigator.clipboard?.writeText(urlExport)}
              className="btn-secundario whitespace-nowrap"
            >
              {t("Copiar")}
            </button>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            {t("Pegá este link en Airbnb/Booking (Importar calendario) para que bloqueen las fechas reservadas en tampu. Se actualiza solo.")}
          </p>
        </div>
      </section>

      {/* Guía del huésped */}
      <GuiaHuesped uni={uni} set={(c) => updateUnidad(uni.id, c)} />

      {/* Zona peligrosa */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-rose-200 dark:border-rose-500/40 shadow-sm p-5">
        <h2 className="font-semibold text-rose-700 dark:text-rose-400 mb-1">{t("Eliminar unidad")}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          {t("Se borrarán también todas sus reservas. Esta acción no se puede deshacer.")}
        </p>
        <button
          onClick={() => {
            if (confirm(`${t("¿Eliminar")} "${uni.nombre}" ${t("y todas sus reservas?")}`)) {
              deleteUnidad(uni.id);
              window.location.href = "/unidades";
            }
          }}
          className="rounded-lg border border-rose-300 dark:border-rose-500/50 text-rose-700 dark:text-rose-400 px-4 py-2 text-sm font-medium hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
        >
          {t("Eliminar unidad")}
        </button>
      </section>
    </div>
  );
}

// Guía del huésped: datos que ve quien escanea el QR de la unidad.
function GuiaHuesped({ uni, set }: { uni: Unidad; set: (c: Partial<Unidad>) => void }) {
  const { t } = useStore();
  const [qr, setQr] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [puntoNombre, setPuntoNombre] = useState("");
  const [puntoUrl, setPuntoUrl] = useState("");
  const origin = typeof window !== "undefined" ? window.location.origin : "https://tampu.ar";
  const link = `${origin}/u/${uni.id}`;
  const puntos = uni.puntosInteres ?? [];

  useEffect(() => {
    QRCode.toDataURL(link, { width: 512, margin: 2, color: { dark: "#0f172a", light: "#ffffff" } }).then(setQr).catch(() => setQr(""));
  }, [link]);

  function agregarPunto() {
    if (!puntoNombre.trim() || !puntoUrl.trim()) return;
    set({ puntosInteres: [...puntos, { nombre: puntoNombre.trim(), url: puntoUrl.trim() }] });
    setPuntoNombre(""); setPuntoUrl("");
  }

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-5 mb-5">
      <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{t("Guía del huésped (QR)")}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        {t("Datos que ve el huésped al escanear el QR de la unidad: WiFi, encargado, instrucciones y lugares de interés.")}
      </p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Campo label={t("WiFi - Red")}><input className="input" value={uni.wifiNombre ?? ""} onChange={(e) => set({ wifiNombre: e.target.value })} /></Campo>
          <Campo label={t("WiFi - Clave")}><input className="input" value={uni.wifiClave ?? ""} onChange={(e) => set({ wifiClave: e.target.value })} /></Campo>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Campo label={t("Encargado - Nombre")}><input className="input" value={uni.encargadoNombre ?? ""} onChange={(e) => set({ encargadoNombre: e.target.value })} /></Campo>
          <Campo label={t("Encargado - Teléfono")}><input className="input" value={uni.encargadoTel ?? ""} onChange={(e) => set({ encargadoTel: e.target.value })} placeholder="+54 9 223…" /></Campo>
        </div>
        <Campo label={t("Instrucciones / normas")}>
          <textarea className="input min-h-24" value={uni.instrucciones ?? ""} onChange={(e) => set({ instrucciones: e.target.value })} placeholder={t("Cómo ingresar, normas de la casa, cómo usar el aire, etc.")} />
        </Campo>

        <div>
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{t("Lugares de interés")}</span>
          <div className="space-y-2 mb-2">
            {puntos.map((p, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2">
                <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 truncate">{p.nombre}</span>
                <a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-teal-600 dark:text-teal-400 truncate max-w-[120px]">{t("link")}</a>
                <button onClick={() => set({ puntosInteres: puntos.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-rose-600 text-sm">{t("Quitar")}</button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className="input" value={puntoNombre} onChange={(e) => setPuntoNombre(e.target.value)} placeholder={t("Nombre (ej: Playa Varese)")} />
            <div className="flex gap-2">
              <input className="input flex-1" value={puntoUrl} onChange={(e) => setPuntoUrl(e.target.value)} placeholder={t("Link de Google Maps")} />
              <button type="button" onClick={agregarPunto} className="btn-secundario whitespace-nowrap">+</button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
        <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t("Link / QR de la guía (pegalo o imprimilo para el huésped)")}</span>
        <div className="flex gap-2">
          <input readOnly value={link} className="input bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400" />
          <button onClick={() => { navigator.clipboard?.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }} className="btn-secundario whitespace-nowrap">{copiado ? t("¡Copiado!") : t("Copiar")}</button>
        </div>
        {qr && (
          <div className="mt-3 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={t("QR guía")} className="w-28 h-28 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700" />
            <a href={qr} download={`guia-${uni.id}.png`} className="text-sm text-teal-600 dark:text-teal-400 hover:underline">{t("Descargar QR")}</a>
          </div>
        )}
      </div>
    </section>
  );
}

// Tarifas por día para temporal. Si la unidad tiene cochera, permite dos valores
// (sin/con cochera) o uno solo con el check "Mismo valor".
function TarifasDia({ uni, set }: { uni: Unidad; set: (c: Partial<Unidad>) => void }) {
  const { t } = useStore();
  const [mismo, setMismo] = useState(uni.precioDiaCochera == null || uni.precioDiaCochera === uni.precioDia);

  function setSin(n: number) {
    const v = n || undefined;
    set(mismo ? { precioDia: v, precioDiaCochera: v } : { precioDia: v });
  }
  function toggleMismo(c: boolean) {
    setMismo(c);
    if (c) set({ precioDiaCochera: uni.precioDia });
  }

  if (!uni.cochera) {
    return (
      <Campo label={t("Valor por día (temporal)")}>
        <InputMonto value={uni.precioDia ?? 0} onChange={(n) => set({ precioDia: n || undefined })} decimales={uni.moneda === "USD"} />
      </Campo>
    );
  }

  return (
    <div className="space-y-3">
      <div className={mismo ? "" : "grid grid-cols-2 gap-4"}>
        <Campo label={mismo ? t("Valor por día (temporal)") : t("Valor por día (sin cochera)")}>
          <InputMonto value={uni.precioDia ?? 0} onChange={setSin} decimales={uni.moneda === "USD"} />
        </Campo>
        {!mismo && (
          <Campo label={t("Valor por día (con cochera)")}>
            <InputMonto value={uni.precioDiaCochera ?? 0} onChange={(n) => set({ precioDiaCochera: n || undefined })} decimales={uni.moneda === "USD"} />
          </Campo>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input type="checkbox" checked={mismo} onChange={(e) => toggleMismo(e.target.checked)} />
        {t("Mismo valor con cochera")}
      </label>
    </div>
  );
}

// Botón para traer ahora las reservas de las plataformas externas (Airbnb/Booking).
function SyncIcal({ unidadId }: { unidadId: string }) {
  const { sincronizarIcal, bloqueosDe, t } = useStore();
  const [estado, setEstado] = useState<"idle" | "sync" | "ok" | "err">("idle");
  const cantidad = bloqueosDe(unidadId).length;

  async function sync() {
    setEstado("sync");
    try {
      const r = await sincronizarIcal();
      setEstado(r?.ok ? "ok" : "err");
    } catch {
      setEstado("err");
    }
  }

  return (
    <div className="mt-3 flex items-center gap-3 flex-wrap">
      <button onClick={sync} disabled={estado === "sync"} className="btn-secundario disabled:opacity-50">
        {estado === "sync" ? t("Sincronizando…") : t("Sincronizar ahora")}
      </button>
      <span className="text-xs text-slate-400 dark:text-slate-500">
        {estado === "ok" ? t("Calendarios actualizados. ") : estado === "err" ? t("No se pudo sincronizar. ") : ""}
        {cantidad > 0 && `${cantidad} ${cantidad === 1 ? t("fecha bloqueada") : t("fechas bloqueadas")} ${t("importadas.")}`}
      </span>
    </div>
  );
}

function ListaICals({
  icals,
  onCambiar,
}: {
  icals: PlataformaICal[];
  onCambiar: (icals: PlataformaICal[]) => void;
}) {
  const { t } = useStore();
  const [plataforma, setPlataforma] = useState("Airbnb");
  const [url, setUrl] = useState("");

  function agregar() {
    if (!url.trim()) return;
    onCambiar([...icals, { plataforma, url: url.trim() }]);
    setUrl("");
  }

  return (
    <div>
      <div className="space-y-2 mb-3">
        {icals.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500">{t("Todavía no conectaste ninguna plataforma.")}</p>
        )}
        {icals.map((ical, i) => (
          <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 w-20 shrink-0">{ical.plataforma}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate flex-1">{ical.url}</span>
            <button
              onClick={() => onCambiar(icals.filter((_, j) => j !== i))}
              className="text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 text-sm"
            >
              {t("Quitar")}
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <select value={plataforma} onChange={(e) => setPlataforma(e.target.value)} className="input w-32">
          <option>Airbnb</option>
          <option>Booking</option>
          <option>Vrbo</option>
          <option>Expedia</option>
          <option>Otra</option>
        </select>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…/calendar.ics"
          className="input flex-1"
          onKeyDown={(e) => e.key === "Enter" && agregar()}
        />
        <button onClick={agregar} className="btn-primario whitespace-nowrap">{t("Conectar")}</button>
      </div>
    </div>
  );
}
