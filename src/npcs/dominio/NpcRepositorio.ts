import type { ColeccionRepositorio } from "@/compartido/dominio/ColeccionRepositorio";
import type { Npc } from "./Npc";

/** Puerto de persistencia de los NPCs. */
export type NpcRepositorio = ColeccionRepositorio<Npc>;
