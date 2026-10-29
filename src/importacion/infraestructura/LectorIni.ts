/*
 * Los .dat y los .ini del AO clásico son todos el mismo formato: secciones [NOMBRE] y claves
 * clave=valor. Está lleno de detalles que hay que perdonar, y por eso el lector vive acá y no
 * en cada importador:
 *
 * - vienen en CRLF y a veces con BOM;
 * - los comentarios empiezan con ' (apóstrofo, herencia de Visual Basic) o con ;, y también
 *   aparecen al final de una línea con valor: `Walk1=4582	 ' arriba`;
 * - las claves no respetan mayúsculas: `GrhIndex`, `grhindex` y `GRHINDEX` son la misma;
 * - hay valores vacíos, y hay secciones repetidas (gana la última).
 */

/**
 * Parte el valor del comentario que algunos archivos dejan pegado: en `Walk1=4582	 ' arriba` el
 * valor es 4582 y el comentario es todo lo que sigue, con su espaciado.
 *
 * Sólo corta cuando lo que queda antes es un número, y eso es a propósito. Los comentarios al
 * final de línea aparecen en los índices (cuerpos, cabezas, armas), que son siempre numéricos;
 * en cambio un nombre o una descripción pueden tener comillas simples de verdad (`la espada
 * 'Matadragones'`) y cortar ahí los rompería.
 *
 * El comentario sale con los espacios y tabs que lo separaban del valor, porque lo usa también el
 * escritor: devolver `Walk1=4583` donde el archivo decía `Walk1=4582	 ' arriba` sería cambiar dos
 * cosas, el gráfico y la nota que dice para qué lado mira.
 */
export function partirComentario(valor: string): { valor: string; comentario: string } {
  const corte = valor.search(/\s['´;]/);
  if (corte < 0) return { valor, comentario: "" };
  const crudo = valor.slice(0, corte);
  const antes = crudo.trim();
  if (!/^[+-]?\d+([.,]\d+)?$/.test(antes)) return { valor, comentario: "" };
  return { valor: antes, comentario: valor.slice(crudo.trimEnd().length) };
}

/** Sólo el valor. Como `numero` ya perdona la basura del final, el único que lo necesitaba es `texto`. */
function sinComentarioAlFinal(valor: string): string {
  return partirComentario(valor).valor;
}

export class ArchivoIni {
  private constructor(
    private readonly secciones: Map<string, Map<string, string>>,
    private readonly crudas: Map<string, { nombre: string; lineas: string[] }>,
    private readonly preambulo: string[],
  ) {}

  static parsear(texto: string): ArchivoIni {
    const secciones = new Map<string, Map<string, string>>();
    const crudas = new Map<string, { nombre: string; lineas: string[] }>();
    const preambulo: string[] = [];
    let actual: Map<string, string> | null = null;
    let actualCruda: string[] | null = null;

    for (const cruda of texto.replace(/^﻿/, "").split(/\r?\n/)) {
      const linea = cruda.trim();
      if (linea.startsWith("[")) {
        const fin = linea.indexOf("]");
        const comoVino = (fin > 0 ? linea.slice(1, fin) : linea.slice(1)).trim();
        const nombre = comoVino.toLowerCase();
        actual = new Map();
        secciones.set(nombre, actual);
        // La línea entera queda dentro de la sección, con el comentario que algunas traen al lado
        // del nombre: `[OBJ7] 'Puerta para negocio`.
        actualCruda = [cruda];
        crudas.set(nombre, { nombre: comoVino, lineas: actualCruda });
        continue;
      }
      // Las líneas se guardan tal como vinieron —comentarios, mayúsculas, espacios y renglones en
      // blanco— porque son lo que permite devolver el archivo igual al que entró, con las claves
      // que el editor no sabe leer en su lugar.
      (actualCruda ?? preambulo).push(cruda);
      if (!linea || linea.startsWith("'") || linea.startsWith(";")) continue;
      const igual = linea.indexOf("=");
      if (igual < 0 || !actual) continue;
      actual.set(linea.slice(0, igual).trim().toLowerCase(), sinComentarioAlFinal(linea.slice(igual + 1).trim()));
    }
    return new ArchivoIni(secciones, crudas, preambulo);
  }

  /**
   * Todo lo que hay en el archivo antes de las secciones que interesan, tal como vino.
   *
   * En un `OBJ.dat` eso es la tabla de tipos comentada que explica cada `ObjType` y, en varios
   * servidores, una sección `[INIT]` con el total de objetos. Nada de eso es un objeto, pero es
   * parte del archivo: al devolverlo tiene que estar.
   */
  encabezado(prefijoDeLasQueInteresan: string): string[] {
    const p = prefijoDeLasQueInteresan.toLowerCase();
    const lineas = [...this.preambulo];
    for (const [clave, seccion] of this.crudas) {
      if (clave.startsWith(p)) continue;
      lineas.push(...seccion.lineas);
    }
    return lineas;
  }

  /** Las líneas de una sección tal como estaban en el archivo. Vacío si la sección no existe. */
  lineasDe(seccion: string): string[] {
    return this.crudas.get(seccion.toLowerCase())?.lineas ?? [];
  }

  tiene(seccion: string): boolean {
    return this.secciones.has(seccion.toLowerCase());
  }

  /** Los nombres de sección que empiezan con un prefijo, con su número: "OBJ12" → 12. */
  numeradas(prefijo: string): { seccion: string; numero: number }[] {
    const p = prefijo.toLowerCase();
    const out: { seccion: string; numero: number }[] = [];
    for (const nombre of this.secciones.keys()) {
      if (!nombre.startsWith(p)) continue;
      const n = Number(nombre.slice(p.length));
      if (Number.isInteger(n) && n > 0) out.push({ seccion: nombre, numero: n });
    }
    return out.sort((a, b) => a.numero - b.numero);
  }

  /**
   * Las claves numeradas de un prefijo, con su número y su valor: "Grh12=1-5-0-0-32-32" → 12.
   *
   * Es la contracara de `numeradas`: hay archivos que, en vez de una sección por elemento, traen
   * todo junto en una sola sección, una clave por línea. Busca en todas las secciones, así no hay
   * que saber si la sección se llama [Graphics], [Graficos] u otra cosa.
   */
  clavesNumeradas(prefijo: string): { numero: number; valor: string }[] {
    const p = prefijo.toLowerCase();
    const out: { numero: number; valor: string }[] = [];
    for (const claves of this.secciones.values()) {
      for (const [clave, valor] of claves) {
        if (!clave.startsWith(p)) continue;
        const n = Number(clave.slice(p.length));
        if (Number.isInteger(n) && n > 0) out.push({ numero: n, valor });
      }
    }
    return out.sort((a, b) => a.numero - b.numero);
  }

  texto(seccion: string, clave: string, porDefecto = ""): string {
    return this.secciones.get(seccion.toLowerCase())?.get(clave.toLowerCase()) ?? porDefecto;
  }

  /** Un número, perdonando decimales con coma y valores vacíos o basura. */
  numero(seccion: string, clave: string, porDefecto = 0): number {
    const v = this.texto(seccion, clave).replace(",", ".");
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : porDefecto;
  }

  entero(seccion: string, clave: string, porDefecto = 0): number {
    return Math.round(this.numero(seccion, clave, porDefecto));
  }

  /** En estos archivos, "verdadero" es cualquier número distinto de 0. */
  bandera(seccion: string, clave: string): boolean {
    const v = this.texto(seccion, clave).toLowerCase();
    return v !== "" && v !== "0" && v !== "false" && v !== "no";
  }
}
