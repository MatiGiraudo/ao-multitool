import type { ColeccionRepositorio } from "@/compartido/dominio/ColeccionRepositorio";
import { enviar, pedirJson } from "../http";
import type { DtoDeColeccion, MapeadorDeColeccion } from "../coleccion";

/**
 * Adaptador del navegador: las mismas cuatro operaciones, contra las rutas de API del módulo
 * (`GET /api/<recurso>`, `POST /api/<recurso>`, `PUT|DELETE /api/<recurso>/<clave>`).
 */
export class HttpColeccionRepositorio<T, D extends DtoDeColeccion> implements ColeccionRepositorio<T> {
  constructor(
    private readonly base: string,
    private readonly mapeador: MapeadorDeColeccion<T, D>,
    private readonly claveDe: (item: T) => string,
  ) {}

  private url(clave: string): string {
    return `${this.base}/${encodeURIComponent(clave)}`;
  }

  async listar(): Promise<T[]> {
    return (await pedirJson<D[]>(this.base)).map((d) => this.mapeador.aDominio(d));
  }

  async guardar(item: T): Promise<void> {
    await enviar(this.url(this.claveDe(item)), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(this.mapeador.aDto(item)),
    });
  }

  async guardarVarios(items: readonly T[]): Promise<void> {
    await enviar(this.base, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(items.map((i) => this.mapeador.aDto(i))),
    });
  }

  async eliminar(clave: string): Promise<void> {
    await enviar(this.url(clave), { method: "DELETE" });
  }
}
