import { catalogoDe, type CatalogoPorNumero } from "@/compartido/dominio/CatalogoPorNumero";
import type { Npc } from "../dominio/Npc";

/**
 * Los NPCs vistos como catálogo por número, para quien los apunte.
 * Hoy lo va a usar Mapas, que coloca NPCs en el terreno.
 */
export function catalogoDeNpcs(npcs: readonly Npc[]): CatalogoPorNumero {
  return catalogoDe(npcs.map((n) => ({ numero: n.numero, nombre: n.nombre })));
}
