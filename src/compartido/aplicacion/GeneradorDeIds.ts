/**
 * Puerto: quién genera identificadores únicos.
 * Los casos de uso dependen de esta interfaz y no de `crypto.randomUUID`,
 * así en los tests podemos usar ids predecibles ("id-1", "id-2"...).
 */
export interface GeneradorDeIds {
  nuevo(): string;
}
