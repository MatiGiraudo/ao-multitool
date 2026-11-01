/*
 * Dónde se guarda lo que el usuario eligió, para que la próxima vez ya esté.
 *
 * De una carpeta o de un archivo elegido con la File System Access API lo único que se puede
 * guardar es su handle: la ruta en texto no sirve de nada, porque el navegador no abre nada por
 * ruta —es a propósito, una página no tiene por qué poder nombrar archivos de tu disco—. Y el
 * handle no sobrevive a JSON ni a localStorage, pero sí a IndexedDB, que lo serializa con su
 * mecanismo propio.
 *
 * IndexedDB a mano, y no una biblioteca, porque son tres operaciones. Un almacén con una clave
 * por cosa recordada: la carpeta del proyecto, la carpeta de imágenes, cada archivo del clásico.
 */

/** El puerto: así los tests no necesitan un IndexedDB. */
export interface AlmacenDeHandles {
  guardar(clave: string, handle: FileSystemHandle): Promise<void>;
  leer(clave: string): Promise<FileSystemHandle | null>;
  borrar(clave: string): Promise<void>;
}

const BASE = "ao-multitool";
const ALMACEN = "handles";

function conLaBase<T>(fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return new Promise((listo, mal) => {
    const pedido = indexedDB.open(BASE, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(ALMACEN);
    pedido.onerror = () => mal(pedido.error);
    pedido.onsuccess = () => {
      const db = pedido.result;
      const tx = db.transaction(ALMACEN, "readwrite");
      const r = fn(tx.objectStore(ALMACEN));
      r.onsuccess = () => listo(r.result ?? null);
      r.onerror = () => mal(r.error);
      tx.oncomplete = () => db.close();
    };
  });
}

export const handlesEnIndexedDb: AlmacenDeHandles = {
  async guardar(clave, handle) {
    await conLaBase((s) => s.put(handle, clave));
  },
  leer(clave) {
    return conLaBase<FileSystemHandle>((s) => s.get(clave) as IDBRequest<FileSystemHandle>);
  },
  async borrar(clave) {
    await conLaBase((s) => s.delete(clave));
  },
};
