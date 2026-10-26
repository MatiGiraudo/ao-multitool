import type { Metadata } from "next";
import { ProveedorDeGraficos } from "@/graficos/ui/ProveedorDeGraficos";
import { EditorDeObjetos } from "@/objetos/ui/EditorDeObjetos";
import { ProveedorDeObjetos } from "@/objetos/ui/ProveedorDeObjetos";

export const metadata: Metadata = { title: "Objetos · AO World Editor" };

/* Objetos dibuja con los gráficos, así que necesita las dos piezas. */
export default function Pagina() {
  return (
    <ProveedorDeGraficos>
      <ProveedorDeObjetos>
        <EditorDeObjetos />
      </ProveedorDeObjetos>
    </ProveedorDeGraficos>
  );
}
