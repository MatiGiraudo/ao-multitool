import type { ArchivoExportado } from "../aplicacion/ExportarTodo";

/*
 * Cómo viajan los archivos exportados entre el navegador y el servidor.
 *
 * El navegador arma la exportación y el servidor la escribe, así que tienen que cruzar un JSON.
 * Los catálogos son texto y van tal cual; los binarios del juego —los `.map` y los `.inf`— no
 * entran en una cadena sin romperse, así que van en base64 y marcados como tales.
 */

export interface ArchivoExportadoDto {
  nombreArchivo: string;
  contenido: string;
  /** true si `contenido` es base64 y hay que volverlo bytes antes de escribirlo. */
  binario?: boolean;
  carpeta?: string;
}

export const ArchivoExportadoMapper = {
  aDto(a: ArchivoExportado): ArchivoExportadoDto {
    const binario = typeof a.contenido !== "string";
    return {
      nombreArchivo: a.nombreArchivo,
      contenido: binario ? aBase64(a.contenido as Uint8Array) : (a.contenido as string),
      ...(binario ? { binario: true } : {}),
      ...(a.carpeta ? { carpeta: a.carpeta } : {}),
    };
  },

  aDominio(d: ArchivoExportadoDto): ArchivoExportado {
    return {
      nombreArchivo: String(d.nombreArchivo),
      contenido: d.binario ? desdeBase64(d.contenido) : String(d.contenido),
      ...(d.carpeta ? { carpeta: String(d.carpeta) } : {}),
    };
  },

  /** Lo que valida la ruta antes de escribir nada en disco. */
  esValido(d: unknown): d is ArchivoExportadoDto {
    const a = d as ArchivoExportadoDto | null;
    return !!a && typeof a.nombreArchivo === "string" && typeof a.contenido === "string";
  },
};

/* `btoa` toma una cadena, y pasarle un mapa entero de una reventaría la pila al expandir los
 * argumentos de `fromCharCode`. De a 32 KB entra siempre. */
const TROZO = 0x8000;

export function aBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let binario = "";
  for (let i = 0; i < bytes.length; i += TROZO) binario += String.fromCharCode(...bytes.subarray(i, i + TROZO));
  return btoa(binario);
}

export function desdeBase64(texto: string): Uint8Array {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(texto, "base64"));
  const binario = atob(texto);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}
