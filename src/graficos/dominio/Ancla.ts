/**
 * Punto de apoyo de la animación: dónde se "para" el sprite.
 * En AO los personajes se apoyan abajo al centro; los efectos suelen ir centrados.
 */
export type Ancla = "abajo-centro" | "centro" | "arriba-izquierda";

export const ANCLAS: readonly { valor: Ancla; etiqueta: string }[] = [
  { valor: "abajo-centro", etiqueta: "Abajo-centro" },
  { valor: "centro", etiqueta: "Centro" },
  { valor: "arriba-izquierda", etiqueta: "Arriba-izq." },
];

/** Pivote normalizado en la convención de Unity: (0,0) es abajo a la izquierda. */
export function pivoteDe(ancla: Ancla): { x: number; y: number } {
  switch (ancla) {
    case "abajo-centro":
      return { x: 0.5, y: 0 };
    case "centro":
      return { x: 0.5, y: 0.5 };
    case "arriba-izquierda":
      return { x: 0, y: 1 };
  }
}

/** Dónde dibujar un frame de (ancho×alto) dentro de una caja de (cajaAncho×cajaAlto), según el ancla. */
export function posicionEnCaja(ancla: Ancla, ancho: number, alto: number, cajaAncho: number, cajaAlto: number) {
  switch (ancla) {
    case "abajo-centro":
      return { x: (cajaAncho - ancho) / 2, y: cajaAlto - alto };
    case "centro":
      return { x: (cajaAncho - ancho) / 2, y: (cajaAlto - alto) / 2 };
    case "arriba-izquierda":
      return { x: 0, y: 0 };
  }
}
