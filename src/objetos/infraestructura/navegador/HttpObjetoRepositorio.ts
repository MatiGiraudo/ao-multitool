import { enviar, pedirJson } from "@/compartido/infraestructura/http";
import type { Objeto } from "../../dominio/Objeto";
import type { ObjetoRepositorio } from "../../dominio/ObjetoRepositorio";
import { ObjetoMapper, type ObjetoDto } from "../ObjetoDto";

export class HttpObjetoRepositorio implements ObjetoRepositorio {
  constructor(private readonly base = "/api/objetos") {}

  async listar(): Promise<Objeto[]> {
    return (await pedirJson<ObjetoDto[]>(this.base)).map(ObjetoMapper.aDominio);
  }

  async guardar(o: Objeto): Promise<void> {
    await enviar(`${this.base}/${encodeURIComponent(o.clave)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(ObjetoMapper.aDto(o)),
    });
  }

  async guardarVarios(objetos: readonly Objeto[]): Promise<void> {
    await enviar(this.base, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(objetos.map(ObjetoMapper.aDto)),
    });
  }

  async eliminar(clave: string): Promise<void> {
    await enviar(`${this.base}/${encodeURIComponent(clave)}`, { method: "DELETE" });
  }
}
