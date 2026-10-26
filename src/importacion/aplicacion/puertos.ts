import type { HechizoImportado } from "@/hechizos/aplicacion/casosDeUso";
import type { ObjetoImportado } from "@/objetos/aplicacion/puertos";
import type { Grh } from "../dominio/TablaDeGrh";

/** Puerto: sabe leer el `Graficos.ini` y devolver los GRH que define. */
export interface LectorDeGraficosClasicos {
  leer(texto: string): Grh[];
}

/**
 * Un objeto tal como viene del `OBJ.dat`: ya traducido al vocabulario del editor, pero con su
 * gráfico todavía como número de GRH. Resolverlo es trabajo del caso de uso, que es quien tiene
 * la tabla y las hojas.
 */
export type ObjetoClasico = Omit<ObjetoImportado, "graficos"> & {
  /** El `GrhIndex`: el gráfico que se ve en el inventario. 0 si el objeto no trae ninguno. */
  grhIcono: number;
};

/** Puerto: sabe leer el `OBJ.dat`. */
export interface LectorDeObjetosClasicos {
  leer(texto: string): ObjetoClasico[];
}

/**
 * Puerto: sabe leer el `Hechizos.dat`.
 *
 * Los hechizos no necesitan la tabla de GRH: apuntan al FX por número, igual que acá. Por eso lo
 * que devuelve ya es directamente lo que importa el módulo Hechizos.
 */
export interface LectorDeHechizosClasicos {
  leer(texto: string): HechizoImportado[];
}
