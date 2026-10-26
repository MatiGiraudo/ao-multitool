import type { Metadata } from "next";
import { ProveedorDeGraficos } from "@/graficos/ui/ProveedorDeGraficos";
import { ProveedorDeObjetos } from "@/objetos/ui/ProveedorDeObjetos";
import { PantallaAnimaciones } from "./PantallaAnimaciones";

export const metadata: Metadata = { title: "Animaciones · AO World Editor" };

/* Objetos también se monta acá: es lo que le deja mostrar "Usada por: …" debajo de cada animación. */
export default function Pagina() {
  return (
    <ProveedorDeGraficos>
      <ProveedorDeObjetos>
        <PantallaAnimaciones />
      </ProveedorDeObjetos>
    </ProveedorDeGraficos>
  );
}
