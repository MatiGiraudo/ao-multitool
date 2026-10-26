"use client";
import { useCatalogoDeEfectos, MiniaturaDeEfecto } from "@/fx/ui/MiniaturaDeEfecto";
import { EditorDeHechizos } from "@/hechizos/ui/EditorDeHechizos";
import { ProveedorDeHechizos } from "@/hechizos/ui/ProveedorDeHechizos";

/**
 * Composición: Hechizos no conoce a FX, pero la página los junta.
 * De FX salen dos cosas: el catálogo por número (para validar) y cómo se ve un efecto.
 */
export function PantallaHechizos() {
  const fx = useCatalogoDeEfectos();
  return (
    <ProveedorDeHechizos fx={fx}>
      <EditorDeHechizos renderFx={(numero) => <MiniaturaDeEfecto numero={numero} />} />
    </ProveedorDeHechizos>
  );
}
