import "server-only";
import { carpetaDeDatos, escribirAtomico, leerSiExiste } from "@/compartido/infraestructura/carpetaDeDatos";
import type { Objeto } from "../../dominio/Objeto";
import type { ObjetoRepositorio } from "../../dominio/ObjetoRepositorio";
import { ObjetoMapper, type ObjetoDto } from "../ObjetoDto";

/**
 * Todos los objetos en un solo archivo `data/objetos/objetos.json`, ordenados por ID.
 * Las escrituras se encolan para que dos guardados seguidos no se pisen.
 */
export class ArchivosObjetoRepositorio implements ObjetoRepositorio {
  private cola: Promise<unknown> = Promise.resolve();
  constructor(private readonly ruta = carpetaDeDatos("objetos", "objetos.json")) {}

  private async leerTodos(): Promise<ObjetoDto[]> {
    const b = await leerSiExiste(this.ruta);
    return b ? (JSON.parse(b.toString("utf8")) as ObjetoDto[]) : [];
  }

  private async escribirTodos(dtos: ObjetoDto[]): Promise<void> {
    dtos.sort((a, b) => a.numero - b.numero || a.clave.localeCompare(b.clave));
    await escribirAtomico(this.ruta, JSON.stringify(dtos, null, 2) + "\n");
  }

  private enCola<T>(fn: () => Promise<T>): Promise<T> {
    const p = this.cola.then(fn, fn);
    this.cola = p.catch(() => undefined);
    return p;
  }

  async listar(): Promise<Objeto[]> {
    return (await this.leerTodos()).map(ObjetoMapper.aDominio);
  }

  guardar(o: Objeto): Promise<void> {
    return this.guardarVarios([o]);
  }

  guardarVarios(objetos: readonly Objeto[]): Promise<void> {
    return this.enCola(async () => {
      const dtos = await this.leerTodos();
      for (const o of objetos) {
        const dto = ObjetoMapper.aDto(o);
        const i = dtos.findIndex((x) => x.clave === o.clave);
        if (i >= 0) dtos[i] = dto;
        else dtos.push(dto);
      }
      await this.escribirTodos(dtos);
    });
  }

  eliminar(clave: string): Promise<void> {
    return this.enCola(async () => {
      await this.escribirTodos((await this.leerTodos()).filter((x) => x.clave !== clave));
    });
  }
}
