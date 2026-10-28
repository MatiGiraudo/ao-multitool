import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import type { ArchivoDeEfectosClasicos, LectorDeEfectosClasicos } from "../aplicacion/puertos";
import { ArchivoIni } from "./LectorIni";

/**
 * Lee el Fxs.ini del AO clásico, que es el más chico de todos:
 *
 *     [FX1]
 *     Animacion=115     ← el GRH animado que se dibuja
 *     OffsetX=0
 *     OffsetY=32
 *
 * No trae nombre ni repeticiones: el clásico reproduce el FX una vez y listo. El nombre lo pone el
 * importador, y las repeticiones quedan en 1, que es lo que hace el cliente.
 */
export class LectorFxsIni implements LectorDeEfectosClasicos {
  leer(texto: string): ArchivoDeEfectosClasicos {
    const ini = ArchivoIni.parsear(texto);
    const secciones = ini.numeradas("fx");
    if (!secciones.length) throw new ErrorDeDominio("No encontré ninguna sección [FXn]: ¿seguro que es un Fxs.ini?");

    const efectos = secciones.map(({ seccion, numero }) => ({
      numero,
      grh: ini.entero(seccion, "Animacion"),
      offsetX: ini.entero(seccion, "OffsetX"),
      offsetY: ini.entero(seccion, "OffsetY"),
      crudo: ini.lineasDe(seccion).join("\r\n"),
    }));
    return { efectos, encabezado: ini.encabezado("fx").join("\r\n") };
  }
}
