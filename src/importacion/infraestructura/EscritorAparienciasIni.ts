import type { Apariencia } from "@/apariencias/dominio/Apariencia";
import type { EscritorDeAparienciasClasicas, GrhPorDireccionYNumero } from "../aplicacion/puertos";
import { DIRECCION_DE_AO } from "../dominio/direcciones";
import { ENCABEZADO, type OriginalesDeFamilia } from "../dominio/OriginalesRepositorio";
import { armarIni, reescribirSeccion, type ClavesPropias } from "./EscritorIni";

/**
 * Devuelve el `Personajes.ini` o el `Cabezas.ini` con lo editado encima del original.
 *
 * Vuelven las dos cosas que el editor maneja: los cuatro gráficos —los `Walk1..4` de un cuerpo,
 * los `Head1..4` de una cabeza— y, en los cuerpos, dónde se apoya la cabeza. Los números de GRH
 * llegan resueltos desde el caso de uso; la dirección que no se pudo resolver no entra en el mapa
 * y su línea queda como estaba, en vez de dejar al personaje sin gráfico para ese lado.
 *
 * Es una sola clase parametrizada, como el lector: `("BODY", "Walk")` para los cuerpos,
 * `("HEAD", "Head")` para las cabezas y los cascos.
 */
export class EscritorAparienciasIni implements EscritorDeAparienciasClasicas {
  constructor(
    private readonly prefijoDeSeccion: string,
    private readonly prefijoDeClave: string,
    private readonly nombreDelTotal: string,
  ) {}

  escribir(apariencias: readonly Apariencia[], originales: OriginalesDeFamilia, grhPorApariencia: GrhPorDireccionYNumero): string {
    const ordenadas = [...apariencias].sort((a, b) => a.numero - b.numero);
    const secciones = ordenadas.map((apariencia) => {
      const original = originales[apariencia.numero];
      const lineas = original ? original.split(/\r?\n/) : [`[${this.prefijoDeSeccion}${apariencia.numero}]`];
      const porDireccion = grhPorApariencia.get(apariencia.numero);
      const claves: ClavesPropias = {};
      DIRECCION_DE_AO.forEach((direccion, i) => {
        claves[`${this.prefijoDeClave}${i + 1}`] = porDireccion?.[direccion] ?? null;
      });
      // Sólo los cuerpos tienen corrimiento de cabeza; una cabeza no lleva otra encima.
      const conOffset = apariencia as Apariencia & { offsetCabezaX?: number; offsetCabezaY?: number };
      if (conOffset.offsetCabezaX !== undefined) {
        claves.HeadOffsetX = conOffset.offsetCabezaX;
        claves.HeadOffsetY = conOffset.offsetCabezaY ?? 0;
      }
      const reescrita = reescribirSeccion(lineas, claves);
      return original ? reescrita : [...reescrita, ""];
    });
    const encabezado = originales[ENCABEZADO];
    return armarIni(
      secciones,
      encabezado ? encabezado.split(/\r?\n/) : [`[INIT]`, `${this.nombreDelTotal}=${ordenadas.at(-1)?.numero ?? 0}`, ""],
    );
  }
}
