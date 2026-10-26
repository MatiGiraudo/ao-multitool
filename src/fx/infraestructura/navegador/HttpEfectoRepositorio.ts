import { HttpColeccionRepositorio } from "@/compartido/infraestructura/navegador/HttpColeccionRepositorio";
import type { Efecto } from "../../dominio/Efecto";
import type { EfectoRepositorio } from "../../dominio/EfectoRepositorio";
import { EfectoMapper, type EfectoDto } from "../EfectoDto";

export class HttpEfectoRepositorio extends HttpColeccionRepositorio<Efecto, EfectoDto> implements EfectoRepositorio {
  constructor(base = "/api/fx") {
    super(base, EfectoMapper, (e) => e.clave);
  }
}
