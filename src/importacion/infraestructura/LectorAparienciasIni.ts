import type { Direccion } from "@/compartido/dominio/Direccion";
import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import type { ArchivoDeAparienciasClasicas, LectorDeAparienciasClasicas } from "../aplicacion/puertos";
import { DIRECCION_DE_AO } from "../dominio/direcciones";
import { recortesDelMolde, type MoldesDeCuerpos } from "../dominio/moldes";
import type { RecortesDeGrh } from "../dominio/TablaDeGrh";
import { ArchivoIni, numeroDeVb } from "./LectorIni";

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
 *
 * El `cuerpos.dat` del AO20 entra por acá también, y es el mismo archivo con una vuelta más: la
 * mayoría de sus cuerpos no traen `Walk1..4` sino `Std` y `FileNum`, que es un molde aplicado a
 * una hoja (ver `dominio/moldes.ts`). Con los moldes a mano se expanden a recortes; sin ellos
 * queda lo que el archivo diga de `Walk`, que en esos cuerpos es nada.
 */
export class LectorAparienciasIni implements LectorDeAparienciasClasicas {
  constructor(
    private readonly prefijoDeSeccion: string,
    private readonly prefijoDeClave: string,
    /** Cómo se llama el archivo, sólo para el mensaje de error. */
    private readonly archivo: string,
  ) {}

  leer(texto: string, moldes?: MoldesDeCuerpos): ArchivoDeAparienciasClasicas {
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
      const molde = ini.entero(seccion, "Std");
      return {
        numero,
        grhPorDireccion,
        ...(molde > 0 ? { molde, recortesPorDireccion: recortesDeSeccion(ini, seccion, molde, moldes) } : {}),
        offsetCabezaX: ini.entero(seccion, "HeadOffsetX"),
        offsetCabezaY: ini.entero(seccion, "HeadOffsetY"),
        crudo: ini.lineasDe(seccion).join("\r\n"),
      };
    });
    return { apariencias, encabezado: ini.encabezado(this.prefijoDeSeccion).join("\r\n") };
  }
}

/** Los recortes de un cuerpo con molde, o nada si falta el molde o la hoja donde aplicarlo. */
function recortesDeSeccion(
  ini: ArchivoIni,
  seccion: string,
  molde: number,
  moldes?: MoldesDeCuerpos,
): Partial<Record<Direccion, RecortesDeGrh>> | undefined {
  const receta = moldes?.get(molde);
  const archivo = ini.entero(seccion, "FileNum");
  if (!receta || archivo <= 0) return undefined;
  return recortesDelMolde(receta, String(archivo), numeroDeVb(ini.texto(seccion, "Speed")));
}
