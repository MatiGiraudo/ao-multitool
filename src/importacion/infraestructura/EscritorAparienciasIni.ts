import type { Apariencia } from "@/apariencias/dominio/Apariencia";
import type { EscritorDeAparienciasClasicas } from "../aplicacion/puertos";
import { ENCABEZADO, type OriginalesDeFamilia } from "../dominio/OriginalesRepositorio";
import { armarIni, reescribirSeccion, type ClavesPropias } from "./EscritorIni";

/**
 * Devuelve el `Personajes.ini` o el `Cabezas.ini` con lo editado encima del original.
 *
 * Igual que con los FX: los `Walk1..4` (o `Head1..4`) son números de GRH y el editor guarda
 * referencias a animaciones del proyecto, así que esos vuelven como vinieron. Lo que sí escribe
 * son los corrimientos de la cabeza, que es el dato que no se puede cargar a mano y para el que
 * existe la vista previa del personaje.
 *
 * Es una sola clase parametrizada, como el lector: `("BODY")` para los cuerpos, `("HEAD")` para
 * las cabezas y los cascos.
 */
export class EscritorAparienciasIni implements EscritorDeAparienciasClasicas {
  constructor(
    private readonly prefijoDeSeccion: string,
    private readonly nombreDelTotal: string,
  ) {}

  escribir(apariencias: readonly Apariencia[], originales: OriginalesDeFamilia): string {
    const ordenadas = [...apariencias].sort((a, b) => a.numero - b.numero);
    const secciones = ordenadas.map((apariencia) => {
      const original = originales[apariencia.numero];
      const lineas = original ? original.split(/\r?\n/) : [`[${this.prefijoDeSeccion}${apariencia.numero}]`];
      // Sólo los cuerpos tienen corrimiento de cabeza; una cabeza no lleva otra encima.
      const conOffset = apariencia as Apariencia & { offsetCabezaX?: number; offsetCabezaY?: number };
      const claves: ClavesPropias =
        conOffset.offsetCabezaX === undefined
          ? {}
          : { HeadOffsetX: conOffset.offsetCabezaX, HeadOffsetY: conOffset.offsetCabezaY ?? 0 };
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
