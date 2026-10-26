import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import type { LectorDeGraficosClasicos } from "../aplicacion/puertos";
import type { Grh } from "../dominio/TablaDeGrh";
import { ArchivoIni } from "./LectorIni";

/**
 * Lee el `Graficos.ini` del AO clásico, que define cada GRH:
 *
 *     [Grh1]            ← estático: un recorte de un archivo
 *     NumFrames=1
 *     FileNum=12
 *     sX=0
 *     sY=0
 *     Tile_Ancho=1
 *     Tile_Alto=2
 *
 *     [Grh505]          ← animado: una lista de GRH estáticos y cuánto dura el ciclo
 *     NumFrames=6
 *     Frame1=499
 *     ...
 *     Speed=360
 */
export class LectorGraficosIni implements LectorDeGraficosClasicos {
  leer(texto: string): Grh[] {
    const ini = ArchivoIni.parsear(texto);
    const secciones = ini.numeradas("grh");
    if (!secciones.length) throw new ErrorDeDominio("No encontré ninguna sección [GrhN]: ¿seguro que es un Graficos.ini?");

    const out: Grh[] = [];
    for (const { seccion, numero } of secciones) {
      const cantidad = ini.entero(seccion, "NumFrames", 1);
      if (cantidad > 1) {
        const cuadros: number[] = [];
        for (let i = 1; i <= cantidad; i++) {
          const n = ini.entero(seccion, `Frame${i}`);
          if (n > 0) cuadros.push(n);
        }
        out.push({ numero, archivo: "", x: 0, y: 0, ancho: 0, alto: 0, cuadros, msDelCiclo: ini.entero(seccion, "Speed") });
        continue;
      }
      const archivo = ini.texto(seccion, "FileNum").trim();
      out.push({
        numero,
        archivo,
        x: ini.entero(seccion, "sX"),
        y: ini.entero(seccion, "sY"),
        ancho: aPixeles(ini.entero(seccion, "Tile_Ancho", 1)),
        alto: aPixeles(ini.entero(seccion, "Tile_Alto", 1)),
        cuadros: [],
        msDelCiclo: 0,
      });
    }
    return out;
  }
}

/**
 * En el Graficos.ini original el ancho y el alto vienen en TILES de 32 px, pero varios clientes
 * derivados los guardan ya en píxeles. Un tile de más de 16 (512 px) no existe, y un sprite de
 * menos de 17 px de ancho tampoco se escribe en tiles: con eso alcanza para distinguirlos.
 */
function aPixeles(valor: number): number {
  const v = Math.max(1, valor);
  return v <= 16 ? v * 32 : v;
}
