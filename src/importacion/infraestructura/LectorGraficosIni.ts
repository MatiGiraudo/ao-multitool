import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import type { LectorDeGraficosClasicos } from "../aplicacion/puertos";
import type { Grh } from "../dominio/TablaDeGrh";
import { ArchivoIni } from "./LectorIni";

/**
 * Lee el `Graficos.ini` del AO clásico, que define cada GRH.
 *
 * Hay dos formatos dando vueltas y los clientes no avisan cuál usan, así que se aceptan los dos:
 * si hay secciones `[GrhN]` se lee eso, y si no se buscan las claves `GrhN=` de una línea.
 *
 * **Una sección por GRH**, el del AO original:
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
 *
 * **Una línea por GRH**, el de los clientes nuevos (todo junto en `[Graphics]`, separado por
 * guiones y en el mismo orden):
 *
 *     [Graphics]
 *     Grh1=1-12-0-0-32-64                  ← NumFrames-FileNum-sX-sY-ancho-alto
 *     Grh505=6-499-500-501-502-503-504-360 ← NumFrames-Frame1…FrameN-Speed
 */
export class LectorGraficosIni implements LectorDeGraficosClasicos {
  leer(texto: string): Grh[] {
    const ini = ArchivoIni.parsear(texto);

    const porSeccion = ini.numeradas("grh");
    if (porSeccion.length) return porSeccion.map(({ seccion, numero }) => deSeccion(ini, seccion, numero));

    const enUnaLinea = ini.clavesNumeradas("grh");
    if (enUnaLinea.length) return enUnaLinea.map(({ numero, valor }) => deUnaLinea(numero, valor));

    throw new ErrorDeDominio("No encontré ningún GRH: ni secciones [GrhN] ni claves GrhN= en [Graphics]. ¿Seguro que es un Graficos.ini?");
  }
}

function deSeccion(ini: ArchivoIni, seccion: string, numero: number): Grh {
  const cantidad = ini.entero(seccion, "NumFrames", 1);
  if (cantidad > 1) {
    const cuadros: number[] = [];
    for (let i = 1; i <= cantidad; i++) {
      const n = ini.entero(seccion, `Frame${i}`);
      if (n > 0) cuadros.push(n);
    }
    return { numero, archivo: "", x: 0, y: 0, ancho: 0, alto: 0, cuadros, msDelCiclo: ini.entero(seccion, "Speed") };
  }
  return {
    numero,
    archivo: ini.texto(seccion, "FileNum").trim(),
    x: ini.entero(seccion, "sX"),
    y: ini.entero(seccion, "sY"),
    ancho: aPixeles(ini.entero(seccion, "Tile_Ancho", 1)),
    alto: aPixeles(ini.entero(seccion, "Tile_Alto", 1)),
    cuadros: [],
    msDelCiclo: 0,
  };
}

/**
 * El GRH de una línea. Los campos van siempre en el mismo orden, así que alcanza con partir por
 * el guión y leerlos por posición, perdonando basura y campos de menos.
 *
 * Ojo con el tamaño: acá viene **en píxeles**, no en tiles (un sprite de 11×30 no se escribe en
 * tiles), así que no pasa por `aPixeles`.
 */
function deUnaLinea(numero: number, valor: string): Grh {
  const campos = valor.split("-");
  const campo = (i: number, porDefecto = 0): number => {
    const n = Number.parseInt((campos[i] ?? "").trim(), 10);
    return Number.isFinite(n) ? n : porDefecto;
  };

  const cantidad = campo(0, 1);
  if (cantidad > 1) {
    const cuadros = campos.slice(1, 1 + cantidad).map((_, i) => campo(1 + i)).filter((n) => n > 0);
    return { numero, archivo: "", x: 0, y: 0, ancho: 0, alto: 0, cuadros, msDelCiclo: campo(1 + cantidad) };
  }
  return {
    numero,
    archivo: campos.length > 1 ? String(campo(1)) : "",
    x: campo(2),
    y: campo(3),
    ancho: Math.max(1, campo(4, 32)),
    alto: Math.max(1, campo(5, 32)),
    cuadros: [],
    msDelCiclo: 0,
  };
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
