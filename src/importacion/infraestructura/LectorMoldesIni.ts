import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import type { LectorDeMoldesClasicos } from "../aplicacion/puertos";
import { DIRECCION_DE_MOLDE, type Molde, type MoldesDeCuerpos } from "../dominio/moldes";
import { ArchivoIni } from "./LectorIni";

/**
 * Lee el `moldes.ini` del AO20, que es el archivo más chico de todos y el que le falta al
 * `cuerpos.dat` para poder dibujarse:
 *
 *     [Molde1]
 *     X=0               ← desde dónde empieza el molde en la hoja
 *     Y=0
 *     Width=27          ← cuánto mide un cuadro
 *     Height=47
 *     Dir1=6            ← cuántos cuadros tiene cada dirección (ver DIRECCION_DE_MOLDE)
 *     Dir2=6
 *     Dir3=5
 *     Dir4=5
 *
 * No se guarda en el proyecto, y no es un olvido: lo único que hace falta de un molde son los
 * recortes que produce, y ésos quedan en las animaciones de la hoja en cuanto se importa el
 * `cuerpos.dat`. De vuelta tampoco se necesita: un cuerpo editado vuelve con sus `Walk1..4`.
 */
export class LectorMoldesIni implements LectorDeMoldesClasicos {
  leer(texto: string): MoldesDeCuerpos {
    const ini = ArchivoIni.parsear(texto);
    const secciones = ini.numeradas("molde");
    if (!secciones.length) throw new ErrorDeDominio("No encontré ninguna sección [Molden]: ¿seguro que es un moldes.ini?");

    const moldes = new Map<number, Molde>();
    for (const { seccion, numero } of secciones) {
      moldes.set(numero, {
        x: ini.entero(seccion, "X"),
        y: ini.entero(seccion, "Y"),
        ancho: ini.entero(seccion, "Width"),
        alto: ini.entero(seccion, "Height"),
        cuadrosPorFila: DIRECCION_DE_MOLDE.map((_, i) => ini.entero(seccion, `Dir${i + 1}`)),
      });
    }
    return moldes;
  }
}
