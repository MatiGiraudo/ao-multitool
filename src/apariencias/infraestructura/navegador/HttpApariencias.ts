import { HttpColeccionRepositorio } from "@/compartido/infraestructura/navegador/HttpColeccionRepositorio";
import type { Cabeza } from "../../dominio/Cabeza";
import type { Cuerpo } from "../../dominio/Cuerpo";
import type { CabezaRepositorio, CuerpoRepositorio } from "../../dominio/repositorios";
import { CabezaMapper, CuerpoMapper, type CabezaDto, type CuerpoDto } from "../AparienciaDto";

export class HttpCuerpoRepositorio extends HttpColeccionRepositorio<Cuerpo, CuerpoDto> implements CuerpoRepositorio {
  constructor(base = "/api/cuerpos") {
    super(base, CuerpoMapper, (c) => c.clave);
  }
}

export class HttpCabezaRepositorio extends HttpColeccionRepositorio<Cabeza, CabezaDto> implements CabezaRepositorio {
  constructor(base = "/api/cabezas") {
    super(base, CabezaMapper, (c) => c.clave);
  }
}
