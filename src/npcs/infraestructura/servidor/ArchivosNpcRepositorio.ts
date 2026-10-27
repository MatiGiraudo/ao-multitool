import "server-only";
import { carpetaDeDatos } from "@/compartido/infraestructura/carpetaDeDatos";
import { ArchivosColeccionRepositorio } from "@/compartido/infraestructura/servidor/ArchivosColeccionRepositorio";
import type { Npc } from "../../dominio/Npc";
import type { NpcRepositorio } from "../../dominio/NpcRepositorio";
import { NpcMapper, type NpcDto } from "../NpcDto";

/** Todos los NPCs en `data/npcs/npcs.json`, ordenados por ID. */
export class ArchivosNpcRepositorio extends ArchivosColeccionRepositorio<Npc, NpcDto> implements NpcRepositorio {
  constructor(ruta = carpetaDeDatos("npcs", "npcs.json")) {
    super(ruta, NpcMapper, (n) => n.clave);
  }
}
