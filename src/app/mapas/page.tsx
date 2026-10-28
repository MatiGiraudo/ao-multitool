import type { Metadata } from "next";
import { ProveedorDeGraficos } from "@/graficos/ui/ProveedorDeGraficos";
import { PantallaMapas } from "@/mapas/ui/PantallaMapas";

export const metadata: Metadata = { title: "Mapas · AO World Editor" };

/* Gráficos se monta para el catálogo de tiles: elegir con qué pintar es elegir una celda de una
 * hoja del proyecto. Las imágenes del mapa, en cambio, siguen pidiéndose por URL. */
export default function Pagina() {
  return (
    <ProveedorDeGraficos>
      <PantallaMapas />
    </ProveedorDeGraficos>
  );
}
