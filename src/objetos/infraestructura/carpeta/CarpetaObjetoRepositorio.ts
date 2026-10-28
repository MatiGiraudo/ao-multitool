import { CarpetaColeccionRepositorio } from "@/compartido/infraestructura/carpeta/CarpetaColeccionRepositorio";
import type { CarpetaDelProyecto } from "@/compartido/infraestructura/carpeta/CarpetaDelProyecto";
import type { Objeto } from "../../dominio/Objeto";
import type { ObjetoRepositorio } from "../../dominio/ObjetoRepositorio";
import { ObjetoMapper, type ObjetoDto } from "../ObjetoDto";

/** Todos los objetos en `objetos/objetos.json` de la carpeta elegida. */
export class CarpetaObjetoRepositorio extends CarpetaColeccionRepositorio<Objeto, ObjetoDto> implements ObjetoRepositorio {
  constructor(carpeta: CarpetaDelProyecto) {
    super(carpeta, ["objetos", "objetos.json"], ObjetoMapper, (o) => o.clave);
  }
}
