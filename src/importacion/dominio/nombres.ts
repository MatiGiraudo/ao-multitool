import { mismoArchivo } from "@/compartido/dominio/nombreDeArchivo";

/**
 * En el AO clásico los archivos de gráficos se llaman por número: `12.bmp`, `205.png`.
 * El `FileNum` del Graficos.ini es ese número pelado, así que para cruzarlo con una hoja del
 * editor hay que comparar los nombres sin la extensión.
 */
export function esElArchivo(nombreDeHoja: string, fileNum: string): boolean {
  return mismoArchivo(nombreDeHoja, fileNum);
}
