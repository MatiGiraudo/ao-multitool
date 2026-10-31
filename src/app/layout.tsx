import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ProveedorDeAplicacion } from "@/compartido/ui/Aplicacion";
import { PuertaDeCarpeta } from "@/compartido/ui/PuertaDeCarpeta";
import { Analitica } from "./_componentes/Analitica";
import { Encabezado } from "./_componentes/Encabezado";
import "./globals.css";

export const metadata: Metadata = {
  title: "AO World Editor",
  description: "Editor para el contenido de Argentum Online: gráficos, objetos, personajes, hechizos y mapas.",
};

/*
 * La carpeta app/ es sólo la "capa de entrega" de Next: rutas, layout y API.
 * Toda la lógica vive en los módulos (graficos/, objetos/, proyecto/) que están al lado.
 *
 * Acá va únicamente lo que necesita TODA la app: el contenedor de casos de uso, los avisos y
 * la medición de uso del sitio publicado.
 * Los proveedores de cada módulo los monta su propia página, así una pestaña no carga los datos
 * de las otras (con siete herramientas eso se nota).
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500;600&family=Chivo:wght@400;600&family=JetBrains+Mono:wght@400;600&display=swap"
        />
      </head>
      <body>
        <ProveedorDeAplicacion>
          <Encabezado />
          {/* En el modo carpeta, las pantallas no se montan hasta que haya una carpeta elegida. */}
          <PuertaDeCarpeta>{children}</PuertaDeCarpeta>
        </ProveedorDeAplicacion>
        {/* No es parte de la app: sólo se monta en el sitio publicado. Ver Analitica.tsx. */}
        <Analitica />
      </body>
    </html>
  );
}
