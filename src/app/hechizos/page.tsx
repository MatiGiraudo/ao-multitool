import type { Metadata } from "next";
import { ProveedorDeEfectos } from "@/fx/ui/ProveedorDeEfectos";
import { ProveedorDeGraficos } from "@/graficos/ui/ProveedorDeGraficos";
import { PantallaHechizos } from "./PantallaHechizos";

export const metadata: Metadata = { title: "Hechizos · AO World Editor" };

/* FX se monta acá porque los hechizos apuntan a un efecto, y FX dibuja con Gráficos. */
export default function Pagina() {
  return (
    <ProveedorDeGraficos>
      <ProveedorDeEfectos>
        <PantallaHechizos />
      </ProveedorDeEfectos>
    </ProveedorDeGraficos>
  );
}
