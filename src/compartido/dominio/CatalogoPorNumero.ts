/**
 * Puerto: mirar otra familia de entidades por su número de AO, sin conocer su módulo.
 *
 * Un hechizo apunta a un FX por número, igual que en el juego; un NPC va a apuntar a un cuerpo,
 * a una cabeza y a los objetos que suelta. Todos necesitan lo mismo y nada más que esto: saber si
 * ese número existe, cómo se llama, y poder listar las opciones para elegir en una ficha.
 *
 * Quien implementa el puerto es el módulo DUEÑO de los datos (FX, Apariencias, Objetos), igual que
 * Gráficos implementa `CatalogoGrafico`. Así ningún módulo importa a otro.
 */
export interface ItemDelCatalogo {
  numero: number;
  nombre: string;
}

export interface CatalogoPorNumero {
  buscar(numero: number): ItemDelCatalogo | null;
  todos(): ItemDelCatalogo[];
}

/** Catálogo vacío, para cuando el módulo dueño todavía no está montado. */
export const CATALOGO_VACIO: CatalogoPorNumero = {
  buscar: () => null,
  todos: () => [],
};

/** Implementación directa a partir de cualquier lista de entidades con número y nombre. */
export function catalogoDe(items: readonly ItemDelCatalogo[]): CatalogoPorNumero {
  const porNumero = new Map(items.map((i) => [i.numero, { numero: i.numero, nombre: i.nombre }]));
  return {
    buscar: (n) => porNumero.get(n) ?? null,
    todos: () => [...porNumero.values()].sort((a, b) => a.numero - b.numero),
  };
}
