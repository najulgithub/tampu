import type { SupabaseClient } from "@supabase/supabase-js";
import { parseICS } from "./ics";

type UnidadIcal = { id: string; owner_id: string; icals: { plataforma: string; url: string }[] | null };

// Baja los calendarios externos de una unidad y reemplaza sus bloqueos
// (por plataforma). Devuelve cuántos rangos quedaron cargados.
export async function sincronizarUnidad(admin: SupabaseClient, u: UnidadIcal): Promise<number> {
  const icals = u.icals ?? [];
  let total = 0;
  for (const ic of icals) {
    if (!ic?.url) continue;
    let texto = "";
    try {
      const res = await fetch(ic.url, { headers: { "User-Agent": "tampu-ical/1.0" }, cache: "no-store" });
      if (!res.ok) continue;
      texto = await res.text();
    } catch {
      continue;
    }
    const rangos = parseICS(texto);
    // Reemplazo total de los bloqueos de esta unidad+plataforma (refleja el estado actual).
    await admin.from("bloqueos").delete().eq("unidad_id", u.id).eq("plataforma", ic.plataforma);
    if (rangos.length) {
      await admin.from("bloqueos").insert(
        rangos.map((r) => ({ owner_id: u.owner_id, unidad_id: u.id, plataforma: ic.plataforma, desde: r.desde, hasta: r.hasta }))
      );
      total += rangos.length;
    }
  }
  return total;
}
