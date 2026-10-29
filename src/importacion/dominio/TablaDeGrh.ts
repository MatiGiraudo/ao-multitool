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
  /**
   * true si lo inventó el editor, pintando un mapa con un recorte del proyecto.
   *
   * Es lo que distingue los gráficos que no existen en ningún `Graficos.ini`: volver a importar
   * uno reemplaza los del clásico, pero éstos tienen que quedarse, porque los mapas guardados ya
   * los referencian por número y nadie los puede volver a deducir del archivo.
   */
  propio?: boolean;
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

  /** El primer número libre, para sumar gráficos propios sin pisar los que vinieron del clásico. */
  proximoNumero(): number {
    let mayor = 0;
    for (const n of this.porNumero.keys()) if (n > mayor) mayor = n;
    return mayor + 1;
  }

  /**
   * El GRH estático que ya apunta a ese recorte exacto, si existe.
   *
   * Sirve para no inventar un número nuevo cada vez que se elige el mismo tile: dos celdas con el
   * mismo pasto tienen que terminar con el mismo GRH, como en el juego.
   */
  buscarRecorte(archivo: string, x: number, y: number, ancho: number, alto: number): Grh | null {
    for (const g of this.porNumero.values()) {
      if (!g.cuadros.length && g.archivo === archivo && g.x === x && g.y === y && g.ancho === ancho && g.alto === alto) return g;
    }
    return null;
  }

  /** Los que inventó el editor y no salen de ningún `Graficos.ini`. */
  propios(): Grh[] {
    return this.datos().filter((g) => g.propio);
  }

  /**
   * Esta tabla con los gráficos propios de otra sumados encima.
   *
   * Es lo que hace que reimportar el `Graficos.ini` no borre lo que el editor inventó: los del
   * clásico se reemplazan enteros —es lo que el usuario pidió al importar— y los propios se
   * conservan, porque los mapas guardados los referencian por número y no hay de dónde volver a
   * sacarlos.
   *
   * Si un número está en los dos lados gana el propio, y se avisa: perder un gráfico del clásico
   * se arregla reimportando, perder uno propio rompe mapas que ya existen.
   */
  sumandoLosPropiosDe(otra: TablaDeGrh): { tabla: TablaDeGrh; pisados: number[] } {
    const m = new Map(this.porNumero);
    const pisados: number[] = [];
    for (const g of otra.propios()) {
      if (m.has(g.numero)) pisados.push(g.numero);
      m.set(g.numero, g);
    }
    return { tabla: new TablaDeGrh(m), pisados };
  }

  /**
   * La misma tabla, con los GRH de un archivo nombrados por otro.
   *
   * Es lo que deja ponerle número a una hoja que no lo tenía sin romper lo ya pintado: los GRH
   * siguen siendo los mismos —los mapas guardados los referencian por número— y lo único que
   * cambia es con qué nombre se busca su imagen.
   */
  renombrandoArchivo(viejo: string, nuevo: string): TablaDeGrh {
    const m = new Map<number, Grh>();
    for (const [n, g] of this.porNumero) m.set(n, g.archivo === viejo ? { ...g, archivo: nuevo } : g);
    return new TablaDeGrh(m);
  }

  /** Otra tabla con ese GRH sumado (o reemplazado, si el número ya estaba). */
  con(grh: Grh): TablaDeGrh {
    asegurar(Number.isInteger(grh.numero) && grh.numero > 0, "El número de GRH tiene que ser un entero positivo.");
    const m = new Map(this.porNumero);
    m.set(grh.numero, grh);
    return new TablaDeGrh(m);
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
