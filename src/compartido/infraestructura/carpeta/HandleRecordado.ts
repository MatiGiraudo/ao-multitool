import { handlesEnIndexedDb, type AlmacenDeHandles } from "./handlesGuardados";

/*
 * Una carpeta o un archivo que el usuario eligió y el editor no se olvida.
 *
 * El editor trabaja contra archivos de otro programa —la carpeta `Graficos` del cliente, el
 * `Personajes.ini`, la carpeta `Mundos`—, que no son suyos y no se copia. Hasta acá cada visita
 * empezaba igual: abrir el selector del sistema y volver a buscar a mano la misma carpeta de
 * siempre, que en una instalación del clásico está cuatro niveles adentro. Guardado el handle,
 * volver a leer es un clic.
 *
 * El permiso se pide una vez por sesión y sólo puede salir de un clic del usuario: el navegador
 * no deja que una pestaña vieja se ponga a leer tu disco sola, y está bien que no deje. Por eso
 * `recuperar` distingue «está, pero falta el permiso» de «no hay nada»: en el primer caso quien
 * lo use tiene que ofrecer ese clic, no un selector.
 *
 * Se piden en modo lectura, y no en `readwrite` como la carpeta del proyecto. El editor nunca
 * escribe en los archivos del juego: lo que devuelve sale por «Exportar», a la carpeta del
 * proyecto o como descarga. Pedir escritura sobre la carpeta del cliente sería pedir de más, y el
 * navegador lo cuenta con un cartel más serio.
 */

export type EstadoRecordado = "sin-elegir" | "falta-permiso" | "listo";

const LECTURA = { mode: "read" } as const;

/** Los `getFile()` de una carpeta grande van en tandas: la `Graficos` del clásico tiene miles. */
const TANDA = 50;

abstract class HandleRecordado<H extends FileSystemHandle> {
  private handle: H | null = null;

  constructor(
    protected readonly clave: string,
    private readonly almacen: AlmacenDeHandles = handlesEnIndexedDb,
  ) {}

  get nombre(): string {
    return this.handle?.name ?? "";
  }

  /** Lo de la última vez, si el navegador todavía lo tiene y sigue dando permiso. */
  async recuperar(): Promise<EstadoRecordado> {
    const guardado = (await this.almacen.leer(this.clave)) as H | null;
    if (!guardado) return "sin-elegir";
    this.handle = guardado;
    return (await guardado.queryPermission(LECTURA)) === "granted" ? "listo" : "falta-permiso";
  }

  /** Vuelve a pedir el permiso de lo recordado. También tiene que salir de un clic. */
  async pedirPermiso(): Promise<boolean> {
    if (!this.handle) return false;
    return (await this.handle.requestPermission(LECTURA)) === "granted";
  }

  async olvidar(): Promise<void> {
    this.handle = null;
    await this.almacen.borrar(this.clave);
  }

  protected get elegido(): H | null {
    return this.handle;
  }

  protected async recordar(handle: H): Promise<void> {
    this.handle = handle;
    await this.almacen.guardar(this.clave, handle);
  }
}

export class CarpetaRecordada extends HandleRecordado<FileSystemDirectoryHandle> {
  /** La API existe en Chromium (Chrome, Edge, Brave) y no en Firefox ni Safari. */
  static get disponible(): boolean {
    return typeof window !== "undefined" && "showDirectoryPicker" in window;
  }

  /** Abre el selector del sistema. Tiene que salir de un clic del usuario. */
  async elegir(): Promise<void> {
    await this.recordar(await window.showDirectoryPicker({ id: this.clave, ...LECTURA }));
  }

  /**
   * Todos los archivos de la carpeta y de sus subcarpetas.
   *
   * Es exactamente lo que entrega un `<input webkitdirectory>`, y a propósito: los dos caminos
   * terminan en la misma lista de `File`, así que quien recibe no sabe —ni le importa— por cuál
   * vino. Recorre todo sin filtrar, también como el input: qué sirve lo decide quien pidió.
   */
  async archivos(): Promise<File[]> {
    const raiz = this.elegido;
    if (!raiz) return [];
    const encontrados: FileSystemFileHandle[] = [];
    const pendientes: FileSystemDirectoryHandle[] = [raiz];
    while (pendientes.length) {
      for await (const [, hijo] of pendientes.pop()!.entries()) {
        if (hijo.kind === "file") encontrados.push(hijo as FileSystemFileHandle);
        else pendientes.push(hijo as FileSystemDirectoryHandle);
      }
    }
    const archivos: File[] = [];
    for (let i = 0; i < encontrados.length; i += TANDA) {
      archivos.push(...(await Promise.all(encontrados.slice(i, i + TANDA).map((h) => h.getFile()))));
    }
    return archivos;
  }
}

export class ArchivoRecordado extends HandleRecordado<FileSystemFileHandle> {
  static get disponible(): boolean {
    return typeof window !== "undefined" && "showOpenFilePicker" in window;
  }

  /**
   * Abre el selector del sistema y devuelve lo elegido. Tiene que salir de un clic.
   *
   * Sin `mode`, que acá no existe: un archivo elegido así viene de sólo lectura, que es todo lo
   * que hace falta.
   */
  async elegir(tipos: readonly FilePickerAcceptType[]): Promise<File> {
    const [handle] = await window.showOpenFilePicker({ id: this.clave, multiple: false, types: [...tipos] });
    await this.recordar(handle!);
    return await handle!.getFile();
  }

  /**
   * El archivo recordado, leído de nuevo.
   *
   * Se relee siempre, y no se guarda el `File` de la primera vez: el handle apunta al archivo en
   * el disco, que puede haber cambiado desde entonces. Es justo el caso que hace útil recordarlo
   * —editás el `Personajes.ini` afuera y volvés a importar—, así que leer la versión vieja sería
   * peor que no recordar nada.
   */
  async leer(): Promise<File | null> {
    return this.elegido ? await this.elegido.getFile() : null;
  }
}
