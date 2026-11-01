import { CarpetaDelProyecto } from "./CarpetaDelProyecto";
import type { AlmacenDeHandles } from "./handlesGuardados";

/*
 * Una carpeta de mentira, en memoria.
 *
 * La File System Access API no existe en Node, así que sin esto los adaptadores de carpeta sólo
 * se podrían probar a mano en un navegador. Implementa lo que esos adaptadores usan de los
 * handles —entrar a una carpeta, abrir un archivo, escribirlo, borrarlo, recorrer y los permisos—
 * y nada más.
 */

class ArchivoEnMemoria {
  readonly kind = "file";
  constructor(
    readonly name: string,
    public contenido: string | Blob | Uint8Array = "",
    private permiso: PermissionState = "granted",
  ) {}

  async queryPermission(): Promise<PermissionState> {
    return this.permiso;
  }

  async requestPermission(): Promise<PermissionState> {
    return this.permiso === "denied" ? "denied" : (this.permiso = "granted");
  }

  async getFile(): Promise<File> {
    return new File([this.contenido as BlobPart], this.name);
  }

  async createWritable() {
    return {
      write: async (c: string | Blob | Uint8Array) => {
        this.contenido = c;
      },
      close: async () => undefined,
    };
  }
}

class CarpetaEnMemoria {
  readonly kind = "directory";
  readonly hijos = new Map<string, CarpetaEnMemoria | ArchivoEnMemoria>();
  constructor(
    readonly name = "proyecto",
    private permiso: PermissionState = "granted",
  ) {}

  async queryPermission(): Promise<PermissionState> {
    return this.permiso;
  }

  async requestPermission(): Promise<PermissionState> {
    return this.permiso === "denied" ? "denied" : (this.permiso = "granted");
  }

  async getDirectoryHandle(nombre: string, opciones?: { create?: boolean }): Promise<CarpetaEnMemoria> {
    const hay = this.hijos.get(nombre);
    if (hay instanceof CarpetaEnMemoria) return hay;
    if (!opciones?.create) throw new Error("NotFoundError");
    const nueva = new CarpetaEnMemoria(nombre);
    this.hijos.set(nombre, nueva);
    return nueva;
  }

  async getFileHandle(nombre: string, opciones?: { create?: boolean }): Promise<ArchivoEnMemoria> {
    const hay = this.hijos.get(nombre);
    if (hay instanceof ArchivoEnMemoria) return hay;
    if (!opciones?.create) throw new Error("NotFoundError");
    const nuevo = new ArchivoEnMemoria(nombre);
    this.hijos.set(nombre, nuevo);
    return nuevo;
  }

  async removeEntry(nombre: string): Promise<void> {
    this.hijos.delete(nombre);
  }

  async *entries(): AsyncIterableIterator<[string, CarpetaEnMemoria | ArchivoEnMemoria]> {
    for (const par of this.hijos) yield par;
  }
}

export interface CarpetaDePrueba {
  carpeta: CarpetaDelProyecto;
  /** Lo que quedó escrito, para mirarlo sin pasar por el adaptador. */
  contenidoDe(...ruta: string[]): Promise<string | null>;
  /** Los nombres que hay en una subcarpeta, en orden. */
  nombresEn(...ruta: string[]): string[];
}

export function carpetaDePrueba(): CarpetaDePrueba {
  const raiz = new CarpetaEnMemoria();
  const bajar = (ruta: string[]) => {
    let actual: CarpetaEnMemoria | undefined = raiz;
    for (const parte of ruta) {
      const hijo: CarpetaEnMemoria | ArchivoEnMemoria | undefined = actual?.hijos.get(parte);
      actual = hijo instanceof CarpetaEnMemoria ? hijo : undefined;
    }
    return actual;
  };

  return {
    carpeta: new CarpetaDelProyecto(raiz as unknown as FileSystemDirectoryHandle),
    async contenidoDe(...ruta: string[]) {
      const dentro = bajar(ruta.slice(0, -1))?.hijos.get(ruta[ruta.length - 1]!);
      if (!(dentro instanceof ArchivoEnMemoria)) return null;
      return typeof dentro.contenido === "string" ? dentro.contenido : await new Blob([dentro.contenido as BlobPart]).text();
    },
    nombresEn(...ruta: string[]) {
      return [...(bajar(ruta)?.hijos.keys() ?? [])].sort();
    },
  };
}

/*
 * Lo que hace falta para probar las rutas recordadas: un almacén de handles que no sea IndexedDB
 * —tampoco existe en Node— y handles sueltos, de una carpeta o de un archivo, como los que
 * devuelve el selector del sistema.
 */

export function handlesEnMemoria(): AlmacenDeHandles {
  const guardados = new Map<string, FileSystemHandle>();
  return {
    async guardar(clave, handle) {
      guardados.set(clave, handle);
    },
    async leer(clave) {
      return guardados.get(clave) ?? null;
    },
    async borrar(clave) {
      guardados.delete(clave);
    },
  };
}

/**
 * Una carpeta elegida por el usuario, con los archivos que le pongas.
 *
 * Las rutas pueden tener subcarpetas (`"cascos/3.png"`): el selector entrega la carpeta entera, y
 * recorrerla hasta el fondo es justo lo que hay que probar.
 */
export function carpetaElegida(nombre: string, rutas: readonly string[], permiso: PermissionState = "granted"): FileSystemDirectoryHandle {
  const raiz = new CarpetaEnMemoria(nombre, permiso);
  for (const ruta of rutas) {
    const partes = ruta.split("/");
    let actual = raiz;
    for (const parte of partes.slice(0, -1)) {
      const hay = actual.hijos.get(parte);
      if (hay instanceof CarpetaEnMemoria) {
        actual = hay;
        continue;
      }
      const nueva = new CarpetaEnMemoria(parte);
      actual.hijos.set(parte, nueva);
      actual = nueva;
    }
    const hoja = partes[partes.length - 1]!;
    actual.hijos.set(hoja, new ArchivoEnMemoria(hoja));
  }
  return raiz as unknown as FileSystemDirectoryHandle;
}

export interface ArchivoElegido {
  handle: FileSystemFileHandle;
  /** Cambia lo que dice el archivo en el disco, como si lo hubieras editado por fuera del editor. */
  escribir(texto: string): void;
}

/** Un archivo elegido por el usuario, de los que recuerda cada paso de la importación. */
export function archivoElegido(nombre: string, texto = "", permiso: PermissionState = "granted"): ArchivoElegido {
  const archivo = new ArchivoEnMemoria(nombre, texto, permiso);
  return {
    handle: archivo as unknown as FileSystemFileHandle,
    escribir(nuevo) {
      archivo.contenido = nuevo;
    },
  };
}
