import { CarpetaColeccionRepositorio } from "@/compartido/infraestructura/carpeta/CarpetaColeccionRepositorio";
import type { CarpetaDelProyecto } from "@/compartido/infraestructura/carpeta/CarpetaDelProyecto";
import type { Npc } from "../../dominio/Npc";
import type { NpcRepositorio } from "../../dominio/NpcRepositorio";
import { NpcMapper, type NpcDto } from "../NpcDto";

/** Todos los NPCs en `npcs/npcs.json` de la carpeta elegida. */
export class CarpetaNpcRepositorio extends CarpetaColeccionRepositorio<Npc, NpcDto> implements NpcRepositorio {
  constructor(carpeta: CarpetaDelProyecto) {
    super(carpeta, ["npcs", "npcs.json"], NpcMapper, (n) => n.clave);
  }
}
