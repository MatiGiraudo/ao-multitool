import { HttpColeccionRepositorio } from "@/compartido/infraestructura/navegador/HttpColeccionRepositorio";
import type { Npc } from "../../dominio/Npc";
import type { NpcRepositorio } from "../../dominio/NpcRepositorio";
import { NpcMapper, type NpcDto } from "../NpcDto";

export class HttpNpcRepositorio extends HttpColeccionRepositorio<Npc, NpcDto> implements NpcRepositorio {
  constructor(base = "/api/npcs") {
    super(base, NpcMapper, (n) => n.clave);
  }
}
