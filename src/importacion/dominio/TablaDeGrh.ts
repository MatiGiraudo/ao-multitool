import { asegurar } from "@/compartido/dominio/ErrorDeDominio";

/*
 * Módulo Importación: traer a este editor lo que ya existe en los archivos del AO clásico.
 *
 * El problema central es que allá los gráficos se referencian por NÚMERO DE GRH, y acá por hoja
 * y nombre de animación. La tabla de GRH es el puente: dice, para cada número, de qué archivo de
 * imagen sale y qué recorte es. Se arma una vez leyendo `Graficos.ini` y se guarda, así los demás
 * importadores (OBJ.dat, NPCs.dat…) sólo tienen que preguntarle.
 */

/** Un GRH ya interpretado. Si tiene más de un cuadro es animado, y los cuadros son otros GRH. */
export interface Grh {
  numero: number;
  /** El `FileNum` de Graficos.ini: el nombre del archivo de imagen sin extensión ("12" por 12.bmp). */
  archivo: string;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  /** Números de GRH de cada cuadro. Vacío si es estático. */
  cuadros: number[];
  /** Cuánto dura el ciclo completo, en ms (así lo guarda el clásico en `Speed`). */
  msDelCiclo: number;
}

/** Un GRH resuelto a lo que este editor entiende: recortes de una hoja. */
export interface RecortesDeGrh {
  archivo: string;
  rects: { x: number; y: number; ancho: number; alto: number }[];
  msPorFrame: number;
}

export class TablaDeGrh {
  private constructor(private readonly porNumero: Map<number, Grh>) {}

  static desde(grhs: readonly Grh[]): TablaDeGrh {
    const m = new Map<number, Grh>();
    for (const g of grhs) {
      asegurar(Number.isInteger(g.numero) && g.numero > 0, "El número de GRH tiene que ser un entero positivo.");
      m.set(g.numero, g);
    }
    return new TablaDeGrh(m);
  }

  static vacia(): TablaDeGrh {
    return new TablaDeGrh(new Map());
  }

  get cantidad(): number {
    return this.porNumero.size;
  }

  obtener(numero: number): Grh | null {
    return this.porNumero.get(numero) ?? null;
  }

  datos(): Grh[] {
    return [...this.porNumero.values()].sort((a, b) => a.numero - b.numero);
  }

  /** Los archivos de imagen distintos que menciona la tabla, en orden. */
  archivos(): string[] {
    return [...new Set(this.datos().map((g) => g.archivo))].filter(Boolean).sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
  }

  /**
   * De un número de GRH a los recortes concretos.
   *
   * Un GRH animado no guarda recortes propios: guarda los números de los GRH de cada cuadro, así
   * que hay que resolverlos uno por uno. Si alguno falta se saltea; si no queda ninguno, devuelve null.
   */
  recortes(numero: number): RecortesDeGrh | null {
    const g = this.obtener(numero);
    if (!g) return null;
    if (!g.cuadros.length) {
      return g.archivo ? { archivo: g.archivo, rects: [{ x: g.x, y: g.y, ancho: g.ancho, alto: g.alto }], msPorFrame: 0 } : null;
    }
    const cuadros = g.cuadros.map((n) => this.obtener(n)).filter((c): c is Grh => !!c && !c.cuadros.length && !!c.archivo);
    if (!cuadros.length) return null;
    return {
      archivo: cuadros[0]!.archivo,
      rects: cuadros.map((c) => ({ x: c.x, y: c.y, ancho: c.ancho, alto: c.alto })),
      msPorFrame: Math.max(10, Math.round((g.msDelCiclo || 0) / cuadros.length) || 120),
    };
  }
}
