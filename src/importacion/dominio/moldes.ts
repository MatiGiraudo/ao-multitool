import type { Direccion } from "@/compartido/dominio/Direccion";
import type { RectDeGrh, RecortesDeGrh } from "./TablaDeGrh";

/*
 * Los moldes de cuerpos, que es como el AO20 dejó de escribir un GRH por cada cuadro de cada
 * cuerpo.
 *
 * Un cuerpo del clásico nombra sus cuatro animaciones por número —`Walk1=4582`— y cada una es
 * otra entrada del `Graficos.ini` con sus cuadros adentro. Un cuerpo con molde no nombra nada:
 * dice `Std=199` y `FileNum=394`, y el molde cuenta cómo está armada esa hoja (desde qué píxel,
 * de qué tamaño es un cuadro y cuántos cuadros tiene cada dirección). El cliente lo expande al
 * arrancar: inventa los GRH en memoria y no los escribe en ningún archivo.
 *
 * Acá se hace la misma cuenta, pero el resultado son recortes de hoja y no números de GRH. Es a
 * propósito: un número que no está en ningún `Graficos.ini` no le sirve a nadie —ni al juego, ni
 * a otro editor— y para crear la animación alcanza con los recortes. Los números aparecen recién
 * al exportar, y ahí salen en el `Graficos.ini` como cualquier gráfico propio del proyecto.
 */

/** Cómo está armada una hoja de cuerpo: dónde empieza, cuánto mide un cuadro y cuántos hay. */
export interface Molde {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  /** Cuántos cuadros tiene cada fila, en el orden del molde. Una fila en 0 es una dirección que el molde no trae. */
  cuadrosPorFila: readonly number[];
}

/** Los moldes por número, que es con el que los nombra el `Std` de un cuerpo. */
export type MoldesDeCuerpos = ReadonlyMap<number, Molde>;

/**
 * El orden de las filas de un molde, que NO es el de los `Walk1..4`.
 *
 * Un cuerpo del clásico se escribe en el orden del cliente (norte, este, sur, oeste: ver
 * `direcciones.ts`), pero las filas de la hoja van en otro —en `Recursos.bas`, `BodiesHeading` es
 * south, north, west, east— y la primera fila de un molde es la que mira de frente. Confundirlos
 * deja a todos los cuerpos del AO20 caminando para el lado que no es, y nada avisa: se ve recién
 * al mirar un personaje.
 */
export const DIRECCION_DE_MOLDE: readonly Direccion[] = ["sur", "norte", "oeste", "este"];

/** Lo que tarda un cuadro con `Speed=1`, que es lo que el cliente calcula como `1 / 1 / 0.018`. */
const MS_POR_FRAME_BASE = 1 / 0.018;

/**
 * Los recortes de cada dirección de un cuerpo con molde.
 *
 * El recorrido es el del cliente: una fila por dirección, los cuadros de la fila hacia la derecha
 * desde el borde del molde, y la fila siguiente un alto más abajo. La fila avanza aunque esté en
 * 0, porque el lugar de una dirección vacía igual está ocupado en la hoja.
 */
export function recortesDelMolde(molde: Molde, archivo: string, velocidad: number): Partial<Record<Direccion, RecortesDeGrh>> {
  const msPorFrame = msPorFrameDeVelocidad(velocidad);
  const porDireccion: Partial<Record<Direccion, RecortesDeGrh>> = {};
  let y = molde.y;
  DIRECCION_DE_MOLDE.forEach((direccion, fila) => {
    const cuadros = molde.cuadrosPorFila[fila] ?? 0;
    if (cuadros > 0) {
      const rects: RectDeGrh[] = [];
      for (let i = 0; i < cuadros; i++) rects.push({ x: molde.x + i * molde.ancho, y, ancho: molde.ancho, alto: molde.alto });
      porDireccion[direccion] = { archivo, rects, msPorFrame };
    }
    y += molde.alto;
  });
  return porDireccion;
}

/**
 * La velocidad del cuerpo es un multiplicador, y el cliente la da vuelta: a más velocidad, menos
 * tiempo por cuadro. Sin velocidad camina como si fuera 1, igual que allá.
 */
export function msPorFrameDeVelocidad(velocidad: number): number {
  return Math.max(10, Math.round(MS_POR_FRAME_BASE / (velocidad > 0 ? velocidad : 1)));
}

/**
 * Cómo se llama en la hoja la animación que sale de un molde.
 *
 * El nombre no lleva el número del cuerpo a propósito: lo que dibuja una fila del molde depende
 * del molde y de la hoja, no de quién lo usa, así que los cientos de cuerpos que comparten
 * `Std` y `FileNum` comparten también la animación en vez de llenar la hoja de copias del mismo
 * dibujo. Reimportar el archivo tampoco las duplica: el nombre vuelve a caer en la que ya está.
 *
 * Lo que sí se pierde es la velocidad del segundo: si dos cuerpos comparten molde y hoja pero no
 * `Speed`, queda la del primero. Es el mismo criterio con el que la tabla de GRH considera que
 * dos gráficos con los mismos cuadros son el mismo dibujo aunque uno corra más rápido.
 */
export function nombreDeMolde(std: number, direccion: Direccion): string {
  return `molde${std}-${direccion}`;
}

/** Con qué se vuelve a encontrar la referencia de una fila ya vinculada: la hoja y el molde la deciden. */
export function claveDeMolde(std: number, direccion: Direccion, archivo: string): string {
  return `${archivo}|${nombreDeMolde(std, direccion)}`;
}
