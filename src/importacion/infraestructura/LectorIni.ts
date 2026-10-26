/*
 * Los .dat y los .ini del AO clásico son todos el mismo formato: secciones [NOMBRE] y claves
 * clave=valor. Está lleno de detalles que hay que perdonar, y por eso el lector vive acá y no
 * en cada importador:
 *
 * - vienen en CRLF y a veces con BOM;
 * - los comentarios empiezan con ' (apóstrofo, herencia de Visual Basic) o con ;
 * - las claves no respetan mayúsculas: `GrhIndex`, `grhindex` y `GRHINDEX` son la misma;
 * - hay valores vacíos, y hay secciones repetidas (gana la última).
 */

export class ArchivoIni {
  private constructor(private readonly secciones: Map<string, Map<string, string>>) {}

  static parsear(texto: string): ArchivoIni {
    const secciones = new Map<string, Map<string, string>>();
    let actual: Map<string, string> | null = null;

    for (const cruda of texto.replace(/^﻿/, "").split(/\r?\n/)) {
      const linea = cruda.trim();
      if (!linea || linea.startsWith("'") || linea.startsWith(";")) continue;
      if (linea.startsWith("[")) {
        const fin = linea.indexOf("]");
        const nombre = (fin > 0 ? linea.slice(1, fin) : linea.slice(1)).trim().toLowerCase();
        actual = new Map();
        secciones.set(nombre, actual);
        continue;
      }
      const igual = linea.indexOf("=");
      if (igual < 0 || !actual) continue;
      actual.set(linea.slice(0, igual).trim().toLowerCase(), linea.slice(igual + 1).trim());
    }
    return new ArchivoIni(secciones);
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
