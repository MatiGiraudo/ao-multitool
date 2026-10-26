import type { CatalogoPorNumero } from "@/compartido/dominio/CatalogoPorNumero";
import type { Problema } from "@/compartido/dominio/Problema";
import type { Hechizo } from "./Hechizo";

/*
 * Servicio de dominio: lo que no se puede chequear mirando un hechizo solo.
 *
 * El catálogo de FX llega como puerto (`CatalogoPorNumero`), así que este dominio no sabe que
 * existe el módulo FX: sólo que hay números que pueden existir o no.
 */
export const ValidadorDeHechizos = {
  problemas(hechizo: Hechizo, todos: readonly Hechizo[], fx: CatalogoPorNumero): Problema[] {
    const out: Problema[] = [];
    if (todos.some((h) => h !== hechizo && h.clave !== hechizo.clave && h.numero === hechizo.numero))
      out.push({ gravedad: "error", mensaje: "ID repetido" });
    if (hechizo.fx > 0 && !fx.buscar(hechizo.fx)) out.push({ gravedad: "error", mensaje: "FX inexistente" });
    if (!hechizo.nombre.trim()) out.push({ gravedad: "aviso", mensaje: "Sin nombre" });
    if (!hechizo.palabrasMagicas.trim()) out.push({ gravedad: "aviso", mensaje: "Sin palabras mágicas" });
    if (hechizo.tipo.atributos.length && !Object.keys(hechizo.atributosVigentes()).length)
      out.push({ gravedad: "aviso", mensaje: `Sin datos de ${hechizo.tipo.nombre.toLowerCase()}` });
    if (!hechizo.mana) out.push({ gravedad: "aviso", mensaje: "Sin maná" });
    return out;
  },
};
