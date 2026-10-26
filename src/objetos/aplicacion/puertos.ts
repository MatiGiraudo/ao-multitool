import type { CatalogoGrafico } from "../dominio/CatalogoGrafico";
import type { Direccion } from "../dominio/Direccion";
import type { Objeto, ValorDeAtributo } from "../dominio/Objeto";

/** Una referencia gráfica tal como viaja en un archivo: por nombres, no por ids internos. */
export interface ReferenciaPorNombre {
  hoja: string;
  animacion: string;
  frame: number;
}

export interface ObjetoImportado {
  numero: number;
  nombre: string;
  tipo: string;
  valor: number;
  descripcion: string;
  apilable: boolean;
  nivelMinimo: number;
  banderas: string[];
  atributos: Record<string, ValorDeAtributo>;
  graficos: {
    icono: ReferenciaPorNombre | null;
    suelo: ReferenciaPorNombre | null;
    equipado: Partial<Record<Direccion, ReferenciaPorNombre>>;
  };
}

/** El formato de intercambio de objetos (hoy: "ao-objs" v1). */
export interface FormatoDeObjetos {
  readonly nombreDeArchivo: string;
  exportar(objetos: readonly Objeto[], catalogo: CatalogoGrafico): string;
  leer(texto: string): ObjetoImportado[];
}
