import type { ReferenciaPorNombre } from "@/compartido/aplicacion/ReferenciaPorNombre";
import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import type { Direccion } from "@/compartido/dominio/Direccion";
import type { ValorDeAtributo } from "@/compartido/dominio/Atributos";
import type { Objeto } from "../dominio/Objeto";

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
