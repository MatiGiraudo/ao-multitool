/**
 * Puerto de persistencia de una colección de entidades identificadas por `clave`.
 *
 * Objetos, y después apariencias, FX, hechizos y NPCs, necesitan exactamente estas cuatro
 * operaciones. Cada módulo le pone nombre propio a su puerto (`ObjetoRepositorio`) para que el
 * lenguaje del dominio no se diluya, pero la forma es esta y por eso los adaptadores se escriben
 * una sola vez (ver `compartido/infraestructura/`).
 */
export interface ColeccionRepositorio<T> {
  listar(): Promise<T[]>;
  guardar(item: T): Promise<void>;
  guardarVarios(items: readonly T[]): Promise<void>;
  eliminar(clave: string): Promise<void>;
}
