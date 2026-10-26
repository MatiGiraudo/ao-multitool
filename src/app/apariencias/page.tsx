import type { Metadata } from "next";
import { EditorDeApariencias } from "@/apariencias/ui/EditorDeApariencias";
import { ProveedorDeApariencias } from "@/apariencias/ui/ProveedorDeApariencias";
import { ProveedorDeGraficos } from "@/graficos/ui/ProveedorDeGraficos";

export const metadata: Metadata = { title: "Apariencias · AO World Editor" };

/* Cuerpos y cabezas son animaciones vinculadas, así que necesitan a Gráficos. */
export default function Pagina() {
  return (
    <ProveedorDeGraficos>
      <ProveedorDeApariencias>
        <EditorDeApariencias />
      </ProveedorDeApariencias>
    </ProveedorDeGraficos>
  );
}
