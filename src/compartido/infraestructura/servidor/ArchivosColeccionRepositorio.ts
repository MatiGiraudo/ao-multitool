import "server-only";
import type { ColeccionRepositorio } from "@/compartido/dominio/ColeccionRepositorio";
import { escribirAtomico, leerSiExiste } from "../carpetaDeDatos";
import { compararDtos, type DtoDeColeccion, type MapeadorDeColeccion } from "../coleccion";

/**
 * Adaptador de disco para una colección entera en un solo JSON (`data/<modulo>/<archivo>.json`).
 *
 * Dos detalles que no son obvios y que conviene no reescribir por módulo:
 * - **Cola de escrituras**: dos guardados seguidos no se pisan, porque el segundo lee después de
 *   que el primero escribió.
 * - **Escritura atómica**: se escribe un temporal y se renombra, así nunca queda un JSON cortado.
 */
export class ArchivosColeccionRepositorio<T, D extends DtoDeColeccion> implements ColeccionRepositorio<T> {
  private cola: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly ruta: string,
    private readonly mapeador: MapeadorDeColeccion<T, D>,
    private readonly claveDe: (item: T) => string,
  ) {}

  private async leerDtos(): Promise<D[]> {
    const b = await leerSiExiste(this.ruta);
    return b ? (JSON.parse(b.toString("utf8")) as D[]) : [];
  }

  private async escribirDtos(dtos: D[]): Promise<void> {
    dtos.sort(compararDtos);
    await escribirAtomico(this.ruta, JSON.stringify(dtos, null, 2) + "\n");
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
