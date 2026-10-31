import type { TablaDeGrh } from "./TablaDeGrh";

/**
 * Puerto: dónde queda guardada la tabla de GRH.
 *
 * Es un documento único, no una colección: se arma una vez con el Graficos.ini y después la
 * consultan todos los importadores, incluso en otra sesión.
 */
export interface TablaDeGrhRepositorio {
  leer(): Promise<TablaDeGrh | null>;
  /**
   * Lo mismo que `leer`, pero sin lo que haya quedado en memoria.
   *
   * La tabla de un cliente entero son varios megas y el editor de mapas la consulta con cada
   * gráfico que se pone en el pincel, así que los adaptadores la cachean. Esa caché sólo se entera
   * de sus propias escrituras: con el editor abierto en dos pestañas, la de al lado puede haber
   * repartido números que esta copia no tiene.
   *
   * Para mirar la tabla alcanza `leer`. Esto es para antes de repartir un número nuevo, que es lo
   * único que no se puede hacer sobre una copia vieja.
   */
  releer(): Promise<TablaDeGrh | null>;
  guardar(tabla: TablaDeGrh): Promise<void>;
}
