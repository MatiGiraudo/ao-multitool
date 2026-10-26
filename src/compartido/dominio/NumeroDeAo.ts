import { asegurar } from "./ErrorDeDominio";

/*
 * El "ID" que usan los .dat de AO: objetos, hechizos, NPCs, cuerpos, cabezas y FX tienen el suyo.
 *
 * Ojo con la diferencia que recorre todo el editor: este número es un DATO del negocio, que el
 * usuario edita y puede repetir por error (lo avisa el validador de cada módulo). La identidad de
 * la entidad es su `clave`, que no cambia nunca. Por eso renumerar no rompe ningún vínculo.
 */

export function numeroDeAo(n: number, que = "El ID"): number {
  asegurar(Number.isInteger(n) && n >= 1, `${que} tiene que ser un entero mayor a 0.`);
  asegurar(n <= 2_147_483_647, `${que} es demasiado grande.`);
  return n;
}

/** El próximo número libre: uno más que el mayor que haya. */
export function siguienteNumero(items: readonly { numero: number }[]): number {
  return items.reduce((m, i) => Math.max(m, i.numero), 0) + 1;
}
