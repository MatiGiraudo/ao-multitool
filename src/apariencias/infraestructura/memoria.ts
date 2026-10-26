import { MemoriaColeccionRepositorio } from "@/compartido/infraestructura/memoria";
import type { Cabeza } from "../dominio/Cabeza";
import type { Cuerpo } from "../dominio/Cuerpo";
import type { CabezaRepositorio, CuerpoRepositorio } from "../dominio/repositorios";

export class MemoriaCuerpoRepositorio extends MemoriaColeccionRepositorio<Cuerpo> implements CuerpoRepositorio {
  constructor() {
    super((c) => c.clave);
  }
}

export class MemoriaCabezaRepositorio extends MemoriaColeccionRepositorio<Cabeza> implements CabezaRepositorio {
  constructor() {
    super((c) => c.clave);
  }
}
