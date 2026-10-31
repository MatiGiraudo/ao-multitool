"use client";

/*
 * El negro del AO clásico, convertido en transparente al dibujar.
 *
 * Allá los gráficos son BMP sin canal alfa, y el negro puro es el color que no se dibuja: así es
 * como el cliente recorta cada sprite de su hoja. Acá, hasta ahora, ese negro se dibujaba, y por
 * eso un mapa abierto con las imágenes del juego aparecía con un recuadro negro alrededor de cada
 * árbol y cada techo.
 *
 * Esto NO toca los archivos: la hoja guardada queda como está, y lo que cambia es la copia que se
 * usa para dibujar. El botón «Quitar el fondo negro» sigue sirviendo para lo otro —dejar la hoja
 * ya recortada, para que salga así cuando la exportás—, y una hoja a la que ya se lo hiciste pasa
 * por acá sin cambios, porque entra por la regla de abajo.
 */

export type ImagenDibujable = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

/**
 * La misma imagen, con el negro puro vuelto transparente. Si no hay nada que hacer, la de entrada.
 *
 * Dos reglas, y las dos existen para no romper un dibujo que está bien:
 *
 * - **Si la imagen ya trae transparencia, se respeta y no se toca.** Una hoja con canal alfa la
 *   armó alguien a propósito, y ahí el negro es negro: el contorno de un sprite, una sombra, una
 *   cueva. Las del juego son opacas enteras, que es justo el caso que hay que arreglar.
 * - **El negro es el negro puro y nada más**, sin tolerancia. Los sprites del clásico tienen
 *   sombras y contornos casi negros que son parte del dibujo; con tolerancia se les hacen agujeros.
 *
 * Es la misma regla que aplica `quitarColor` cuando el usuario lo pide a mano, para que lo que ves
 * mientras editás y lo que queda escrito si apretás el botón sean lo mismo.
 */
export function conNegroTransparente(img: ImagenDibujable): ImagenDibujable {
  const { width, height } = img;
  if (!width || !height) return img;

  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return img;
  ctx.drawImage(img, 0, 0);

  let datos: ImageData;
  try {
    datos = ctx.getImageData(0, 0, width, height);
  } catch {
    // Una imagen de otro origen ensucia el canvas y no se deja leer. Que se vea con su negro es
    // mejor que no verla.
    return img;
  }

  const p = datos.data;
  // Un solo píxel translúcido alcanza para saber que la hoja trae transparencia propia.
  for (let i = 3; i < p.length; i += 4) if (p[i] !== 255) return img;

  let negros = 0;
  for (let i = 0; i < p.length; i += 4) {
    if (p[i] === 0 && p[i + 1] === 0 && p[i + 2] === 0) {
      p[i + 3] = 0;
      negros++;
    }
  }
  if (!negros) return img;

  ctx.putImageData(datos, 0, 0);
  return c;
}
