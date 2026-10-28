import type { Direccion } from "@/compartido/dominio/Direccion";
import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import type { ArchivoDeAparienciasClasicas, LectorDeAparienciasClasicas } from "../aplicacion/puertos";
import { ArchivoIni } from "./LectorIni";

/**
 * El orden de las direcciones en los archivos del clásico, tal como las numera el cliente
 * (en Declares.bas: NORTH = 1, EAST = 2, SOUTH = 3, WEST = 4). Es el mismo para cuerpos, cabezas,
 * cascos, armas y escudos, así que alcanza con esta tabla y el prefijo de la clave.
 */
const DIRECCION_DE_AO: readonly Direccion[] = ["norte", "este", "sur", "oeste"];

/**
 * Lee los índices de apariencias del AO clásico, que son todos el mismo archivo con otros nombres:
 *
 *     [BODY1]                    [HEAD1]
 *     Walk1=4582  arriba         Head1=3003  arriba
 *     Walk2=4584  derecha        Head2=3001  derecha
 *     Walk3=4581  abajo          Head3=3000  abajo
 *     Walk4=4583  izq            Head4=3002  izq
 *     HeadOffsetX=0
 *     HeadOffsetY=-4
 *
 * Por eso es una sola clase parametrizada: ("body", "Walk") lee el archivo de cuerpos y
 * ("head", "Head") lee tanto Cabezas.ini como Cascos.ini.
 *
 * Ojo con cuál es el archivo de cuerpos: el cliente carga Personajes.ind (ver CargarCuerpos en
 * modCarga.bas), que se genera desde Personajes.ini. El Cuerpos.ini que también anda dando vueltas
 * es un sobrante de otra versión y está corrido — en la mayoría de sus entradas el HeadOffsetX
 * tiene adentro un número de GRH.
 */
export class LectorAparienciasIni implements LectorDeAparienciasClasicas {
  constructor(
    private readonly prefijoDeSeccion: string,
    private readonly prefijoDeClave: string,
    /** Cómo se llama el archivo, sólo para el mensaje de error. */
    private readonly archivo: string,
  ) {}

  leer(texto: string): ArchivoDeAparienciasClasicas {
    const ini = ArchivoIni.parsear(texto);
    const secciones = ini.numeradas(this.prefijoDeSeccion);
    if (!secciones.length) {
      throw new ErrorDeDominio(
        `No encontré ninguna sección [${this.prefijoDeSeccion.toUpperCase()}n]: ¿seguro que es un ${this.archivo}?`,
      );
    }

    const apariencias = secciones.map(({ seccion, numero }) => {
      const grhPorDireccion: Partial<Record<Direccion, number>> = {};
      DIRECCION_DE_AO.forEach((direccion, i) => {
        const grh = ini.entero(seccion, `${this.prefijoDeClave}${i + 1}`);
        if (grh > 0) grhPorDireccion[direccion] = grh;
      });
      return {
        numero,
        grhPorDireccion,
        offsetCabezaX: ini.entero(seccion, "HeadOffsetX"),
        offsetCabezaY: ini.entero(seccion, "HeadOffsetY"),
        crudo: ini.lineasDe(seccion).join("\r\n"),
      };
    });
    return { apariencias, encabezado: ini.encabezado(this.prefijoDeSeccion).join("\r\n") };
  }
}
