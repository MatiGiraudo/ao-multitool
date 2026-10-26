import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ProveedorDeAplicacion } from "@/compartido/ui/Aplicacion";
import { Encabezado } from "./_componentes/Encabezado";
import "./globals.css";

export const metadata: Metadata = {
  title: "AO World Editor",
  description: "Editor de mundo para el remake de Argentum Online: hojas de sprites, animaciones y objetos.",
};

/*
 * La carpeta app/ es sólo la "capa de entrega" de Next: rutas, layout y API.
 * Toda la lógica vive en los módulos (graficos/, objetos/, proyecto/) que están al lado.
 *
 * Acá va únicamente lo que necesita TODA la app: el contenedor de casos de uso y los avisos.
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
          {children}
        </ProveedorDeAplicacion>
      </body>
    </html>
  );
}
