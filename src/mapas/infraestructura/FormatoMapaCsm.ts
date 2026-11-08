import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import { ALTO, ANCHO, CABECERA_CSM_VACIA, Mapa, type CabeceraCsm } from "../dominio/Mapa";

/*
 * El formato de mapas del AO20: un solo archivo `.csm` en vez del trío `.map` + `.inf` + `.dat`.
 *
 * El clásico guarda las 10.000 celdas una tras otra, tenga o no algo adentro. El `.csm` guarda
 * listas: primero una cabecera con cuántas celdas tienen cada cosa, después el `.dat` del mapa
 * metido adentro del mismo archivo, y por último un bloque por tipo donde cada registro dice su
 * x, su y y lo suyo. Un mapa con dos tiles en la capa 3 ocupa dieciséis bytes de capa 3.
 *
 * El orden de los bloques NO es el de la cabecera, y es el error que uno comete una sola vez: la
 * cabecera cuenta NPCs antes que objetos y luces antes que partículas, pero en el archivo van
 * partículas antes que luces y objetos antes que NPCs (ver `Save_Map_Data` en `ModCargaIAO.bas`
 * del WorldEditor). Acá los dos órdenes están escritos aparte, uno en `CONTADORES` y otro en el
 * recorrido de `leer`.
 *
 * Dos cosas más que el formato no dice:
 *
 * - **Los archivos de verdad traen basura al final.** El WorldEditor abre el `.csm` en binario y
 *   escribe desde el byte cero sin vaciarlo antes, así que si la versión anterior del mapa era
 *   más larga, la cola vieja queda ahí. Se lee lo que la cabecera dice y lo que sobra se ignora;
 *   al escribir no se arrastra.
 * - **Los textos son strings de Visual Basic**: dos bytes con el largo y después los caracteres
 *   en ANSI. Nada de terminador en cero.
 */

/** Los contadores de la cabecera, en el orden en que están ahí (`tMapHeader`). */
const CONTADORES = ["bloqueados", "capa1", "capa2", "capa3", "capa4", "triggers", "luces", "particulas", "npcs", "objetos", "traslados"] as const;

type Contador = (typeof CONTADORES)[number];

const BYTES_DE_CABECERA = CONTADORES.length * 4 + 4 * 2;

export class FormatoMapaCsm {
  /**
   * Lee un `.csm` entero.
   *
   * Si un registro cae fuera del mapa se corta con un error en vez de seguir: quiere decir que la
   * lectura se desalineó, y seguir leyendo sólo llenaría el mapa de basura con forma de tiles.
   */
  leer(numero: number, csm: ArrayBuffer): Mapa {
    const bytes = new DataView(csm);
    const lector = new Lector(bytes, csm.byteLength);

    const cuantos = {} as Record<Contador, number>;
    for (const que of CONTADORES) cuantos[que] = lector.entero();
    const tamanio = { xMax: lector.corto(), xMin: lector.corto(), yMax: lector.corto(), yMin: lector.corto() };

    const mapa = Mapa.vacio(numero);
    const csmDat = lector.mapDat(mapa);
    mapa.conCabeceraCsm({ ...csmDat, tamanio });

    const celda = (): { x: number; y: number } => {
      const x = lector.corto();
      const y = lector.corto();
      if (!Mapa.dentro(x, y)) throw new ErrorDeDominio(`El archivo tiene una celda en ${x}, ${y}, que está fuera del mapa: no es un .csm o está cortado.`);
      return { x, y };
    };

    for (let i = 0; i < cuantos.bloqueados; i++) {
      const { x, y } = celda();
      mapa.ponerLados(x, y, lector.byte());
    }
    for (const [capa, que] of ([1, 2, 3, 4] as const).map((c) => [c, `capa${c}` as Contador] as const)) {
      for (let i = 0; i < cuantos[que]; i++) {
        const { x, y } = celda();
        mapa.ponerGrafico(x, y, capa, lector.entero());
      }
    }
    for (let i = 0; i < cuantos.triggers; i++) {
      const { x, y } = celda();
      mapa.ponerTrigger(x, y, lector.corto());
    }
    for (let i = 0; i < cuantos.particulas; i++) {
      const { x, y } = celda();
      mapa.ponerParticula(x, y, lector.entero());
    }
    for (let i = 0; i < cuantos.luces; i++) {
      const { x, y } = celda();
      mapa.ponerLuz(x, y, { color: lector.entero(), rango: lector.byte() });
    }
    for (let i = 0; i < cuantos.objetos; i++) {
      const { x, y } = celda();
      mapa.ponerObjeto(x, y, { objeto: lector.corto(), cantidad: lector.corto() });
    }
    for (let i = 0; i < cuantos.npcs; i++) {
      const { x, y } = celda();
      mapa.ponerNpc(x, y, lector.corto());
    }
    for (let i = 0; i < cuantos.traslados; i++) {
      const { x, y } = celda();
      mapa.ponerTraslado(x, y, { mapa: lector.corto(), x: lector.corto(), y: lector.corto() });
    }

    return mapa;
  }

  /** El mapa como lo espera el juego. Lo que no entra en el formato se pierde acá y no antes. */
  escribir(mapa: Mapa): Uint8Array {
    const { capas, bloqueos, triggers, particulas, traslados, npcs, objetos, luces } = mapa.datosCrudos();

    /* Se recorre en el orden del WorldEditor —y de celda— porque es lo que hace que un mapa
     * importado y exportado sin tocar nada salga igual al que entró. */
    const celdas: number[] = [];
    for (let y = 1; y <= ALTO; y++) for (let x = 1; x <= ANCHO; x++) celdas.push(Mapa.indice(x, y));

    const conAlgo = (tiene: (i: number) => boolean) => celdas.filter(tiene);
    const bloqueadas = conAlgo((i) => bloqueos[i] !== 0);
    const porCapa = capas.map((capa) => conAlgo((i) => capa[i] !== 0));
    const conTrigger = conAlgo((i) => triggers[i] !== 0);
    const conParticula = conAlgo((i) => particulas[i] !== 0);
    const conLuz = conAlgo((i) => luces.has(i));
    const conObjeto = conAlgo((i) => objetos.has(i));
    const conNpc = conAlgo((i) => npcs.has(i));
    const conTraslado = conAlgo((i) => traslados.has(i));

    const cuantos: Record<Contador, number> = {
      bloqueados: bloqueadas.length,
      capa1: porCapa[0]!.length,
      capa2: porCapa[1]!.length,
      capa3: porCapa[2]!.length,
      capa4: porCapa[3]!.length,
      triggers: conTrigger.length,
      luces: conLuz.length,
      particulas: conParticula.length,
      npcs: conNpc.length,
      objetos: conObjeto.length,
      traslados: conTraslado.length,
    };

    const c = mapa.cabeceraCsm;
    const dat = bytesDelMapDat(mapa, c);
    const largo =
      BYTES_DE_CABECERA +
      dat.length +
      bloqueadas.length * 5 +
      porCapa.reduce((n, lista) => n + lista.length * 8, 0) +
      conTrigger.length * 6 +
      conParticula.length * 8 +
      conLuz.length * 9 +
      conObjeto.length * 8 +
      conNpc.length * 6 +
      conTraslado.length * 10;

    const salida = new Uint8Array(largo);
    const escritor = new Escritor(new DataView(salida.buffer), salida);
    for (const que of CONTADORES) escritor.entero(cuantos[que]);
    for (const n of [c.tamanio.xMax, c.tamanio.xMin, c.tamanio.yMax, c.tamanio.yMin]) escritor.corto(n);
    escritor.bloque(dat);

    const celda = (i: number) => {
      escritor.corto((i % ANCHO) + 1);
      escritor.corto(Math.floor(i / ANCHO) + 1);
    };
    for (const i of bloqueadas) (celda(i), escritor.byte(bloqueos[i]!));
    porCapa.forEach((lista, capa) => {
      for (const i of lista) (celda(i), escritor.entero(capas[capa]![i]!));
    });
    for (const i of conTrigger) (celda(i), escritor.corto(triggers[i]!));
    for (const i of conParticula) (celda(i), escritor.entero(particulas[i]!));
    for (const i of conLuz) {
      celda(i);
      escritor.entero(luces.get(i)!.color);
      escritor.byte(luces.get(i)!.rango);
    }
    for (const i of conObjeto) {
      celda(i);
      escritor.corto(objetos.get(i)!.objeto);
      escritor.corto(objetos.get(i)!.cantidad);
    }
    for (const i of conNpc) (celda(i), escritor.corto(npcs.get(i)!));
    for (const i of conTraslado) {
      celda(i);
      escritor.corto(traslados.get(i)!.mapa);
      escritor.corto(traslados.get(i)!.x);
      escritor.corto(traslados.get(i)!.y);
    }

    return salida;
  }
}

/** El `.dat` del mapa, que en este formato va adentro del mismo archivo. */
function bytesDelMapDat(mapa: Mapa, c: CabeceraCsm): Uint8Array {
  const i = mapa.info;
  const partes: (Uint8Array | number)[] = [];
  const texto = (s: string) => partes.push(deTexto(s));
  const byte = (n: number) => partes.push(n & 0xff);
  const entero = (n: number) => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setInt32(0, n | 0, true);
    partes.push(b);
  };

  texto(i.nombre);
  byte(i.backup ? 1 : 0);
  texto(i.restringir);
  entero(i.musicaMp3);
  entero(i.musica);
  // La misma inversión que el `Pk` del clásico: el archivo dice si es segura, no si se combate.
  byte(i.seCombate ? 0 : 1);
  texto(i.zona);
  texto(i.terreno);
  texto(c.ambiente);
  entero(c.luzBase);
  entero(c.letraGrh);
  entero(c.nivel);
  entero(c.extra);
  texto(c.salida);
  byte(c.lluvia);
  byte(c.nieve);
  byte(c.niebla);

  const largo = partes.reduce<number>((n, p) => n + (typeof p === "number" ? 1 : p.length), 0);
  const out = new Uint8Array(largo);
  let off = 0;
  for (const p of partes) {
    if (typeof p === "number") out[off++] = p;
    else {
      out.set(p, off);
      off += p.length;
    }
  }
  return out;
}

/** Un string de VB: dos bytes de largo y los caracteres en ANSI. Lo que no entra va como "?". */
function deTexto(texto: string): Uint8Array {
  const out = new Uint8Array(2 + texto.length);
  new DataView(out.buffer).setUint16(0, texto.length, true);
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    out[2 + i] = c < 256 ? c : 63;
  }
  return out;
}

class Lector {
  private off = 0;

  constructor(
    private readonly bytes: DataView,
    private readonly largo: number,
  ) {}

  private pedir(cuantos: number): number {
    if (this.off + cuantos > this.largo) {
      throw new ErrorDeDominio("El .csm se termina antes de lo que dice su cabecera: puede estar cortado o ser de otro formato.");
    }
    const desde = this.off;
    this.off += cuantos;
    return desde;
  }

  byte(): number {
    return this.bytes.getUint8(this.pedir(1));
  }
  corto(): number {
    return this.bytes.getInt16(this.pedir(2), true);
  }
  entero(): number {
    return this.bytes.getInt32(this.pedir(4), true);
  }
  texto(): string {
    const largo = this.bytes.getUint16(this.pedir(2), true);
    const desde = this.pedir(largo);
    return new TextDecoder("windows-1252").decode(new Uint8Array(this.bytes.buffer, this.bytes.byteOffset + desde, largo));
  }

  /** Lee el `.dat` embebido: lo que el editor entiende va al mapa y el resto queda tal cual. */
  mapDat(mapa: Mapa): Omit<CabeceraCsm, "tamanio"> {
    const nombre = this.texto();
    const backup = this.byte() !== 0;
    const restringir = this.texto();
    const musicaMp3 = this.entero();
    const musica = this.entero();
    const segura = this.byte() !== 0;
    const zona = this.texto();
    const terreno = this.texto();
    const ambiente = this.texto();
    const luzBase = this.entero();
    const letraGrh = this.entero();
    const nivel = this.entero();
    const extra = this.entero();
    const salida = this.texto();
    const lluvia = this.byte();
    const nieve = this.byte();
    const niebla = this.byte();

    mapa.conInfo({ nombre, backup, restringir, musica, musicaMp3, zona, terreno, seCombate: !segura });
    return { ...CABECERA_CSM_VACIA, ambiente, luzBase, letraGrh, nivel, extra, salida, lluvia, nieve, niebla };
  }
}

class Escritor {
  private off = 0;

  constructor(
    private readonly vista: DataView,
    private readonly salida: Uint8Array,
  ) {}

  byte(n: number): void {
    this.vista.setUint8(this.off, n & 0xff);
    this.off += 1;
  }
  corto(n: number): void {
    this.vista.setInt16(this.off, n, true);
    this.off += 2;
  }
  entero(n: number): void {
    this.vista.setInt32(this.off, n, true);
    this.off += 4;
  }
  bloque(bytes: Uint8Array): void {
    this.salida.set(bytes, this.off);
    this.off += bytes.length;
  }
}
