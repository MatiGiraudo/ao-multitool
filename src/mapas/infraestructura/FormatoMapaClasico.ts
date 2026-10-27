import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import { ArchivoIni } from "@/importacion/infraestructura/LectorIni";
import { ALTO, ANCHO, Mapa, type InfoDeMapa } from "../dominio/Mapa";

/*
 * El formato de mapas del AO clásico: tres archivos por mapa.
 *
 *   .map  el terreno: cabecera de 273 bytes y 10.000 celdas, Y por fuera y X por dentro.
 *         Por celda: un byte de banderas, la capa 1 siempre, las capas 2/3/4 sólo si su bandera,
 *         y después trigger y partícula si corresponde.
 *   .inf  lo que se pone encima: traslados, NPCs y objetos, con la misma cabecera de 10 bytes y
 *         el mismo recorrido.
 *   .dat  un INI con el nombre, la música y las reglas de la zona.
 *
 * Dos cosas que el formato no dice y hay que saber:
 *
 * - El número de gráfico puede ocupar 2 bytes (`Integer`) o 4 (`Long`) según de qué cliente
 *   salga el mapa, y la cabecera no lo aclara. Se detecta solo: se lee de las dos formas y vale
 *   la que termina **exactamente** en el fin del archivo. La otra se pasa o deja bytes colgando.
 * - En el `.dat`, `Pk=1` quiere decir que la zona es SEGURA. Está al revés de lo que parece.
 */

const ANCHO_CABECERA = 273;
const LARGO_DESCRIPCION = 255;
const CABECERA_INF = 10;

/** Un mapa listo para escribir en disco, tal como lo espera el juego. */
export interface ArchivosDeMapa {
  map: Uint8Array;
  inf: Uint8Array;
  dat: string;
}

export type AnchoDeGrafico = 2 | 4;

export class FormatoMapaClasico {
  /**
   * Lee los tres archivos de un mapa. El `.dat` es opcional: sin él, el mapa entra igual y se
   * queda con los valores por defecto, que es mejor que no poder abrirlo.
   */
  leer(numero: number, map: ArrayBuffer, inf: ArrayBuffer, dat?: string): { mapa: Mapa; ancho: AnchoDeGrafico } {
    const ancho = this.detectarAncho(map);
    if (!ancho) {
      throw new ErrorDeDominio(
        "El .map no cierra ni leyéndolo con gráficos de 2 bytes ni de 4: puede estar cortado o ser de otro formato.",
      );
    }

    const mapa = Mapa.vacio(numero);
    const bytes = new DataView(map);
    let off = 0;
    const version = bytes.getInt16(off, true);
    off += 2;
    const descripcion = textoFijo(new Uint8Array(map, off, LARGO_DESCRIPCION));
    off += LARGO_DESCRIPCION;
    const crc = bytes.getUint32(off, true);
    off += 4;
    const palabraMagica = bytes.getUint32(off, true);
    off += 4;
    off += 8; // cuatro enteros reservados, siempre en cero
    mapa.conCabeceraOriginal({ version, descripcion, crc, palabraMagica });

    const leerGrafico = (): number => {
      const v = ancho === 2 ? bytes.getInt16(off, true) : bytes.getInt32(off, true);
      off += ancho;
      return v;
    };

    for (let y = 1; y <= ALTO; y++) {
      for (let x = 1; x <= ANCHO; x++) {
        const banderas = bytes.getUint8(off);
        off += 1;
        if (banderas & 1) mapa.bloquear(x, y, true);
        mapa.ponerGrafico(x, y, 1, leerGrafico());
        if (banderas & 2) mapa.ponerGrafico(x, y, 2, leerGrafico());
        if (banderas & 4) mapa.ponerGrafico(x, y, 3, leerGrafico());
        if (banderas & 8) mapa.ponerGrafico(x, y, 4, leerGrafico());
        if (banderas & 16) {
          mapa.ponerTrigger(x, y, bytes.getUint16(off, true));
          off += 2;
        }
        if (banderas & 32) {
          mapa.ponerParticula(x, y, bytes.getUint16(off, true));
          off += 2;
        }
      }
    }

    this.leerInf(mapa, inf);
    if (dat !== undefined) mapa.conInfo(this.leerDat(numero, dat));
    return { mapa, ancho };
  }

  private leerInf(mapa: Mapa, inf: ArrayBuffer): void {
    const bytes = new DataView(inf);
    let off = CABECERA_INF;
    for (let y = 1; y <= ALTO; y++) {
      for (let x = 1; x <= ANCHO; x++) {
        const banderas = bytes.getUint8(off);
        off += 1;
        if (banderas & 1) {
          mapa.ponerTraslado(x, y, {
            mapa: bytes.getInt16(off, true),
            x: bytes.getInt16(off + 2, true),
            y: bytes.getInt16(off + 4, true),
          });
          off += 6;
        }
        if (banderas & 2) {
          mapa.ponerNpc(x, y, bytes.getInt16(off, true));
          off += 2;
        }
        if (banderas & 4) {
          mapa.ponerObjeto(x, y, { objeto: bytes.getInt16(off, true), cantidad: bytes.getInt16(off + 2, true) });
          off += 4;
        }
      }
    }
  }

  /** Lee el `.dat`, que es un INI con una sección por mapa. */
  leerDat(numero: number, texto: string): Partial<InfoDeMapa> {
    const ini = ArchivoIni.parsear(texto);
    const seccion = ini.tiene(`mapa${numero}`) ? `mapa${numero}` : (ini.numeradas("mapa")[0]?.seccion ?? `mapa${numero}`);
    return {
      nombre: ini.texto(seccion, "Name"),
      // Hay mapas con MusicNum, otros con MusicNumMp3, y algunos con los dos.
      musica: ini.entero(seccion, "MusicNum"),
      musicaMp3: ini.entero(seccion, "MusicNumMp3"),
      terreno: ini.texto(seccion, "Terreno") || "BOSQUE",
      zona: ini.texto(seccion, "Zona") || "CAMPO",
      restringir: ini.texto(seccion, "Restringir") || "NO",
      // Acá está la inversión: Pk=1 es zona segura.
      seCombate: ini.entero(seccion, "Pk", 1) === 0,
      magiaSinEfecto: ini.bandera(seccion, "MagiaSinefecto"),
      invisibilidadSinEfecto: ini.bandera(seccion, "InviSinEfecto"),
      resucitarSinEfecto: ini.bandera(seccion, "ResuSinEfecto"),
      noEncriptarMp: ini.bandera(seccion, "NoEncriptarMP"),
      backup: ini.bandera(seccion, "BackUp"),
    };
  }

  /**
   * Escribe los tres archivos.
   *
   * El objetivo es que un mapa importado y exportado salga **idéntico byte a byte**, así que la
   * cabecera se devuelve tal como vino (incluidos el CRC y la palabra mágica) y las banderas se
   * arman con la misma regla con la que se leyeron.
   */
  escribir(mapa: Mapa, ancho: AnchoDeGrafico = 4): ArchivosDeMapa {
    const { capas, bloqueos, triggers, particulas, traslados, npcs, objetos } = mapa.datosCrudos();

    // Primero se mide, después se escribe: así el buffer sale del tamaño exacto y sin copias.
    let largoMap = ANCHO_CABECERA;
    let largoInf = CABECERA_INF;
    for (let i = 0; i < ANCHO * ALTO; i++) {
      largoMap += 1 + ancho;
      for (let c = 1; c < 4; c++) if (capas[c]![i]) largoMap += ancho;
      if (triggers[i]) largoMap += 2;
      if (particulas[i]) largoMap += 2;
      largoInf += 1;
      if (traslados.has(i)) largoInf += 6;
      if (npcs.has(i)) largoInf += 2;
      if (objetos.has(i)) largoInf += 4;
    }

    const map = new Uint8Array(largoMap);
    const vistaMap = new DataView(map.buffer);
    const inf = new Uint8Array(largoInf);
    const vistaInf = new DataView(inf.buffer);

    const cabecera = mapa.cabeceraOriginal;
    let off = 0;
    vistaMap.setInt16(off, cabecera.version, true);
    off += 2;
    map.set(aTextoFijo(cabecera.descripcion, LARGO_DESCRIPCION), off);
    off += LARGO_DESCRIPCION;
    vistaMap.setUint32(off, cabecera.crc, true);
    off += 4;
    vistaMap.setUint32(off, cabecera.palabraMagica, true);
    off += 4;
    off += 8;

    let offInf = CABECERA_INF;
    for (let y = 1; y <= ALTO; y++) {
      for (let x = 1; x <= ANCHO; x++) {
        const i = Mapa.indice(x, y);

        let banderas = 0;
        if (bloqueos[i]) banderas |= 1;
        if (capas[1]![i]) banderas |= 2;
        if (capas[2]![i]) banderas |= 4;
        if (capas[3]![i]) banderas |= 8;
        if (triggers[i]) banderas |= 16;
        if (particulas[i]) banderas |= 32;
        vistaMap.setUint8(off, banderas);
        off += 1;

        const ponerGrafico = (valor: number) => {
          if (ancho === 2) vistaMap.setInt16(off, valor, true);
          else vistaMap.setInt32(off, valor, true);
          off += ancho;
        };
        ponerGrafico(capas[0]![i]!);
        for (let c = 1; c < 4; c++) if (capas[c]![i]) ponerGrafico(capas[c]![i]!);
        if (triggers[i]) {
          vistaMap.setUint16(off, triggers[i]!, true);
          off += 2;
        }
        if (particulas[i]) {
          vistaMap.setUint16(off, particulas[i]!, true);
          off += 2;
        }

        const traslado = traslados.get(i);
        const npc = npcs.get(i);
        const objeto = objetos.get(i);
        let banderasInf = 0;
        if (traslado) banderasInf |= 1;
        if (npc) banderasInf |= 2;
        if (objeto) banderasInf |= 4;
        vistaInf.setUint8(offInf, banderasInf);
        offInf += 1;
        if (traslado) {
          vistaInf.setInt16(offInf, traslado.mapa, true);
          vistaInf.setInt16(offInf + 2, traslado.x, true);
          vistaInf.setInt16(offInf + 4, traslado.y, true);
          offInf += 6;
        }
        if (npc) {
          vistaInf.setInt16(offInf, npc, true);
          offInf += 2;
        }
        if (objeto) {
          vistaInf.setInt16(offInf, objeto.objeto, true);
          vistaInf.setInt16(offInf + 2, objeto.cantidad, true);
          offInf += 4;
        }
      }
    }

    return { map, inf, dat: this.escribirDat(mapa) };
  }

  escribirDat(mapa: Mapa): string {
    const i = mapa.info;
    const lineas = [
      `[MAPA${mapa.numero}]`,
      `Name=${i.nombre}`,
      ...(i.musica ? [`MusicNum=${i.musica}`] : []),
      `MusicNumMp3=${i.musicaMp3}`,
      `MagiaSinefecto=${i.magiaSinEfecto ? 1 : 0}`,
      `InviSinEfecto=${i.invisibilidadSinEfecto ? 1 : 0}`,
      `ResuSinEfecto=${i.resucitarSinEfecto ? 1 : 0}`,
      `NoEncriptarMP=${i.noEncriptarMp ? 1 : 0}`,
      `Terreno=${i.terreno}`,
      `Zona=${i.zona}`,
      `Restringir=${i.restringir}`,
      `BackUp=${i.backup ? 1 : 0}`,
      // De nuevo la inversión: si se combate, el archivo lleva 0.
      `Pk=${i.seCombate ? 0 : 1}`,
    ];
    return lineas.join("\r\n") + "\r\n";
  }

  /** Prueba los dos anchos y se queda con el que consume el archivo entero. */
  detectarAncho(map: ArrayBuffer): AnchoDeGrafico | null {
    for (const ancho of [4, 2] as const) if (this.recorrer(map, ancho) === map.byteLength) return ancho;
    return null;
  }

  /** Recorre el .map sin construir nada y devuelve en qué byte terminó, o -1 si se pasó. */
  private recorrer(map: ArrayBuffer, ancho: AnchoDeGrafico): number {
    if (map.byteLength < ANCHO_CABECERA) return -1;
    const bytes = new DataView(map);
    let off = ANCHO_CABECERA;
    for (let i = 0; i < ANCHO * ALTO; i++) {
      if (off >= map.byteLength) return -1;
      const banderas = bytes.getUint8(off);
      off += 1 + ancho;
      for (const bit of [2, 4, 8]) if (banderas & bit) off += ancho;
      if (banderas & 16) off += 2;
      if (banderas & 32) off += 2;
      if (off > map.byteLength) return -1;
    }
    return off;
  }
}

/** Los textos del formato son ANSI y vienen rellenados con espacios o ceros. */
function textoFijo(bytes: Uint8Array): string {
  const fin = bytes.indexOf(0);
  return new TextDecoder("windows-1252").decode(fin >= 0 ? bytes.subarray(0, fin) : bytes);
}

function aTextoFijo(texto: string, largo: number): Uint8Array {
  const out = new Uint8Array(largo);
  for (let i = 0; i < Math.min(texto.length, largo); i++) {
    const c = texto.charCodeAt(i);
    out[i] = c < 256 ? c : 63; // lo que no entra en un byte va como "?"
  }
  return out;
}
