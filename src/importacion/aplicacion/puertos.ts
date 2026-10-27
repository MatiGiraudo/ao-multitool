import type { Direccion } from "@/compartido/dominio/Direccion";
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
  leer(texto: string): HechizosClasicos;
}

/**
 * Lo que sale de un `Hechizos.dat`.
 *
 * `sinEfecto` existe porque hay dos archivos con el mismo nombre: el del servidor trae la
 * mecánica (`SubeHP`, `Paraliza`, `Target`, `FXgrh`…) y el del cliente sólo el texto que se
 * muestra en pantalla. Con el del cliente no hay efecto que leer, y conviene decirlo en vez de
 * inventarlo.
 */
export interface HechizosClasicos {
  hechizos: HechizoImportado[];
  /** Los números cuyo efecto el archivo no trae. */
  sinEfecto: number[];
}

/**
 * Una apariencia tal como viene de Personajes.ini, Cabezas.ini o Cascos.ini: ya con su número y
 * su corrimiento, pero con los gráficos todavía como números de GRH.
 */
export interface AparienciaClasica {
  numero: number;
  /** El GRH de cada dirección. Las que el archivo deja en 0 no están. */
  grhPorDireccion: Partial<Record<Direccion, number>>;
  /** Dónde se apoya la cabeza. Sólo lo traen los cuerpos; en cabezas y cascos viene en 0. */
  offsetCabezaX: number;
  offsetCabezaY: number;
}

/** Puerto: sabe leer un índice de apariencias (cuerpos, cabezas o cascos). */
export interface LectorDeAparienciasClasicas {
  leer(texto: string): AparienciaClasica[];
}

/** Un FX tal como viene del Fxs.ini, con su gráfico todavía como número de GRH. */
export interface EfectoClasico {
  numero: number;
  /** El GRH animado que se dibuja. */
  grh: number;
  offsetX: number;
  offsetY: number;
}

/** Puerto: sabe leer el `Fxs.ini`. */
export interface LectorDeEfectosClasicos {
  leer(texto: string): EfectoClasico[];
}
