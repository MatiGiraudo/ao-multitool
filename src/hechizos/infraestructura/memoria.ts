import { MemoriaColeccionRepositorio } from "@/compartido/infraestructura/memoria";
import type { Hechizo } from "../dominio/Hechizo";
import type { HechizoRepositorio } from "../dominio/HechizoRepositorio";

export class MemoriaHechizoRepositorio extends MemoriaColeccionRepositorio<Hechizo> implements HechizoRepositorio {
  constructor() {
    super((h) => h.clave);
  }
}
