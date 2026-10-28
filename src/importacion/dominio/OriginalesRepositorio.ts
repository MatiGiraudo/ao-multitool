/*
 * El texto original de cada entrada de los archivos del AO clásico.
 *
 * El editor traduce lo que importa: de las 90 claves que tiene un `OBJ.dat` de verdad entiende
 * unas veinte, que son las que el remake necesita. Eso alcanza para editar, pero no para devolver
 * el archivo: exportar sólo lo que el editor sabe le sacaría al servidor el ropaje, los sonidos,
 * las clases prohibidas y los requisitos de herrería de los 1.239 objetos.
 *
 * Por eso al importar se guarda, aparte, el texto tal como vino. Al exportar, el escritor cambia
 * únicamente las claves que el editor maneja y deja las demás intactas.
 *
 * Va aparte y no adentro de cada entidad a propósito: es un pedazo del archivo del clásico, no
 * parte del objeto; sólo existe para lo que se importó; y metido en `objetos.json` ensuciaría el
 * diff de cada cambio con cientos de kilobytes que nunca se editan.
 */

/** Cada archivo del clásico que el editor sabe leer y devolver. */
export type FamiliaClasica = "obj" | "npcs" | "hechizos" | "fxs" | "cuerpos" | "cabezas";

/**
 * Dónde se guarda el encabezado del archivo, que no pertenece a ninguna entrada.
 *
 * Los números del clásico empiezan en 1, así que el 0 está libre. En un `OBJ.dat` ese encabezado
 * es la tabla de tipos comentada que trae arriba de todo, más la sección `[INIT]`: no son objetos,
 * pero son parte del archivo y la documentación para quien lo abra.
 */
export const ENCABEZADO = 0;

/** El texto de cada entrada, por su número en el archivo. */
export type OriginalesDeFamilia = Record<number, string>;

export interface OriginalesRepositorio {
  leer(familia: FamiliaClasica): Promise<OriginalesDeFamilia>;
  guardar(familia: FamiliaClasica, entradas: OriginalesDeFamilia): Promise<void>;
}

/** Para cuando no hay nada guardado: exportar sigue funcionando, con lo que el editor sabe. */
export const SIN_ORIGINALES: OriginalesRepositorio = {
  leer: async () => ({}),
  guardar: async () => undefined,
};
