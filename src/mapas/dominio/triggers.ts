/*
 * Los triggers del AO clásico.
 *
 * En el archivo el trigger es un número suelto de dos bytes, pero el servidor los interpreta como
 * un enum corto (`eTrigger` en `Declares.bas`). Tenerlos acá con su nombre y qué hacen es lo que
 * permite elegirlos de una lista en vez de acordarse de memoria que "4" es zona segura.
 *
 * El número igual se puede escribir a mano: hay servidores con triggers propios más allá del 6.
 */
export interface TriggerConocido {
  valor: number;
  nombre: string;
  que: string;
}

export const TRIGGERS: readonly TriggerConocido[] = [
  { valor: 0, nombre: "Ninguno", que: "La celda no tiene trigger." },
  { valor: 1, nombre: "Bajo techo", que: "El techo se oculta mientras el personaje está adentro." },
  { valor: 2, nombre: "Casa", que: "Casa de las que se compran: no se limpian los objetos del piso." },
  { valor: 3, nombre: "Posición inválida", que: "Los NPCs no pueden pisar esta celda." },
  { valor: 4, nombre: "Zona segura", que: "No se puede robar ni pelear desde acá." },
  { valor: 5, nombre: "Antipiquete", que: "Evita que se amontonen personajes para tapar el paso." },
  { valor: 6, nombre: "Zona de pelea", que: "Al pelear no se caen las cosas ni cambia el estado de ciuda o crimi." },
];

/** El nombre del trigger, o el número solo si es uno propio del servidor. */
export function nombreDeTrigger(valor: number): string {
  return TRIGGERS.find((t) => t.valor === valor)?.nombre ?? `Trigger ${valor}`;
}
