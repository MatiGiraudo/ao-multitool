import type { ReferenciaPorNombre } from "@/compartido/aplicacion/ReferenciaPorNombre";
import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import type { Efecto } from "../dominio/Efecto";

/** Un efecto tal como viene de un archivo: la animación por nombres, no por ids internos. */
export interface EfectoImportado {
  numero: number;
  nombre: string;
  animacion: ReferenciaPorNombre | null;
  offsetX: number;
  offsetY: number;
  repeticiones: number;
}

/** El formato de intercambio de efectos (hoy: "ao-fx" v1). */
export interface FormatoDeEfectos {
  readonly nombreDeArchivo: string;
  exportar(efectos: readonly Efecto[], catalogo: CatalogoGrafico): string;
  leer(texto: string): EfectoImportado[];
}
