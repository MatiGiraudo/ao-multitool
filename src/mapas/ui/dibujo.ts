import type { RecorteDeGrh } from "../aplicacion/casosDeUso";

/*
 * Dibujar un GRH en un canvas. Lo usan el mapa y las miniaturas de la paleta, y por eso vive
 * suelto: es la única cuenta que las dos pantallas tienen que hacer igual.
 */

export const CELDA = 32;

/** Un color estable por número de gráfico, para ver la forma del mapa sin las hojas cargadas. */
export function colorDeGrh(grh: number): string {
  const h = (grh * 2654435761) % 360;
  return `hsl(${h} 35% ${28 + ((grh * 7) % 18)}%)`;
}

/**
 * Pega el gráfico en la celda que arranca en `x, y`.
 *
 * Los gráficos más altos que una celda —árboles, techos, paredes— se apoyan abajo y se centran,
 * que es como los acomoda el juego: si no, un árbol de tres celdas aparece corrido.
 */
export function dibujarGrh(
  ctx: CanvasRenderingContext2D,
  grh: number,
  x: number,
  y: number,
  cuadro: number,
  graficos: Map<number, RecorteDeGrh>,
  imagenes: Map<string, CanvasImageSource>,
): void {
  const r = graficos.get(grh);
  if (!r) {
    ctx.fillStyle = colorDeGrh(grh);
    ctx.fillRect(x, y, CELDA, CELDA);
    return;
  }
  const img = imagenes.get(r.hojaId);
  const c = r.cuadros[cuadro % r.cuadros.length] ?? r.cuadros[0];
  if (!img || !c) return;
  ctx.drawImage(img, c.x, c.y, c.ancho, c.alto, x + (CELDA - c.ancho) / 2, y + CELDA - c.alto, c.ancho, c.alto);
}
