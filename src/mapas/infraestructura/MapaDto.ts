import { ALTO, ANCHO, CAPAS, Mapa, type CabeceraOriginal, type InfoDeMapa } from "../dominio/Mapa";
import type { MapaGuardado, ResumenDeMapa } from "../dominio/MapaRepositorio";

/*
 * La forma en que un mapa se guarda en el proyecto (`data/mapas/<numero>.json`).
 *
 * Las capas, los bloqueos, los triggers y las partículas van comprimidos por repetición: son
 * 10.000 celdas cada uno y en un mapa de verdad vienen en tiradas largas del mismo valor (el piso
 * de un bosque, el cero de una capa que nadie usó). Sin comprimir, el archivo son varios megas de
 * números sueltos y cada pincelada deja un diff ilegible.
 *
 * Lo del `.inf` —traslados, NPCs y objetos— va como lista de celdas, que es como está en el mapa:
 * son cientos, no diez mil.
 */

export interface TrasladoDto {
  x: number;
  y: number;
  mapa: number;
  destinoX: number;
  destinoY: number;
}

export interface NpcDto {
  x: number;
  y: number;
  npc: number;
}

export interface ObjetoDto {
  x: number;
  y: number;
  objeto: number;
  cantidad: number;
}

export interface MapaDto {
  formato: "ao-mapa";
  version: 1;
  numero: number;
  nombreArchivo: string;
  anchoDeGrafico: 2 | 4;
  info: InfoDeMapa;
  /** Lo que vino en la cabecera del `.map` original; en un mapa nuevo, todo en cero. */
  cabecera: CabeceraOriginal;
  /** Una por capa, comprimidas: `[valor, repeticiones, valor, repeticiones, …]`. */
  capas: number[][];
  bloqueos: number[];
  triggers: number[];
  particulas: number[];
  traslados: TrasladoDto[];
  npcs: NpcDto[];
  objetos: ObjetoDto[];
}

/** `[1, 1, 1, 0, 0]` → `[1, 3, 0, 2]`. */
export function comprimir(valores: ArrayLike<number>): number[] {
  const salida: number[] = [];
  let i = 0;
  while (i < valores.length) {
    const valor = valores[i]!;
    let largo = 1;
    while (i + largo < valores.length && valores[i + largo] === valor) largo++;
    salida.push(valor, largo);
    i += largo;
  }
  return salida;
}

/** Al revés. `largo` es cuántas celdas tiene que haber: un archivo cortado se completa con ceros. */
export function descomprimir(pares: readonly number[], largo: number): number[] {
  const salida = new Array<number>(largo).fill(0);
  let i = 0;
  for (let p = 0; p + 1 < pares.length && i < largo; p += 2) {
    const valor = pares[p]!;
    const veces = Math.min(pares[p + 1]!, largo - i);
    for (let k = 0; k < veces; k++) salida[i++] = valor;
  }
  return salida;
}

const CELDAS = ANCHO * ALTO;

export const MapaMapper = {
  aDto({ mapa, anchoDeGrafico, nombreArchivo }: MapaGuardado): MapaDto {
    const crudo = mapa.datosCrudos();
    return {
      formato: "ao-mapa",
      version: 1,
      numero: mapa.numero,
      nombreArchivo,
      anchoDeGrafico,
      info: { ...mapa.info },
      cabecera: { ...mapa.cabeceraOriginal },
      capas: crudo.capas.map(comprimir),
      bloqueos: comprimir(crudo.bloqueos),
      triggers: comprimir(crudo.triggers),
      particulas: comprimir(crudo.particulas),
      traslados: [...crudo.traslados.entries()]
        .sort(([a], [b]) => a - b)
        .map(([i, t]) => ({ ...celda(i), mapa: t.mapa, destinoX: t.x, destinoY: t.y })),
      npcs: [...crudo.npcs.entries()]
        .sort(([a], [b]) => a - b)
        .map(([i, npc]) => ({ ...celda(i), npc })),
      objetos: [...crudo.objetos.entries()]
        .sort(([a], [b]) => a - b)
        .map(([i, o]) => ({ ...celda(i), objeto: o.objeto, cantidad: o.cantidad })),
    };
  },

  aDominio(dto: MapaDto): MapaGuardado {
    const mapa = Mapa.vacio(dto.numero, dto.info, dto.cabecera);
    for (let capa = 0; capa < CAPAS; capa++) {
      const valores = descomprimir(dto.capas[capa] ?? [], CELDAS);
      for (let i = 0; i < CELDAS; i++) {
        if (!valores[i]) continue;
        const { x, y } = celda(i);
        mapa.ponerGrafico(x, y, capa + 1, valores[i]!);
      }
    }
    escribirPorCelda(descomprimir(dto.bloqueos ?? [], CELDAS), (x, y, v) => mapa.bloquear(x, y, v === 1));
    escribirPorCelda(descomprimir(dto.triggers ?? [], CELDAS), (x, y, v) => mapa.ponerTrigger(x, y, v));
    escribirPorCelda(descomprimir(dto.particulas ?? [], CELDAS), (x, y, v) => mapa.ponerParticula(x, y, v));
    for (const t of dto.traslados ?? []) mapa.ponerTraslado(t.x, t.y, { mapa: t.mapa, x: t.destinoX, y: t.destinoY });
    for (const n of dto.npcs ?? []) mapa.ponerNpc(n.x, n.y, n.npc);
    for (const o of dto.objetos ?? []) mapa.ponerObjeto(o.x, o.y, { objeto: o.objeto, cantidad: o.cantidad });
    return { mapa, anchoDeGrafico: dto.anchoDeGrafico === 2 ? 2 : 4, nombreArchivo: dto.nombreArchivo || `Mapa${dto.numero}` };
  },

  resumen(dto: MapaDto): ResumenDeMapa {
    return { numero: dto.numero, nombre: dto.info?.nombre ?? "", nombreArchivo: dto.nombreArchivo || `Mapa${dto.numero}` };
  },
};

function celda(indice: number): { x: number; y: number } {
  return { x: (indice % ANCHO) + 1, y: Math.floor(indice / ANCHO) + 1 };
}

function escribirPorCelda(valores: number[], poner: (x: number, y: number, valor: number) => void): void {
  for (let i = 0; i < valores.length; i++) {
    if (!valores[i]) continue;
    const { x, y } = celda(i);
    poner(x, y, valores[i]!);
  }
}
