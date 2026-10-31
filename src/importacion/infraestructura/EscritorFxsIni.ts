import type { Efecto } from "@/fx/dominio/Efecto";
import type { EscritorDeEfectosClasicos, GrhPorNumero } from "../aplicacion/puertos";
import { ENCABEZADO, type OriginalesDeFamilia } from "../dominio/OriginalesRepositorio";
import { armarIni, reescribirSeccion, type ClavesPropias } from "./EscritorIni";

/**
 * Devuelve el `Fxs.ini` con lo editado escrito encima del original.
 *
 * Las tres claves que tiene un FX vuelven las tres: el `Animacion`, que es el número de GRH del
 * gráfico, y los dos corrimientos. El número no lo saca de acá el escritor —el editor guarda «tal
 * hoja, tal animación», no un número—, sino que se lo da resuelto el caso de uso, que es quien
 * tiene la tabla de GRH y las hojas.
 *
 * Un FX cuyo gráfico no se pudo resolver no entra en ese mapa, y entonces su `Animacion` queda
 * como estaba: es mejor dejarle al cliente el gráfico que ya tenía que escribirle un 0.
 */
export class EscritorFxsIni implements EscritorDeEfectosClasicos {
  escribir(efectos: readonly Efecto[], originales: OriginalesDeFamilia, grhPorEfecto: GrhPorNumero): string {
    const ordenados = [...efectos].sort((a, b) => a.numero - b.numero);
    const secciones = ordenados.map((efecto) => {
      const original = originales[efecto.numero];
      const lineas = original ? original.split(/\r?\n/) : [`[FX${efecto.numero}]`];
      const claves: ClavesPropias = {
        Animacion: grhPorEfecto.get(efecto.numero) ?? null,
        OffsetX: efecto.offsetX,
        OffsetY: efecto.offsetY,
      };
      const reescrita = reescribirSeccion(lineas, claves);
      return original ? reescrita : [...reescrita, ""];
    });
    const encabezado = originales[ENCABEZADO];
    return armarIni(secciones, encabezado ? encabezado.split(/\r?\n/) : [`[INIT]`, `NumFxs=${ordenados.at(-1)?.numero ?? 0}`, ""]);
  }
}
