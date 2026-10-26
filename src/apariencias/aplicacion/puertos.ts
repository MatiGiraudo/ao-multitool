import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import type { Apariencia } from "../dominio/Apariencia";

/**
 * El formato de intercambio de una especie de apariencia (hoy: "ao-bodies" y "ao-heads", ambos v1).
 *
 * Es el mismo contrato para las dos, con `T` e `I` distintos: así los casos de uso de exportar e
 * importar se escriben una sola vez.
 */
export interface FormatoDeApariencias<T extends Apariencia, I> {
  readonly nombreDeArchivo: string;
  exportar(items: readonly T[], catalogo: CatalogoGrafico): string;
  leer(texto: string): I[];
}
