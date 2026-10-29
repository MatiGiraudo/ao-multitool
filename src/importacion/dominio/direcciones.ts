import type { Direccion } from "@/compartido/dominio/Direccion";

/**
 * El orden de las direcciones en los archivos del clásico, tal como las numera el cliente
 * (en Declares.bas: NORTH = 1, EAST = 2, SOUTH = 3, WEST = 4). Es el mismo para cuerpos, cabezas,
 * cascos, armas y escudos, así que alcanza con esta tabla y el prefijo de la clave: `Walk1` es el
 * norte de un cuerpo y `Head1` el de una cabeza.
 *
 * Lo comparten el lector y el escritor a propósito: si se escribieran dos veces, un día una de
 * las dos quedaría corrida y las apariencias saldrían mirando para otro lado.
 */
export const DIRECCION_DE_AO: readonly Direccion[] = ["norte", "este", "sur", "oeste"];
