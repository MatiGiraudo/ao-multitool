import { describe, expect, it } from "vitest";
import { Objeto } from "@/objetos/dominio/Objeto";
import { ObjetoMapper, type ObjetoDto } from "@/objetos/infraestructura/ObjetoDto";
import { CarpetaColeccionRepositorio } from "./infraestructura/carpeta/CarpetaColeccionRepositorio";
import { CarpetaDelProyecto } from "./infraestructura/carpeta/CarpetaDelProyecto";

/*
 * El modo carpeta, probado contra una carpeta de mentira.
 *
 * La File System Access API no existe en Node, así que acá hay una implementación mínima de los
 * handles: alcanza para lo que el adaptador usa, y permite probar lo que de verdad importa, que
 * es que el archivo que escribe sea el mismo que escribe el modo servidor.
 */

class ArchivoFalso {
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

class CarpetaFalsa {
  readonly kind = "directory";
  readonly hijos = new Map<string, CarpetaFalsa | ArchivoFalso>();
  constructor(readonly name = "proyecto") {}

  async getDirectoryHandle(nombre: string, opciones?: { create?: boolean }): Promise<CarpetaFalsa> {
    const hay = this.hijos.get(nombre);
    if (hay instanceof CarpetaFalsa) return hay;
    if (!opciones?.create) throw new Error("NotFoundError");
    const nueva = new CarpetaFalsa(nombre);
    this.hijos.set(nombre, nueva);
    return nueva;
  }

  async getFileHandle(nombre: string, opciones?: { create?: boolean }): Promise<ArchivoFalso> {
    const hay = this.hijos.get(nombre);
    if (hay instanceof ArchivoFalso) return hay;
    if (!opciones?.create) throw new Error("NotFoundError");
    const nuevo = new ArchivoFalso(nombre);
    this.hijos.set(nombre, nuevo);
    return nuevo;
  }

  async removeEntry(nombre: string): Promise<void> {
    this.hijos.delete(nombre);
  }

  async *entries(): AsyncIterableIterator<[string, CarpetaFalsa | ArchivoFalso]> {
    for (const par of this.hijos) yield par;
  }
}

function conCarpetaFalsa() {
  const raiz = new CarpetaFalsa();
  const carpeta = new CarpetaDelProyecto(raiz as unknown as FileSystemDirectoryHandle);
  const repo = new CarpetaColeccionRepositorio<Objeto, ObjetoDto>(carpeta, ["objetos", "objetos.json"], ObjetoMapper, (o) => o.clave);
  const leerArchivo = async () => {
    const dentro = (await raiz.getDirectoryHandle("objetos")).hijos.get("objetos.json") as ArchivoFalso | undefined;
    return dentro ? String(dentro.contenido) : null;
  };
  return { raiz, carpeta, repo, leerArchivo };
}

const objeto = (clave: string, numero: number, nombre: string) => Objeto.crear(clave, numero).renombrado(nombre);

describe("CarpetaDelProyecto", () => {
  it("sin carpeta elegida no deja escribir, y lo dice", async () => {
    await expect(new CarpetaDelProyecto().escribir(["a.json"], "{}")).rejects.toThrow(/carpeta del proyecto/);
  });

  it("crea las subcarpetas al escribir y las encuentra al leer", async () => {
    const { carpeta } = conCarpetaFalsa();
    await carpeta.escribir(["mapas", "1.json"], '{"numero":1}');
    expect(await carpeta.leerTexto(["mapas", "1.json"])).toBe('{"numero":1}');
    expect(await carpeta.listar(["mapas"])).toEqual(["1.json"]);
  });

  it("leer algo que no está devuelve null, no una excepción", async () => {
    const { carpeta } = conCarpetaFalsa();
    expect(await carpeta.leerTexto(["objetos", "objetos.json"])).toBeNull();
    expect(await carpeta.listar(["todavia-no-existe"])).toEqual([]);
    await carpeta.borrar(["ni-esto", "x.json"]);
  });
});

describe("CarpetaColeccionRepositorio", () => {
  it("escribe el mismo archivo que el modo servidor: ordenado, indentado y con salto final", async () => {
    const { repo, leerArchivo } = conCarpetaFalsa();
    await repo.guardar(objeto("b", 2, "Espada"));
    await repo.guardar(objeto("a", 1, "Daga"));

    const texto = (await leerArchivo())!;
    expect(texto.endsWith("]\n")).toBe(true);
    expect(texto).toContain('  {\n    "clave"');
    const dtos = JSON.parse(texto) as ObjetoDto[];
    expect(dtos.map((d) => d.numero)).toEqual([1, 2]);
  });

  it("guardar, listar, reemplazar y eliminar", async () => {
    const { repo } = conCarpetaFalsa();
    await repo.guardarVarios([objeto("a", 1, "Daga"), objeto("b", 2, "Espada")]);
    expect((await repo.listar()).map((o) => o.nombre)).toEqual(["Daga", "Espada"]);

    await repo.guardar(objeto("a", 1, "Daga corta"));
    expect((await repo.listar()).map((o) => o.nombre)).toEqual(["Daga corta", "Espada"]);
    expect(await repo.listar()).toHaveLength(2);

    await repo.eliminar("a");
    expect((await repo.listar()).map((o) => o.clave)).toEqual(["b"]);
  });

  it("dos guardados a la vez no se pisan", async () => {
    // Sin la cola, los dos leen el archivo vacío y el segundo borra al primero.
    const { repo } = conCarpetaFalsa();
    await Promise.all([repo.guardar(objeto("a", 1, "Daga")), repo.guardar(objeto("b", 2, "Espada"))]);
    expect((await repo.listar()).map((o) => o.clave).sort()).toEqual(["a", "b"]);
  });

  it("un archivo vacío o con basura no voltea la pantalla", async () => {
    const { repo, carpeta } = conCarpetaFalsa();
    await carpeta.escribir(["objetos", "objetos.json"], "   ");
    expect(await repo.listar()).toEqual([]);
    await carpeta.escribir(["objetos", "objetos.json"], '{"no":"es una lista"}');
    expect(await repo.listar()).toEqual([]);
  });
});
