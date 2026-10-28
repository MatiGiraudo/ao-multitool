import { CarpetaColeccionRepositorio } from "@/compartido/infraestructura/carpeta/CarpetaColeccionRepositorio";
import type { CarpetaDelProyecto } from "@/compartido/infraestructura/carpeta/CarpetaDelProyecto";
import type { Efecto } from "../../dominio/Efecto";
import type { EfectoRepositorio } from "../../dominio/EfectoRepositorio";
import { EfectoMapper, type EfectoDto } from "../EfectoDto";

/** Todos los efectos en `fx/fx.json` de la carpeta elegida. */
export class CarpetaEfectoRepositorio extends CarpetaColeccionRepositorio<Efecto, EfectoDto> implements EfectoRepositorio {
  constructor(carpeta: CarpetaDelProyecto) {
    super(carpeta, ["fx", "fx.json"], EfectoMapper, (e) => e.clave);
  }
}
