import { catalogoDe, type CatalogoPorNumero } from "@/compartido/dominio/CatalogoPorNumero";
import type { Efecto } from "../dominio/Efecto";

/**
 * Adaptador de salida: los efectos vistos como un catálogo por número, que es lo único que
 * necesitan los módulos que apuntan a un FX (hoy Hechizos, mañana NPCs y Objetos).
 *
 * Igual que `CatalogoGraficoDesdeHojas` en Gráficos: lo implementa el módulo dueño de los datos,
 * así ninguno de los otros necesita importar a FX.
 */
export function catalogoDeEfectos(efectos: readonly Efecto[]): CatalogoPorNumero {
  return catalogoDe(efectos.map((e) => ({ numero: e.numero, nombre: e.nombre })));
}
