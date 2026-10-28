import type { Direccion } from "@/compartido/dominio/Direccion";
import type { HechizoImportado } from "@/hechizos/aplicacion/casosDeUso";
import type { NpcImportado } from "@/npcs/aplicacion/casosDeUso";
import type { ObjetoImportado } from "@/objetos/aplicacion/puertos";
import type { Hechizo } from "@/hechizos/dominio/Hechizo";
import type { Npc } from "@/npcs/dominio/Npc";
import type { Objeto } from "@/objetos/dominio/Objeto";
import type { OriginalesDeFamilia } from "../dominio/OriginalesRepositorio";
import type { Grh, TablaDeGrh } from "../dominio/TablaDeGrh";

/** Puerto: sabe leer el `Graficos.ini` y devolver los GRH que define. */
export interface LectorDeGraficosClasicos {
  leer(texto: string): Grh[];
}

/** Puerto: sabe escribir la tabla como `Graficos.ini`, para devolverle los gráficos nuevos al juego. */
export interface EscritorDeGraficosClasicos {
  escribir(tabla: TablaDeGrh): string;
}

/**
 * Puerto: sabe devolver el `OBJ.dat`.
 *
 * Recibe los originales porque el editor entiende una quinta parte de las claves del archivo: lo
 * que no maneja se devuelve tal como vino, en vez de perderse.
 */
export interface EscritorDeObjetosClasicos {
  escribir(objetos: readonly Objeto[], originales: OriginalesDeFamilia): string;
}

/**
 * Un objeto tal como viene del `OBJ.dat`: ya traducido al vocabulario del editor, pero con su
 * gráfico todavía como número de GRH. Resolverlo es trabajo del caso de uso, que es quien tiene
 * la tabla y las hojas.
 */
export type ObjetoClasico = Omit<ObjetoImportado, "graficos"> & {
  /** El `GrhIndex`: el gráfico que se ve en el inventario. 0 si el objeto no trae ninguno. */
  grhIcono: number;
  /**
   * La sección entera tal como estaba en el archivo.
   *
   * De las 90 claves que tiene un `OBJ.dat` el editor entiende unas veinte; guardar el texto es
   * lo que después permite devolver el archivo completo en vez de uno recortado.
   */
  crudo: string;
};

/** Un `OBJ.dat` leido: sus objetos y la documentacion que trae arriba de todo. */
export interface ArchivoDeObjetosClasicos {
  objetos: ObjetoClasico[];
  /** Las lineas antes de la primera seccion. Vuelven tal cual al exportar. */
  encabezado: string;
}

/** Puerto: sabe leer el `OBJ.dat`. */
export interface LectorDeObjetosClasicos {
  leer(texto: string): ArchivoDeObjetosClasicos;
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

/** Puerto: sabe devolver el `Hechizos.dat` sin perder lo que el editor no maneja. */
export interface EscritorDeHechizosClasicos {
  escribir(hechizos: readonly Hechizo[], originales: OriginalesDeFamilia): string;
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
  /** El texto de cada seccion, por numero, y el encabezado del archivo. */
  crudos: Record<number, string>;
  encabezado: string;
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

/**
 * Puerto: sabe leer el `NPCs.dat`.
 *
 * Como los hechizos, no necesita la tabla de GRH: el NPC apunta a su cuerpo y a su cabeza por
 * número, que es exactamente como los guarda el editor.
 */
/** Un NPC del clasico, con la seccion entera por si hay que devolver el archivo. */
export type NpcClasico = NpcImportado & { crudo: string };

export interface ArchivoDeNpcsClasicos {
  npcs: NpcClasico[];
  encabezado: string;
}

export interface LectorDeNpcsClasicos {
  leer(texto: string): ArchivoDeNpcsClasicos;
}

/** Puerto: sabe devolver el `NPCs.dat` sin perder las claves que el editor no maneja. */
export interface EscritorDeNpcsClasicos {
  escribir(npcs: readonly Npc[], originales: OriginalesDeFamilia): string;
}
