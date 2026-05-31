import { createClient } from "@supabase/supabase-js";

// Cliente de Supabase para el navegador.
// Las credenciales son públicas (publishable key) y se leen de .env.local.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_KEY;

if (!url || !key) {
  // Aviso útil en desarrollo si falta la config.
  console.warn("Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_KEY en .env.local");
}

// Fallback con formato válido para que el build (prerender) no se caiga si faltan
// las variables. En producción (Vercel) las variables están seteadas y se usan las reales.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder-anon-key"
);
