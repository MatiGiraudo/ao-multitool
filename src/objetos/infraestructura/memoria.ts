import { MemoriaColeccionRepositorio } from "@/compartido/infraestructura/memoria";
import type { Objeto } from "../dominio/Objeto";
import type { ObjetoRepositorio } from "../dominio/ObjetoRepositorio";

export class MemoriaObjetoRepositorio extends MemoriaColeccionRepositorio<Objeto> implements ObjetoRepositorio {
  constructor() {
    super((o) => o.clave);
  }
}
