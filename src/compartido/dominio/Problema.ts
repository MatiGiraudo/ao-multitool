/**
 * Un problema detectado por un validador de dominio.
 *
 * Es vocabulario compartido a propósito: cada módulo escribe su propio validador
 * ("ID repetido", "NPC sin cuerpo"…), pero todos hablan en estos términos, así que la pantalla
 * de diagnóstico puede juntar los problemas de todo el mundo sin conocer a ningún módulo.
 */
export interface Problema {
  gravedad: "error" | "aviso";
  mensaje: string;
}

export const esError = (p: Problema) => p.gravedad === "error";
