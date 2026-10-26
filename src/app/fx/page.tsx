import type { Metadata } from "next";
import { ProveedorDeEfectos } from "@/fx/ui/ProveedorDeEfectos";
import { EditorDeEfectos } from "@/fx/ui/EditorDeEfectos";
import { ProveedorDeGraficos } from "@/graficos/ui/ProveedorDeGraficos";

export const metadata: Metadata = { title: "FX · AO World Editor" };

/* Los efectos son animaciones corridas unos píxeles, así que necesitan a Gráficos. */
export default function Pagina() {
  return (
    <ProveedorDeGraficos>
      <ProveedorDeEfectos>
        <EditorDeEfectos />
      </ProveedorDeEfectos>
    </ProveedorDeGraficos>
  );
}
