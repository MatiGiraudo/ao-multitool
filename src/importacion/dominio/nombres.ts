/**
 * En el AO clásico los archivos de gráficos se llaman por número: `12.bmp`, `205.png`.
 * El `FileNum` del Graficos.ini es ese número pelado, así que para cruzarlo con una hoja del
 * editor hay que comparar los nombres sin la extensión.
 */
export function baseDeArchivo(nombre: string): string {
  const sinRuta = nombre.replace(/^.*[\/]/, "");
  const punto = sinRuta.lastIndexOf(".");
  return (punto > 0 ? sinRuta.slice(0, punto) : sinRuta).trim().toLowerCase();
}

/** ¿Esta hoja del editor es el archivo que pide el clásico? */
export function esElArchivo(nombreDeHoja: string, fileNum: string): boolean {
  return baseDeArchivo(nombreDeHoja) === baseDeArchivo(fileNum);
}
