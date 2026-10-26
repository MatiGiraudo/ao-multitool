import { MemoriaColeccionRepositorio } from "@/compartido/infraestructura/memoria";
import type { Efecto } from "../dominio/Efecto";
import type { EfectoRepositorio } from "../dominio/EfectoRepositorio";

export class MemoriaEfectoRepositorio extends MemoriaColeccionRepositorio<Efecto> implements EfectoRepositorio {
  constructor() {
    super((e) => e.clave);
  }
}
