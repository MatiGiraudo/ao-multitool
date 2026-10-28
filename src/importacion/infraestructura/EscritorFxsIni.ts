import type { Efecto } from "@/fx/dominio/Efecto";
import type { EscritorDeEfectosClasicos } from "../aplicacion/puertos";
import { ENCABEZADO, type OriginalesDeFamilia } from "../dominio/OriginalesRepositorio";
import { armarIni, reescribirSeccion, type ClavesPropias } from "./EscritorIni";

/**
 * Devuelve el `Fxs.ini` con los corrimientos del editor escritos encima del original.
 *
 * De las tres claves que tiene un FX —`Animacion`, `OffsetX`, `OffsetY`— el editor sólo puede
 * devolver dos. La primera es un número de GRH, y acá el efecto apunta a una animación del
 * proyecto («tal hoja, tal animación»): traducir eso de vuelta a un número pide buscar el recorte
 * en la tabla de GRH, que es un trabajo aparte y todavía no está.
 *
 * Así que `Animacion` vuelve como vino. Lo que sí se escribe son los corrimientos, que es
 * justamente lo que se edita acá: la vista previa del FX sobre el personaje existe para eso.
 */
export class EscritorFxsIni implements EscritorDeEfectosClasicos {
  escribir(efectos: readonly Efecto[], originales: OriginalesDeFamilia): string {
    const ordenados = [...efectos].sort((a, b) => a.numero - b.numero);
    const secciones = ordenados.map((efecto) => {
      const original = originales[efecto.numero];
      const lineas = original ? original.split(/\r?\n/) : [`[FX${efecto.numero}]`];
      const claves: ClavesPropias = { OffsetX: efecto.offsetX, OffsetY: efecto.offsetY };
      const reescrita = reescribirSeccion(lineas, claves);
      return original ? reescrita : [...reescrita, ""];
    });
    const encabezado = originales[ENCABEZADO];
    return armarIni(secciones, encabezado ? encabezado.split(/\r?\n/) : [`[INIT]`, `NumFxs=${ordenados.at(-1)?.numero ?? 0}`, ""]);
  }
}
