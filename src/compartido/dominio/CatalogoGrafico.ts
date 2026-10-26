import type { ReferenciaGrafica } from "./ReferenciaGrafica";

/**
 * Puerto: lo que el módulo Objetos necesita saber de los gráficos, y nada más.
 * La implementación vive en infraestructura y traduce desde el módulo Gráficos
 * (eso se llama "capa anticorrupción" en DDD).
 */
export interface AnimacionDelCatalogo {
  hojaId: string;
  nombreHoja: string;
  animacionId: string;
  nombreAnimacion: string;
  cantidadDeFrames: number;
}

export interface HojaDelCatalogo {
  hojaId: string;
  nombreHoja: string;
  animaciones: AnimacionDelCatalogo[];
}

export interface CatalogoGrafico {
  resolver(ref: ReferenciaGrafica | null | undefined): AnimacionDelCatalogo | null;
  buscarPorNombre(nombreHoja: string, nombreAnimacion: string): AnimacionDelCatalogo | null;
  hojas(): HojaDelCatalogo[];
}
