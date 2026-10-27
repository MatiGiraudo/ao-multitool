import type { Metadata } from "next";
import { PantallaExportacion } from "@/proyecto/ui/PantallaExportacion";

export const metadata: Metadata = { title: "Exportar · AO World Editor" };

/* No monta proveedores: arma los archivos con los casos de uso y no muestra listas de nadie. */
export default function Pagina() {
  return <PantallaExportacion />;
}
