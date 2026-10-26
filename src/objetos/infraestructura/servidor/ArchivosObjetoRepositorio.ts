import "server-only";
import { carpetaDeDatos } from "@/compartido/infraestructura/carpetaDeDatos";
import { ArchivosColeccionRepositorio } from "@/compartido/infraestructura/servidor/ArchivosColeccionRepositorio";
import type { Objeto } from "../../dominio/Objeto";
import type { ObjetoRepositorio } from "../../dominio/ObjetoRepositorio";
import { ObjetoMapper, type ObjetoDto } from "../ObjetoDto";

/** Todos los objetos en un solo archivo `data/objetos/objetos.json`, ordenados por ID. */
export class ArchivosObjetoRepositorio extends ArchivosColeccionRepositorio<Objeto, ObjetoDto> implements ObjetoRepositorio {
  constructor(ruta = carpetaDeDatos("objetos", "objetos.json")) {
    super(ruta, ObjetoMapper, (o) => o.clave);
  }
}
