import type { MetadataRoute } from "next";

// Manifest PWA: hace que tampu sea instalable en el celular con su ícono
// y abra en pantalla completa (sin la barra del navegador).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "tampu — gestión de alquileres",
    short_name: "tampu",
    description: "Gestión de alquileres temporarios y de largo plazo.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#1f6f6b",
    lang: "es-AR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
