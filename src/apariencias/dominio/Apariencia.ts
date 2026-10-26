import type { PorDireccion } from "@/compartido/dominio/PorDireccion";
import type { ReferenciaGrafica } from "@/compartido/dominio/ReferenciaGrafica";

/*
 * Módulo Apariencias: cómo se ve un personaje antes de vestirlo.
 *
 * Son dos entidades, `Cuerpo` y `Cabeza`, que comparten casi todo: un número de AO, un nombre y
 * un gráfico por cada una de las cuatro direcciones. Lo que las diferencia cabe en dos líneas:
 * el cuerpo guarda además dónde se le apoya la cabeza, y la cabeza usa un frame fijo en vez de
 * reproducir la animación entera.
 *
 * Por eso viven en el mismo módulo y comparten este contrato: el validador, los casos de uso y la
 * pantalla trabajan contra `Apariencia`, sin saber cuál de las dos tienen delante.
 */
export interface Apariencia {
  readonly clave: string;
  readonly numero: number;
  readonly nombre: string;
  readonly direcciones: PorDireccion<ReferenciaGrafica>;
  referenciasVigentes(): ReferenciaGrafica[];
}

/** Una referencia tal como viene de un archivo, antes de resolverla contra el catálogo. */
export interface ReferenciaImportada {
  hoja: string;
  animacion: string;
  frame: number;
}

/** Traduce una referencia de archivo a una del dominio (vinculada o pendiente). */
export type ResolverReferencia = (r: ReferenciaImportada | null | undefined) => ReferenciaGrafica | null;

/**
 * Lo que cada especie de apariencia sabe hacer consigo misma.
 *
 * Es lo único que los casos de uso necesitan saber de cuerpos y cabezas, y por eso están escritos
 * una sola vez: `new CrearApariencia(repo, ids, ESPECIE_CUERPO)`.
 */
export interface EspecieDeApariencia<T extends Apariencia, I> {
  /** Para los mensajes de la interfaz: "cuerpo" / "cuerpos". */
  readonly singular: string;
  readonly plural: string;
  crear(clave: string, numero: number): T;
  duplicar(item: T, clave: string, numero: number): T;
  /** Reconstruye la entidad a partir de lo que vino de un archivo. */
  desdeImportado(clave: string, importado: I, resolver: ResolverReferencia): T;
}
