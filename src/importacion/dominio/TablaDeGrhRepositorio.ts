import type { TablaDeGrh } from "./TablaDeGrh";

/**
 * Puerto: dónde queda guardada la tabla de GRH.
 *
 * Es un documento único, no una colección: se arma una vez con el Graficos.ini y después la
 * consultan todos los importadores, incluso en otra sesión.
 */
export interface TablaDeGrhRepositorio {
  leer(): Promise<TablaDeGrh | null>;
  guardar(tabla: TablaDeGrh): Promise<void>;
}
