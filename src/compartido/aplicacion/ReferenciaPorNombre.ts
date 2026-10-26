import type { CatalogoGrafico } from "../dominio/CatalogoGrafico";
import { Referencia, type ReferenciaGrafica } from "../dominio/ReferenciaGrafica";

/**
 * Una referencia gráfica tal como viaja en un archivo de intercambio: por NOMBRES (hoja y animación),
 * no por los ids internos del editor. Así un JSON exportado sigue sirviendo aunque los ids cambien.
 */
export interface ReferenciaPorNombre {
  hoja: string;
  animacion: string;
  frame: number;
}

/**
 * Traduce lo que vino de un archivo a una referencia del dominio: vinculada si esa animación existe,
 * y si no, pendiente (se resuelve sola en cuanto cargues la hoja que falta).
 */
export function referenciaDesdeNombre(r: ReferenciaPorNombre | null | undefined, catalogo: CatalogoGrafico): ReferenciaGrafica | null {
  if (!r) return null;
  const a = catalogo.buscarPorNombre(r.hoja, r.animacion);
  return a ? Referencia.vinculada(a.hojaId, a.animacionId, r.frame) : Referencia.pendiente(r.hoja, r.animacion, r.frame);
}
