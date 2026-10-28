import { CarpetaColeccionRepositorio } from "@/compartido/infraestructura/carpeta/CarpetaColeccionRepositorio";
import type { CarpetaDelProyecto } from "@/compartido/infraestructura/carpeta/CarpetaDelProyecto";
import type { Cabeza } from "../../dominio/Cabeza";
import type { Cuerpo } from "../../dominio/Cuerpo";
import type { CabezaRepositorio, CuerpoRepositorio } from "../../dominio/repositorios";
import { CabezaMapper, CuerpoMapper, type CabezaDto, type CuerpoDto } from "../AparienciaDto";

/** Los cuerpos en `apariencias/cuerpos.json` y las cabezas en `cabezas.json` de la carpeta elegida. */

export class CarpetaCuerpoRepositorio extends CarpetaColeccionRepositorio<Cuerpo, CuerpoDto> implements CuerpoRepositorio {
  constructor(carpeta: CarpetaDelProyecto) {
    super(carpeta, ["apariencias", "cuerpos.json"], CuerpoMapper, (c) => c.clave);
  }
}

export class CarpetaCabezaRepositorio extends CarpetaColeccionRepositorio<Cabeza, CabezaDto> implements CabezaRepositorio {
  constructor(carpeta: CarpetaDelProyecto) {
    super(carpeta, ["apariencias", "cabezas.json"], CabezaMapper, (c) => c.clave);
  }
}
