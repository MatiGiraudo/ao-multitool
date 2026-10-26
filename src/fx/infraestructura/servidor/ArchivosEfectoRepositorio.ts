import "server-only";
import { carpetaDeDatos } from "@/compartido/infraestructura/carpetaDeDatos";
import { ArchivosColeccionRepositorio } from "@/compartido/infraestructura/servidor/ArchivosColeccionRepositorio";
import type { Efecto } from "../../dominio/Efecto";
import type { EfectoRepositorio } from "../../dominio/EfectoRepositorio";
import { EfectoMapper, type EfectoDto } from "../EfectoDto";

/** Todos los efectos en un solo archivo `data/fx/fx.json`, ordenados por ID. */
export class ArchivosEfectoRepositorio extends ArchivosColeccionRepositorio<Efecto, EfectoDto> implements EfectoRepositorio {
  constructor(ruta = carpetaDeDatos("fx", "fx.json")) {
    super(ruta, EfectoMapper, (e) => e.clave);
  }
}
