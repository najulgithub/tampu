import { redirect } from "next/navigation";

// Dirección "marca propia" del dueño: tampu.ar/p/<slug>.
// Reusa el flujo del portal de clientes (?r=slug).
export default async function PortalPorSlug({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/?r=${encodeURIComponent(slug)}`);
}
