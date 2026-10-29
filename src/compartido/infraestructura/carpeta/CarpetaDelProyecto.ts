/*
 * La carpeta del proyecto, elegida por el usuario en su propia máquina.
 *
 * Es la pieza que permite desplegar el editor en un servidor sin que los archivos del proyecto
 * suban a ningún lado: el navegador abre un selector de carpetas, el usuario elige la suya, y a
 * partir de ahí los adaptadores leen y escriben ahí mismo con la File System Access API.
 *
 * El permiso se pide una vez por sesión. El handle se guarda en IndexedDB —es lo único que se
 * puede guardar: una ruta en texto no sirve, el navegador no abre archivos por ruta—, así que al
 * volver alcanza con un clic para recuperar el acceso en vez de volver a buscar la carpeta.
 *
 * El formato en disco es exactamente el mismo que escribe el modo servidor (`data/objetos/…`,
 * `data/graficos/…`), así que la misma carpeta sirve para los dos modos.
 */

const CLAVE = "carpeta-del-proyecto";

export type EstadoDeLaCarpeta = "sin-carpeta" | "falta-permiso" | "lista";

export class CarpetaDelProyecto {
  /** La raíz se puede inyectar: es lo que deja probar los adaptadores con una carpeta de mentira. */
  constructor(private raiz: FileSystemDirectoryHandle | null = null) {}

  /** La API existe en Chromium (Chrome, Edge, Brave) y no en Firefox ni Safari. */
  static get disponible(): boolean {
    return typeof window !== "undefined" && "showDirectoryPicker" in window;
  }

  get nombre(): string {
    return this.raiz?.name ?? "";
  }

  get lista(): boolean {
    return !!this.raiz;
  }

  /** Abre el selector del sistema. Tiene que salir de un clic del usuario. */
  async elegir(): Promise<void> {
    const raiz = await window.showDirectoryPicker({ id: "ao-multitool", mode: "readwrite" });
    this.raiz = raiz;
    await guardarHandle(raiz);
  }

  /**
   * Recupera la carpeta de la última vez, si el navegador todavía da permiso.
   *
   * Devuelve `falta-permiso` cuando la carpeta está pero el permiso se perdió al cerrar la
   * pestaña: ahí hace falta un clic para volver a pedirlo, porque el navegador no deja hacerlo
   * solo. Es a propósito: nadie quiere que una pestaña vieja escriba en su disco sin avisar.
   */
  async recuperar(): Promise<EstadoDeLaCarpeta> {
    const guardado = await leerHandle();
    if (!guardado) return "sin-carpeta";
    if ((await guardado.queryPermission({ mode: "readwrite" })) !== "granted") {
      this.raiz = guardado;
      return "falta-permiso";
    }
    this.raiz = guardado;
    return "lista";
  }

  /** Vuelve a pedir el permiso de la carpeta recuperada. También tiene que salir de un clic. */
  async pedirPermiso(): Promise<boolean> {
    if (!this.raiz) return false;
    return (await this.raiz.requestPermission({ mode: "readwrite" })) === "granted";
  }

  async olvidar(): Promise<void> {
    this.raiz = null;
    await borrarHandle();
  }

  // ---------- archivos ----------

  async leerTexto(ruta: readonly string[]): Promise<string | null> {
    const archivo = await this.archivo(ruta);
    return archivo ? await archivo.text() : null;
  }

  /** Los primeros bytes de un archivo: igual que `leerTexto`, pero sin traerse el resto. */
  async leerCabecera(ruta: readonly string[], bytes: number): Promise<string | null> {
    const archivo = await this.archivo(ruta);
    return archivo ? await archivo.slice(0, bytes).text() : null;
  }

  async leerBlob(ruta: readonly string[]): Promise<Blob | null> {
    return await this.archivo(ruta);
  }

  async escribir(ruta: readonly string[], contenido: string | Blob | Uint8Array): Promise<void> {
    const carpeta = await this.carpetaDe(ruta, true);
    const handle = await carpeta.getFileHandle(ruta[ruta.length - 1]!, { create: true });
    const flujo = await handle.createWritable();
    try {
      // No hay escritura atómica como en el servidor: la API no tiene «escribir y renombrar». El
      // archivo se trunca y se reescribe entero, así que un corte a mitad lo deja corto.
      await flujo.write(contenido as FileSystemWriteChunkType);
    } finally {
      await flujo.close();
    }
  }

  async borrar(ruta: readonly string[]): Promise<void> {
    const carpeta = await this.carpetaDe(ruta, false);
    if (!carpeta) return;
    await carpeta.removeEntry(ruta[ruta.length - 1]!).catch(() => undefined);
  }

  /** Los nombres de archivo que hay en una subcarpeta. Vacío si la carpeta no existe todavía. */
  async listar(partes: readonly string[]): Promise<string[]> {
    const carpeta = await this.bajar(partes, false);
    if (!carpeta) return [];
    const nombres: string[] = [];
    for await (const [nombre, handle] of carpeta.entries()) if (handle.kind === "file") nombres.push(nombre);
    return nombres;
  }

  // ---------- adentro ----------

  private get base(): FileSystemDirectoryHandle {
    if (!this.raiz) throw new Error("Todavía no elegiste la carpeta del proyecto.");
    return this.raiz;
  }

  /** El archivo, o null si no está. Que no esté es normal: muchas lecturas son «¿hay algo ya?». */
  private async archivo(ruta: readonly string[]): Promise<File | null> {
    const carpeta = await this.carpetaDe(ruta, false);
    if (!carpeta) return null;
    try {
      const handle = await carpeta.getFileHandle(ruta[ruta.length - 1]!);
      return await handle.getFile();
    } catch {
      return null;
    }
  }

  private carpetaDe(ruta: readonly string[], crear: true): Promise<FileSystemDirectoryHandle>;
  private carpetaDe(ruta: readonly string[], crear: false): Promise<FileSystemDirectoryHandle | null>;
  private carpetaDe(ruta: readonly string[], crear: boolean) {
    return this.bajar(ruta.slice(0, -1), crear) as Promise<FileSystemDirectoryHandle>;
  }

  private async bajar(partes: readonly string[], crear: boolean): Promise<FileSystemDirectoryHandle | null> {
    let actual = this.base;
    for (const parte of partes) {
      try {
        actual = await actual.getDirectoryHandle(parte, { create: crear });
      } catch {
        return null;
      }
    }
    return actual;
  }
}

/* IndexedDB a mano: es la única forma de guardar un handle de carpeta (no sobrevive a JSON ni a
 * localStorage), y traer una biblioteca entera para tres operaciones no se justifica. */
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

async function guardarHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await conLaBase((s) => s.put(handle, CLAVE));
}

function leerHandle(): Promise<FileSystemDirectoryHandle | null> {
  return conLaBase<FileSystemDirectoryHandle>((s) => s.get(CLAVE) as IDBRequest<FileSystemDirectoryHandle>);
}

async function borrarHandle(): Promise<void> {
  await conLaBase((s) => s.delete(CLAVE));
}
