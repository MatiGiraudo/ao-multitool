import { HttpColeccionRepositorio } from "@/compartido/infraestructura/navegador/HttpColeccionRepositorio";
import type { Objeto } from "../../dominio/Objeto";
import type { ObjetoRepositorio } from "../../dominio/ObjetoRepositorio";
import { ObjetoMapper, type ObjetoDto } from "../ObjetoDto";

export class HttpObjetoRepositorio extends HttpColeccionRepositorio<Objeto, ObjetoDto> implements ObjetoRepositorio {
  constructor(base = "/api/objetos") {
    super(base, ObjetoMapper, (o) => o.clave);
  }
}
