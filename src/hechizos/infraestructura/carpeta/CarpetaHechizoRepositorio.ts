import { CarpetaColeccionRepositorio } from "@/compartido/infraestructura/carpeta/CarpetaColeccionRepositorio";
import type { CarpetaDelProyecto } from "@/compartido/infraestructura/carpeta/CarpetaDelProyecto";
import type { Hechizo } from "../../dominio/Hechizo";
import type { HechizoRepositorio } from "../../dominio/HechizoRepositorio";
import { HechizoMapper, type HechizoDto } from "../HechizoDto";

/** Todos los hechizos en `hechizos/hechizos.json` de la carpeta elegida. */
export class CarpetaHechizoRepositorio extends CarpetaColeccionRepositorio<Hechizo, HechizoDto> implements HechizoRepositorio {
  constructor(carpeta: CarpetaDelProyecto) {
    super(carpeta, ["hechizos", "hechizos.json"], HechizoMapper, (h) => h.clave);
  }
}
