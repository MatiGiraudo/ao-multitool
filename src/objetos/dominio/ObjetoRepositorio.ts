import type { Objeto } from "./Objeto";

/** Puerto de persistencia de objetos. */
export interface ObjetoRepositorio {
  listar(): Promise<Objeto[]>;
  guardar(objeto: Objeto): Promise<void>;
  guardarVarios(objetos: readonly Objeto[]): Promise<void>;
  eliminar(clave: string): Promise<void>;
}
