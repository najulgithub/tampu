import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import Shell from "@/components/Shell";

// Tipografía con carácter (no genérica): serif editorial + sans geométrica.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});
const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "tampu — gestión de alquileres",
  description: "Gestioná tus propiedades todo el año: temporal y largo plazo, con portal para inquilinos.",
  applicationName: "tampu",
  appleWebApp: { capable: true, title: "tampu", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
};

// El color de la barra del sistema cuando la app está instalada (claro/oscuro).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1f6f6b" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`h-full antialiased ${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        {/* Aplica el tema guardado antes del primer paint para evitar parpadeo. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('alquileres.tema');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full">
        <StoreProvider>
          <Shell>{children}</Shell>
        </StoreProvider>
      </body>
    </html>
  );
}
