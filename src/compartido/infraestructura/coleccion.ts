/*
 * Lo que los adaptadores genéricos de colección necesitan saber de cada módulo.
 * Nada más que esto: cómo es la forma plana y cómo se traduce.
 */

/** Toda forma plana de una entidad guardable tiene clave; si tiene número, se ordena por él. */
export interface DtoDeColeccion {
  clave: string;
  numero?: number;
}

/** Traductor entre la entidad y su DTO. Lo implementan los `XxxMapper` de cada módulo. */
export interface MapeadorDeColeccion<T, D extends DtoDeColeccion> {
  aDto(item: T): D;
  aDominio(dto: D): T;
}

/** Orden estable de los archivos en disco: por número de AO y, a igualdad, por clave. */
export function compararDtos(a: DtoDeColeccion, b: DtoDeColeccion): number {
  return (a.numero ?? 0) - (b.numero ?? 0) || a.clave.localeCompare(b.clave);
}
