import type { Metadata } from "next";
import { PantallaImportacion } from "@/importacion/ui/PantallaImportacion";

export const metadata: Metadata = { title: "Importar · AO World Editor" };

/* No monta proveedores: trabaja con los casos de uso directamente y no muestra listas. */
export default function Pagina() {
  return <PantallaImportacion />;
}
