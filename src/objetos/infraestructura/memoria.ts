import type { Objeto } from "../dominio/Objeto";
import type { ObjetoRepositorio } from "../dominio/ObjetoRepositorio";

export class MemoriaObjetoRepositorio implements ObjetoRepositorio {
  private readonly objetos = new Map<string, Objeto>();
  async listar() {
    return [...this.objetos.values()];
  }
  async guardar(o: Objeto) {
    this.objetos.set(o.clave, o);
  }
  async guardarVarios(os: readonly Objeto[]) {
    for (const o of os) this.objetos.set(o.clave, o);
  }
  async eliminar(clave: string) {
    this.objetos.delete(clave);
  }
}
