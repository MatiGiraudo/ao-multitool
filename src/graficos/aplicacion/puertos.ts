import type { DatosAnimacion } from "../dominio/Animacion";
import type { Grilla } from "../dominio/Grilla";
import type { HojaDeSprites } from "../dominio/HojaDeSprites";
import type { Tamanio } from "../dominio/Tamanio";

/*
 * Puertos de la capa de aplicación del módulo Gráficos.
 * Son interfaces chicas y específicas (principio de segregación de interfaces):
 * cada caso de uso pide sólo lo que usa.
 */

export type VarianteDeImagen = "actual" | "original";

/** Dónde se guardan los PNG de las hojas. En el servidor son archivos; en el navegador, llamadas HTTP. */
export interface AlmacenDeImagenes {
  guardar(hojaId: string, png: Blob, variante: VarianteDeImagen): Promise<void>;
  leer(hojaId: string, variante: VarianteDeImagen): Promise<Blob | null>;
  eliminar(hojaId: string): Promise<void>;
}

/** Cómo la interfaz encuentra la imagen para dibujarla. Sólo lo necesita la UI. */
export interface UbicadorDeImagenes {
  urlDe(hojaId: string, version: number): string;
}

export type CalidadDeEscalado = "pixel" | "suave";

export interface ImagenDecodificada {
  png: Blob;
  tamanio: Tamanio;
}

export interface ColorRgb {
  r: number;
  g: number;
  b: number;
}

/** El color que el AO clásico usa como «esto no se dibuja». */
export const NEGRO: ColorRgb = { r: 0, g: 0, b: 0 };

/** Operaciones sobre píxeles (en el navegador se hacen con canvas). */
export interface ProcesadorDeImagenes {
  /** Lee cualquier imagen (PNG, BMP, GIF, JPG, WebP) y la devuelve como PNG con su tamaño. */
  decodificar(archivo: Blob): Promise<ImagenDecodificada>;
  redimensionar(png: Blob, tamanio: Tamanio, calidad: CalidadDeEscalado): Promise<Blob>;
  /**
   * Vuelve transparentes los píxeles de ese color exacto, y dice cuántos cambió.
   *
   * Exacto y sin tolerancia a propósito: los sprites del clásico tienen sombras y contornos casi
   * negros que son parte del dibujo, y el color de fondo siempre es el negro puro.
   */
  quitarColor(png: Blob, color: ColorRgb): Promise<{ png: Blob; pixeles: number }>;
}

export type DatosAnimacionImportada = Omit<DatosAnimacion, "id">;

export interface AnimacionesImportadas {
  nombreArchivo: string | null;
  grilla: Grilla | null;
  animaciones: DatosAnimacionImportada[];
}

/** El formato de intercambio con Unity (hoy: "ao-anim" v1). */
export interface FormatoDeAnimaciones {
  exportar(hoja: HojaDeSprites): string;
  leer(texto: string): AnimacionesImportadas;
  nombreDeArchivoPara(hoja: HojaDeSprites): string;
}
