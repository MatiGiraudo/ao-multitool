import { asegurar } from "@/compartido/dominio/ErrorDeDominio";
import { numeroDeAo } from "@/compartido/dominio/NumeroDeAo";

/*
 * Módulo Mapas: el terreno del mundo.
 *
 * Acá se rompe, a propósito, la regla que siguen todos los demás módulos. Un mapa son 100×100
 * celdas con cuatro capas: 40.000 gráficos más bloqueos, traslados, NPCs y objetos. Con objetos
 * de valor inmutables, pintar una pincelada crearía decenas de miles de objetos por segundo.
 *
 * Por eso el agregado guarda arreglos tipados y se modifica celda por celda. Lo que se conserva
 * es lo importante: las reglas viven igual acá adentro (nadie escribe fuera del mapa, ningún
 * número es inválido) y nada de esto sabe de React, de disco ni del formato del juego.
 */

export const ANCHO = 100;
export const ALTO = 100;
export const CELDAS = ANCHO * ALTO;
export const CAPAS = 4;

/** Adónde lleva una celda de traslado. */
export interface Traslado {
  mapa: number;
  x: number;
  y: number;
}

export interface ObjetoEnElSuelo {
  objeto: number;
  cantidad: number;
}

/** Lo que el juego guarda del mapa aparte del terreno (el `.dat` del clásico). */
export interface InfoDeMapa {
  nombre: string;
  musica: number;
  musicaMp3: number;
  terreno: string;
  zona: string;
  restringir: string;
  /** true = se puede atacar. Ojo: en el archivo clásico está al revés (`Pk=1` es zona segura). */
  seCombate: boolean;
  magiaSinEfecto: boolean;
  invisibilidadSinEfecto: boolean;
  resucitarSinEfecto: boolean;
  noEncriptarMp: boolean;
  backup: boolean;
}

/**
 * Lo que venía en la cabecera del archivo original y hay que devolver tal cual.
 *
 * El CRC y la palabra mágica no se recalculan: se guardan como vinieron. Es lo que permite que
 * exportar un mapa importado devuelva un archivo idéntico byte a byte, que es la única prueba
 * seria de que el formato se entendió bien.
 */
export interface CabeceraOriginal {
  version: number;
  descripcion: string;
  crc: number;
  palabraMagica: number;
}

export const CABECERA_VACIA: CabeceraOriginal = { version: 0, descripcion: "", crc: 0, palabraMagica: 0 };

export const INFO_VACIA: InfoDeMapa = {
  nombre: "",
  musica: 0,
  musicaMp3: 0,
  terreno: "BOSQUE",
  zona: "CAMPO",
  restringir: "NO",
  seCombate: true,
  magiaSinEfecto: false,
  invisibilidadSinEfecto: false,
  resucitarSinEfecto: false,
  noEncriptarMp: false,
  backup: false,
};

export class Mapa {
  /** Una por capa; el índice de cada celda es `(y - 1) * 100 + (x - 1)`. 0 = sin gráfico. */
  private readonly capas: Int32Array[];
  private readonly bloqueos: Uint8Array;
  private readonly triggers: Uint16Array;
  private readonly particulas: Uint16Array;
  /* Lo del .inf es ralo de verdad: en un mapa típico hay cientos, no diez mil. */
  private readonly traslados = new Map<number, Traslado>();
  private readonly npcs = new Map<number, number>();
  private readonly objetos = new Map<number, ObjetoEnElSuelo>();

  private constructor(
    private numeroDeMapa: number,
    private informacion: InfoDeMapa,
    private cabecera: CabeceraOriginal,
  ) {
    this.capas = Array.from({ length: CAPAS }, () => new Int32Array(CELDAS));
    this.bloqueos = new Uint8Array(CELDAS);
    this.triggers = new Uint16Array(CELDAS);
    this.particulas = new Uint16Array(CELDAS);
  }

  static vacio(numero: number, info: Partial<InfoDeMapa> = {}, cabecera: CabeceraOriginal = CABECERA_VACIA): Mapa {
    return new Mapa(numeroDeAo(numero, "El número del mapa"), { ...INFO_VACIA, ...info }, cabecera);
  }

  get numero() {
    return this.numeroDeMapa;
  }
  get info(): InfoDeMapa {
    return this.informacion;
  }
  get cabeceraOriginal(): CabeceraOriginal {
    return this.cabecera;
  }

  conNumero(n: number): this {
    this.numeroDeMapa = numeroDeAo(n, "El número del mapa");
    return this;
  }
  conInfo(cambios: Partial<InfoDeMapa>): this {
    this.informacion = { ...this.informacion, ...cambios };
    return this;
  }
  conCabeceraOriginal(c: CabeceraOriginal): this {
    this.cabecera = c;
    return this;
  }

  // ---------- celdas ----------

  /** Las coordenadas van de 1 a 100, como en el juego. */
  static dentro(x: number, y: number): boolean {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 1 && x <= ANCHO && y >= 1 && y <= ALTO;
  }

  static indice(x: number, y: number): number {
    return (y - 1) * ANCHO + (x - 1);
  }

  private celda(x: number, y: number): number {
    asegurar(Mapa.dentro(x, y), `La celda ${x}, ${y} está fuera del mapa.`);
    return Mapa.indice(x, y);
  }

  grafico(x: number, y: number, capa: number): number {
    asegurar(capa >= 1 && capa <= CAPAS, "La capa va de 1 a 4.");
    return this.capas[capa - 1]![this.celda(x, y)]!;
  }

  ponerGrafico(x: number, y: number, capa: number, grh: number): void {
    asegurar(capa >= 1 && capa <= CAPAS, "La capa va de 1 a 4.");
    asegurar(Number.isInteger(grh) && grh >= 0, "El gráfico tiene que ser un entero.");
    this.capas[capa - 1]![this.celda(x, y)] = grh;
  }

  bloqueada(x: number, y: number): boolean {
    return this.bloqueos[this.celda(x, y)] === 1;
  }
  bloquear(x: number, y: number, bloqueada: boolean): void {
    this.bloqueos[this.celda(x, y)] = bloqueada ? 1 : 0;
  }

  trigger(x: number, y: number): number {
    return this.triggers[this.celda(x, y)]!;
  }
  ponerTrigger(x: number, y: number, valor: number): void {
    asegurar(Number.isInteger(valor) && valor >= 0 && valor <= 65535, "El trigger tiene que entrar en dos bytes.");
    this.triggers[this.celda(x, y)] = valor;
  }

  particula(x: number, y: number): number {
    return this.particulas[this.celda(x, y)]!;
  }
  ponerParticula(x: number, y: number, valor: number): void {
    asegurar(Number.isInteger(valor) && valor >= 0 && valor <= 65535, "La partícula tiene que entrar en dos bytes.");
    this.particulas[this.celda(x, y)] = valor;
  }

  traslado(x: number, y: number): Traslado | null {
    return this.traslados.get(this.celda(x, y)) ?? null;
  }
  ponerTraslado(x: number, y: number, destino: Traslado | null): void {
    const i = this.celda(x, y);
    if (!destino) {
      this.traslados.delete(i);
      return;
    }
    asegurar(Number.isInteger(destino.mapa) && destino.mapa >= 0, "El mapa de destino tiene que ser un entero.");
    this.traslados.set(i, { ...destino });
  }

  npc(x: number, y: number): number {
    return this.npcs.get(this.celda(x, y)) ?? 0;
  }
  ponerNpc(x: number, y: number, numero: number): void {
    const i = this.celda(x, y);
    if (numero > 0) this.npcs.set(i, numero);
    else this.npcs.delete(i);
  }

  objeto(x: number, y: number): ObjetoEnElSuelo | null {
    return this.objetos.get(this.celda(x, y)) ?? null;
  }
  ponerObjeto(x: number, y: number, objeto: ObjetoEnElSuelo | null): void {
    const i = this.celda(x, y);
    if (!objeto || objeto.objeto <= 0) {
      this.objetos.delete(i);
      return;
    }
    asegurar(Number.isInteger(objeto.cantidad) && objeto.cantidad > 0, "La cantidad tiene que ser mayor a 0.");
    this.objetos.set(i, { ...objeto });
  }

  // ---------- lecturas de conjunto ----------

  /** Los arreglos crudos, para quien dibuja o guarda. No se copian: son 160 KB. */
  datosCrudos() {
    return {
      capas: this.capas,
      bloqueos: this.bloqueos,
      triggers: this.triggers,
      particulas: this.particulas,
      traslados: this.traslados,
      npcs: this.npcs,
      objetos: this.objetos,
    };
  }

  /** Los GRH distintos que usa el mapa: es lo que hay que tener cargado para dibujarlo. */
  graficosUsados(): Set<number> {
    const out = new Set<number>();
    for (const capa of this.capas) for (const grh of capa) if (grh) out.add(grh);
    return out;
  }

  contar() {
    let bloqueadas = 0;
    for (const b of this.bloqueos) if (b) bloqueadas++;
    let conTrigger = 0;
    for (const t of this.triggers) if (t) conTrigger++;
    return {
      bloqueadas,
      conTrigger,
      traslados: this.traslados.size,
      npcs: this.npcs.size,
      objetos: this.objetos.size,
      graficos: this.graficosUsados().size,
    };
  }
}
