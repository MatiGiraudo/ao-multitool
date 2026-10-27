import type { CatalogoPorNumero } from "@/compartido/dominio/CatalogoPorNumero";
import type { Problema } from "@/compartido/dominio/Problema";
import type { Npc } from "./Npc";

/**
 * Los catálogos que el validador necesita para revisar a un NPC.
 *
 * Son cuatro puertos del mismo tipo, y ninguno trae entidades: sólo números y nombres. Así este
 * dominio puede decir "el cuerpo 25 no existe" sin saber que existen los módulos Apariencias,
 * Objetos o Hechizos.
 */
export interface CatalogosDelNpc {
  cuerpos: CatalogoPorNumero;
  cabezas: CatalogoPorNumero;
  objetos: CatalogoPorNumero;
  hechizos: CatalogoPorNumero;
}

export const ValidadorDeNpcs = {
  problemas(npc: Npc, todos: readonly Npc[], catalogos: CatalogosDelNpc): Problema[] {
    const out: Problema[] = [];
    const error = (mensaje: string) => out.push({ gravedad: "error", mensaje });
    const aviso = (mensaje: string) => out.push({ gravedad: "aviso", mensaje });

    if (todos.some((n) => n !== npc && n.clave !== npc.clave && n.numero === npc.numero)) error("ID repetido");
    if (!npc.nombre.trim()) aviso("Sin nombre");

    if (!npc.cuerpo) aviso("Sin cuerpo");
    else if (!catalogos.cuerpos.buscar(npc.cuerpo)) error(`El cuerpo ${npc.cuerpo} no existe`);
    // La cabeza en 0 es válida y común: los animales no tienen una aparte del cuerpo.
    if (npc.cabeza && !catalogos.cabezas.buscar(npc.cabeza)) error(`La cabeza ${npc.cabeza} no existe`);

    const sinHechizo = npc.hechizosVigentes().filter((n) => !catalogos.hechizos.buscar(n));
    if (sinHechizo.length) error(`Hechizos que no existen: ${sinHechizo.join(", ")}`);

    const sinObjeto = [...npc.dropsVigentes(), ...npc.enVentaVigente()].map((x) => x.objeto).filter((n) => !catalogos.objetos.buscar(n));
    if (sinObjeto.length) error(`Objetos que no existen: ${[...new Set(sinObjeto)].join(", ")}`);

    if (npc.tipo.pelea) {
      const { vida, golpeMax } = npc.atributosVigentes();
      if (!Number(vida)) aviso("Sin vida");
      if (!Number(golpeMax)) aviso("Sin golpe");
    }
    if (npc.tipo.comercia && !npc.enVenta.length) aviso("Sin nada para vender");

    return out;
  },
};
