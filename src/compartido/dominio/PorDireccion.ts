import { DIRECCIONES, type Direccion } from "./Direccion";

/*
 * Un dato por cada dirección en la que se puede ver algo: la animación de equipado de un objeto,
 * el caminar de un cuerpo, la cara de una cabeza. Las direcciones que faltan simplemente no están.
 *
 * Es un objeto de valor: nunca se modifica, siempre se devuelve uno nuevo.
 */
export type PorDireccion<T> = Readonly<Partial<Record<Direccion, T>>>;

/** Un mapa nuevo con esa dirección puesta; con `null` la saca. */
export function conDireccion<T>(mapa: PorDireccion<T>, direccion: Direccion, valor: T | null): PorDireccion<T> {
  const out = { ...mapa };
  if (valor) out[direccion] = valor;
  else delete out[direccion];
  return out;
}

/** Las direcciones que todavía no tienen nada, en el orden de siempre. */
export function direccionesFaltantes<T>(mapa: PorDireccion<T>): Direccion[] {
  return DIRECCIONES.filter((d) => !mapa[d.valor]).map((d) => d.valor);
}

/** Lo que hay cargado, en el orden de siempre. */
export function valoresPorDireccion<T>(mapa: PorDireccion<T>): T[] {
  return DIRECCIONES.map((d) => mapa[d.valor]).filter((v): v is T => !!v);
}
