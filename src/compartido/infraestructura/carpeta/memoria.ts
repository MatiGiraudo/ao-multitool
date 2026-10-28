import { CarpetaDelProyecto } from "./CarpetaDelProyecto";

/*
 * Una carpeta de mentira, en memoria.
 *
 * La File System Access API no existe en Node, así que sin esto los adaptadores de carpeta sólo
 * se podrían probar a mano en un navegador. Implementa lo que esos adaptadores usan de los
 * handles —entrar a una carpeta, abrir un archivo, escribirlo, borrarlo y recorrer— y nada más.
 */

class ArchivoEnMemoria {
  readonly kind = "file";
  constructor(
    readonly name: string,
    public contenido: string | Blob | Uint8Array = "",
  ) {}

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
  constructor(readonly name = "proyecto") {}

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
