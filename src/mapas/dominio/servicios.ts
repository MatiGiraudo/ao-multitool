import type { CatalogoPorNumero } from "@/compartido/dominio/CatalogoPorNumero";
import type { Problema } from "@/compartido/dominio/Problema";
import { Mapa } from "./Mapa";

/**
 * Los catálogos que el validador necesita para revisar un mapa.
 *
 * Son cuatro puertos del mismo tipo y ninguno trae entidades: sólo números y nombres. Así este
 * dominio puede decir «el NPC 25 no existe» sin saber que existen los módulos NPCs, Objetos o
 * Importación.
 */
export interface CatalogosDelMapa {
  npcs: CatalogoPorNumero;
  objetos: CatalogoPorNumero;
  /** Los otros mapas del proyecto, para saber si un traslado lleva a alguna parte. */
  mapas: CatalogoPorNumero;
  /** Los números de GRH que la tabla conoce: sin eso, la celda no se dibuja ni acá ni en el juego. */
  graficos: CatalogoPorNumero;
}

/*
 * Lo que se revisa, y lo que no.
 *
 * Cada chequeo se midió antes contra los 317 mapas de Alkon, porque un diagnóstico que marca lo
 * normal es peor que no tener diagnóstico: se ignora entero. De ahí salieron dos descartes:
 *
 * - **Celdas sin piso**: 252.423 en 45 de los 317 mapas. Son los bordes negros de los dungeons,
 *   o sea el diseño, no un olvido.
 * - **Objetos en celda bloqueada**: 18.032 de 19.499. Es lo habitual —el objeto decora un árbol o
 *   una pared—, así que marcarlo sería marcar casi todos los objetos del mundo.
 *
 * Los que quedaron no aparecen nunca en esos mapas: cero traslados con destino fuera del mapa,
 * cero a un mapa inexistente, cero NPCs parados sobre una celda sin piso.
 */
export const ValidadorDeMapas = {
  problemas(mapa: Mapa, catalogos: CatalogosDelMapa): Problema[] {
    const out: Problema[] = [];
    const error = (mensaje: string) => out.push({ gravedad: "error", mensaje });
    const aviso = (mensaje: string) => out.push({ gravedad: "aviso", mensaje });
    const { capas, traslados, npcs, objetos } = mapa.datosCrudos();

    if (!mapa.info.nombre.trim()) aviso("Sin nombre");

    const aMapaInexistente = new Set<number>();
    let destinoFuera = 0;
    for (const destino of traslados.values()) {
      if (!catalogos.mapas.buscar(destino.mapa)) aMapaInexistente.add(destino.mapa);
      else if (!Mapa.dentro(destino.x, destino.y)) destinoFuera++;
    }
    if (aMapaInexistente.size) error(`Traslados a mapas que no están en el proyecto: ${[...aMapaInexistente].sort((a, b) => a - b).join(", ")}`);
    if (destinoFuera) error(`${destinoFuera} ${plural(destinoFuera, "traslado cae", "traslados caen")} fuera del mapa de destino`);

    const npcsQueNoExisten = new Set<number>();
    let npcSinPiso = 0;
    for (const [celda, numero] of npcs) {
      if (!catalogos.npcs.buscar(numero)) npcsQueNoExisten.add(numero);
      if (!capas[0]![celda]) npcSinPiso++;
    }
    if (npcsQueNoExisten.size) error(`NPCs que no existen: ${[...npcsQueNoExisten].sort((a, b) => a - b).join(", ")}`);
    if (npcSinPiso) aviso(`${npcSinPiso} ${plural(npcSinPiso, "NPC está", "NPCs están")} sobre una celda sin piso`);

    const objetosQueNoExisten = new Set<number>();
    for (const puesto of objetos.values()) if (!catalogos.objetos.buscar(puesto.objeto)) objetosQueNoExisten.add(puesto.objeto);
    if (objetosQueNoExisten.size) error(`Objetos que no existen: ${[...objetosQueNoExisten].sort((a, b) => a - b).join(", ")}`);

    // Si la tabla de GRH está vacía no se dice nada: el proyecto todavía no importó gráficos y
    // marcar los 600 del mapa no ayudaría a nadie.
    if (catalogos.graficos.todos().length) {
      const sinResolver = [...mapa.graficosUsados()].filter((grh) => !catalogos.graficos.buscar(grh));
      if (sinResolver.length) {
        const primeros = sinResolver.slice(0, 8).join(", ");
        error(`${sinResolver.length} ${plural(sinResolver.length, "gráfico no está", "gráficos no están")} en la tabla de GRH: ${primeros}${sinResolver.length > 8 ? "…" : ""}`);
      }
    }

    return out;
  },
};

function plural(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}
