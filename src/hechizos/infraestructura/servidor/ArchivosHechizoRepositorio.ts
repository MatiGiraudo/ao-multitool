import "server-only";
import { carpetaDeDatos } from "@/compartido/infraestructura/carpetaDeDatos";
import { ArchivosColeccionRepositorio } from "@/compartido/infraestructura/servidor/ArchivosColeccionRepositorio";
import type { Hechizo } from "../../dominio/Hechizo";
import type { HechizoRepositorio } from "../../dominio/HechizoRepositorio";
import { HechizoMapper, type HechizoDto } from "../HechizoDto";

/** Todos los hechizos en `data/hechizos/hechizos.json`, ordenados por ID. */
export class ArchivosHechizoRepositorio extends ArchivosColeccionRepositorio<Hechizo, HechizoDto> implements HechizoRepositorio {
  constructor(ruta = carpetaDeDatos("hechizos", "hechizos.json")) {
    super(ruta, HechizoMapper, (h) => h.clave);
  }
}
