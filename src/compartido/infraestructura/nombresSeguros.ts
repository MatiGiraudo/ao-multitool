/*
 * Nombres que se pueden escribir sin miedo adentro de una carpeta nuestra.
 *
 * Viven acá y no con el resto de las utilidades de disco porque las necesitan los dos lados: el
 * servidor, que escribe en `data/`, y el navegador en modo carpeta, que escribe en la carpeta que
 * eligió el usuario. Son funciones puras: ni `node:path` ni nada del entorno.
 */

/** Los ids terminan en nombres de archivo: sólo aceptamos caracteres seguros. */
export function idSeguro(id: string): string {
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) throw new Error("Identificador inválido.");
  return id;
}

/**
 * Un nombre de archivo que se puede escribir sin miedo dentro de una carpeta nuestra.
 *
 * Hace falta porque algunos nombres los eligió quien cargó la imagen, y de ahí salen los nombres
 * de los archivos exportados: sin esto, una hoja llamada `..\..\algo.png` escribiría fuera de la
 * carpeta de datos. Se queda con el último tramo y reemplaza todo lo que no sea seguro.
 */
export function nombreSeguroDeArchivo(nombre: string): string {
  const soloNombre = nombre.split(/[\\/]/).pop() ?? "";
  const limpio = soloNombre.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "");
  if (!limpio) throw new Error("Nombre de archivo inválido.");
  return limpio.slice(0, 120);
}
