import type { Metadata } from "next";
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
  title: "Alquileres — Gestión de propiedades",
  description: "Gestión de alquileres temporales y estudiantiles con calendario unificado.",
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
