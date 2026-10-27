import type { Metadata } from "next";
import { PantallaMapas } from "@/mapas/ui/PantallaMapas";

export const metadata: Metadata = { title: "Mapas · AO World Editor" };

/* No monta proveedores: lee los archivos que elegís y dibuja; las hojas las pide por URL. */
export default function Pagina() {
  return <PantallaMapas />;
}
