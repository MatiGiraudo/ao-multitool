import type { Mapa } from "./Mapa";

/*
 * El puerto para guardar mapas en el proyecto.
 *
 * Hasta acá el editor sólo sabía abrir los archivos del juego y volver a escribirlos: lo que
 * editabas vivía en memoria hasta exportar. Un mapa que se arma de cero lleva varias sesiones,
 * así que el proyecto necesita su propia copia, igual que la tiene cada hoja o cada objeto.
 */

/** Un mapa con lo que hace falta para devolverlo al juego tal como vino. */
export interface MapaGuardado {
  mapa: Mapa;
  /** Con cuántos bytes por gráfico se escribe el `.map`. Un mapa nuevo usa 4. */
  anchoDeGrafico: 2 | 4;
  /** El nombre base de los tres archivos del juego, sin extensión: `Mapa1`. */
  nombreArchivo: string;
}

/** Lo que alcanza para la lista, sin leer las 40.000 celdas de cada uno. */
export interface ResumenDeMapa {
  numero: number;
  nombre: string;
  nombreArchivo: string;
}

export interface MapaRepositorio {
  listar(): Promise<ResumenDeMapa[]>;
  obtener(numero: number): Promise<MapaGuardado | null>;
  guardar(guardado: MapaGuardado): Promise<void>;
  eliminar(numero: number): Promise<void>;
}
