import type { Metadata } from "next";
import { ProveedorDeApariencias } from "@/apariencias/ui/ProveedorDeApariencias";
import { ProveedorDeEfectos } from "@/fx/ui/ProveedorDeEfectos";
import { ProveedorDeGraficos } from "@/graficos/ui/ProveedorDeGraficos";
import { ProveedorDeHechizos } from "@/hechizos/ui/ProveedorDeHechizos";
import { ProveedorDeObjetos } from "@/objetos/ui/ProveedorDeObjetos";
import { PantallaNpcs } from "./PantallaNpcs";

export const metadata: Metadata = { title: "NPCs · AO World Editor" };

/*
 * Es la pantalla que más módulos junta: el NPC apunta a un cuerpo, a una cabeza, a los objetos que
 * suelta o vende y a los hechizos que lanza. Todos se montan acá, y Gráficos debajo de todos
 * porque es con lo que se dibuja.
 */
export default function Pagina() {
  return (
    <ProveedorDeGraficos>
      <ProveedorDeApariencias>
        <ProveedorDeObjetos>
          <ProveedorDeEfectos>
            <ProveedorDeHechizos>
              <PantallaNpcs />
            </ProveedorDeHechizos>
          </ProveedorDeEfectos>
        </ProveedorDeObjetos>
      </ProveedorDeApariencias>
    </ProveedorDeGraficos>
  );
}
