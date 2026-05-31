import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite acceder al dev server desde otros dispositivos de la red local
  // (ej: el celular en la misma Wi-Fi). Sin esto, Next 16 bloquea los
  // recursos de desarrollo cross-origin y la app queda en "Cargando…".
  allowedDevOrigins: ["192.168.100.8", "192.168.100.*", "192.168.*.*"],
};

export default nextConfig;
