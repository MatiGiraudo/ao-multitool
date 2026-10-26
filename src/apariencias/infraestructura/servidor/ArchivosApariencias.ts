import "server-only";
import { carpetaDeDatos } from "@/compartido/infraestructura/carpetaDeDatos";
import { ArchivosColeccionRepositorio } from "@/compartido/infraestructura/servidor/ArchivosColeccionRepositorio";
import type { Cabeza } from "../../dominio/Cabeza";
import type { Cuerpo } from "../../dominio/Cuerpo";
import type { CabezaRepositorio, CuerpoRepositorio } from "../../dominio/repositorios";
import { CabezaMapper, CuerpoMapper, type CabezaDto, type CuerpoDto } from "../AparienciaDto";

/** Los cuerpos en `data/apariencias/cuerpos.json` y las cabezas en `cabezas.json`, por ID. */

export class ArchivosCuerpoRepositorio extends ArchivosColeccionRepositorio<Cuerpo, CuerpoDto> implements CuerpoRepositorio {
  constructor(ruta = carpetaDeDatos("apariencias", "cuerpos.json")) {
    super(ruta, CuerpoMapper, (c) => c.clave);
  }
}

export class ArchivosCabezaRepositorio extends ArchivosColeccionRepositorio<Cabeza, CabezaDto> implements CabezaRepositorio {
  constructor(ruta = carpetaDeDatos("apariencias", "cabezas.json")) {
    super(ruta, CabezaMapper, (c) => c.clave);
  }
}
