/*
 * Que este navegador ya devolvió un selector vacío, anotado de una visita a la otra.
 *
 * Hay máquinas donde la File System Access API no entrega nunca: el cuadro del sistema se abre,
 * elegís, y vuelve `AbortError`. Lo vimos en un Chrome 157 de Windows donde el `<input>` de toda
 * la vida entregaba 951 archivos de la misma carpeta, así que no es el cuadro ni la máquina: es
 * esa API. Puede ser un agente de seguridad enganchado a ella, o el navegador mismo.
 *
 * Ahí el editor igual se usa, porque cada selector ofrece el `<input>` como salida —pero recién
 * después de que le fallaste un clic—. En la pantalla de importación, que son siete archivos
 * seguidos, eso son siete clics tirados cada visita. Con esto anotado, la salida aparece desde el
 * principio, al lado del botón de siempre.
 *
 * Se anota en `localStorage` y no en el proyecto a propósito: es una propiedad del navegador que
 * tenés abierto, no del mundo que estás editando. Y se borra sola en cuanto un selector entrega
 * algo, para que una máquina que se arregló no quede marcada para siempre.
 */

const CLAVE = "ao-selector-del-sistema-vacio";

/** Nunca puede tirar: en una ventana privada `localStorage` puede ni existir. */
function conElAlmacen<T>(fn: (almacen: Storage) => T, siNo: T): T {
  try {
    return fn(window.localStorage);
  } catch {
    return siNo;
  }
}

export function anotarSelectorVacio(): void {
  conElAlmacen((almacen) => almacen.setItem(CLAVE, "1"), undefined);
}

export function olvidarSelectorVacio(): void {
  conElAlmacen((almacen) => almacen.removeItem(CLAVE), undefined);
}

export function huboSelectorVacio(): boolean {
  return conElAlmacen((almacen) => almacen.getItem(CLAVE) === "1", false);
}
