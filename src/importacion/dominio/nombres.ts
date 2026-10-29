import { baseDeArchivo, mismoArchivo } from "@/compartido/dominio/nombreDeArchivo";

/**
 * En el AO clásico los archivos de gráficos se llaman por número: `12.bmp`, `205.png`.
 * El `FileNum` del Graficos.ini es ese número pelado.
 *
 * Una hoja del proyecto puede tener ese número de dos maneras: porque se llama así —las que
 * vinieron del clásico— o porque el proyecto se lo asignó, que es lo que pasa con las hojas con
 * nombre propio (`pasto.png`). Sin número no hay manera de nombrarlas en un `Graficos.ini`: el
 * campo es numérico y cualquier otra cosa vuelve leída como el archivo 0.
 */

/** Lo único que hace falta saber de una hoja para cruzarla con un `FileNum`. */
export interface HojaConArchivo {
  nombreArchivo: string;
  numeroDeArchivo: number | null;
}

/** El `FileNum` de esta hoja: el que le asignó el proyecto, o su nombre si es un número. */
export function numeroDeArchivoDe(hoja: HojaConArchivo): number | null {
  if (hoja.numeroDeArchivo !== null) return hoja.numeroDeArchivo;
  const base = baseDeArchivo(hoja.nombreArchivo);
  return /^[0-9]+$/.test(base) ? Number(base) : null;
}

/**
 * ¿Este `FileNum` es el de esta hoja?
 *
 * Con número asignado se compara contra él y nada más: el nombre dejó de ser cómo se la nombra.
 * Sin número se comparan los nombres, que es como venía funcionando con las hojas del clásico.
 */
export function esElArchivo(hoja: HojaConArchivo, fileNum: string): boolean {
  if (hoja.numeroDeArchivo !== null) return String(hoja.numeroDeArchivo) === baseDeArchivo(fileNum);
  return mismoArchivo(hoja.nombreArchivo, fileNum);
}

/**
 * El primer número de archivo libre.
 *
 * Tiene que esquivar tres cosas: los números que ya se repartieron, los nombres de hoja que son
 * un número, y los `FileNum` que menciona la tabla de GRH aunque su hoja no esté cargada. Ese
 * último es el que importa de verdad: después de importar un cliente, la tabla nombra miles de
 * archivos que recién se cargan cuando hacen falta, y pisarle el número a uno dejaría dos hojas
 * distintas peleándose el mismo archivo.
 */
export function proximoNumeroDeArchivo(hojas: readonly HojaConArchivo[], archivosDeLaTabla: readonly string[]): number {
  let mayor = 0;
  for (const hoja of hojas) {
    const n = numeroDeArchivoDe(hoja);
    if (n !== null && n > mayor) mayor = n;
  }
  for (const archivo of archivosDeLaTabla) {
    const n = /^[0-9]+$/.test(archivo) ? Number(archivo) : 0;
    if (n > mayor) mayor = n;
  }
  return mayor + 1;
}
