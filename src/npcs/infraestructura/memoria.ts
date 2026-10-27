import { MemoriaColeccionRepositorio } from "@/compartido/infraestructura/memoria";
import type { Npc } from "../dominio/Npc";
import type { NpcRepositorio } from "../dominio/NpcRepositorio";

export class MemoriaNpcRepositorio extends MemoriaColeccionRepositorio<Npc> implements NpcRepositorio {
  constructor() {
    super((n) => n.clave);
  }
}
