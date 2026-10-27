/**
 * El nombre de un archivo sin carpeta, sin extensión y en minúsculas.
 *
 * Existe para comparar dos nombres que son el mismo archivo escrito distinto: `205.PNG` y `205.png`,
 * o `Graficos/205.bmp` y `205`.
 */
export function baseDeArchivo(nombre: string): string {
  const sinRuta = nombre.replace(/^.*[\/]/, "");
  const punto = sinRuta.lastIndexOf(".");
  return (punto > 0 ? sinRuta.slice(0, punto) : sinRuta).trim().toLowerCase();
}

/** ¿Dos nombres apuntan al mismo archivo, sin mirar carpeta, extensión ni mayúsculas? */
export function mismoArchivo(a: string, b: string): boolean {
  return baseDeArchivo(a) === baseDeArchivo(b);
}
