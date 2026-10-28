import type { ColeccionRepositorio } from "@/compartido/dominio/ColeccionRepositorio";
import { compararDtos, type DtoDeColeccion, type MapeadorDeColeccion } from "../coleccion";
import type { CarpetaDelProyecto } from "./CarpetaDelProyecto";

/**
 * Una colección entera en un solo JSON de la carpeta del usuario (`objetos/objetos.json`).
 *
 * Es el gemelo de `ArchivosColeccionRepositorio`, el del servidor: mismo archivo, mismo orden,
 * mismo JSON indentado. Esa igualdad es lo que hace que una carpeta abierta en el modo carpeta y
 * la misma carpeta servida por el modo servidor sean indistinguibles.
 *
 * La cola de escrituras es igual de necesaria que allá: dos guardados seguidos leen-modifican-
 * escriben el mismo archivo, y sin cola el segundo pisa al primero.
 */
export class CarpetaColeccionRepositorio<T, D extends DtoDeColeccion> implements ColeccionRepositorio<T> {
  private cola: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly carpeta: CarpetaDelProyecto,
    private readonly ruta: readonly string[],
    private readonly mapeador: MapeadorDeColeccion<T, D>,
    private readonly claveDe: (item: T) => string,
  ) {}

  private async leerDtos(): Promise<D[]> {
    const texto = await this.carpeta.leerTexto(this.ruta);
    if (!texto?.trim()) return [];
    const datos = JSON.parse(texto) as D[];
    return Array.isArray(datos) ? datos : [];
  }

  private async escribirDtos(dtos: D[]): Promise<void> {
    dtos.sort(compararDtos);
    await this.carpeta.escribir(this.ruta, JSON.stringify(dtos, null, 2) + "\n");
  }

  private enCola<R>(fn: () => Promise<R>): Promise<R> {
    const p = this.cola.then(fn, fn);
    this.cola = p.catch(() => undefined);
    return p;
  }

  async listar(): Promise<T[]> {
    return (await this.leerDtos()).map((d) => this.mapeador.aDominio(d));
  }

  guardar(item: T): Promise<void> {
    return this.guardarVarios([item]);
  }

  guardarVarios(items: readonly T[]): Promise<void> {
    return this.enCola(async () => {
      const dtos = await this.leerDtos();
      for (const item of items) {
        const dto = this.mapeador.aDto(item);
        const i = dtos.findIndex((x) => x.clave === this.claveDe(item));
        if (i >= 0) dtos[i] = dto;
        else dtos.push(dto);
      }
      await this.escribirDtos(dtos);
    });
  }

  eliminar(clave: string): Promise<void> {
    return this.enCola(async () => {
      await this.escribirDtos((await this.leerDtos()).filter((x) => x.clave !== clave));
    });
  }
}
