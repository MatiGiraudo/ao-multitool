import type { AnimacionDelCatalogo, CatalogoGrafico } from "./CatalogoGrafico";
import { DIRECCIONES, type Direccion } from "./Direccion";
import { Referencia, type ReferenciaGrafica } from "./ReferenciaGrafica";

/*
 * Servicio de dominio compartido: adivinar qué animación de una hoja corresponde a cada dirección
 * mirando el sufijo del nombre ("caminar_sur", "walk_down"…).
 *
 * Lo necesita todo lo que se dibuja mirando a los cuatro lados: el equipado de un objeto, los
 * cuerpos y cabezas, y más adelante los NPCs. Por eso no sabe a qué entidad se lo están aplicando:
 * quien lo llama le pasa un `aplicar` que dice dónde guardar cada dirección.
 */
export const Autovinculador = {
  /** Qué animación de la hoja corresponde a cada dirección, según los sufijos del nombre. */
  coincidencias(catalogo: CatalogoGrafico, hojaId: string): Partial<Record<Direccion, AnimacionDelCatalogo>> {
    const hoja = catalogo.hojas().find((h) => h.hojaId === hojaId);
    const out: Partial<Record<Direccion, AnimacionDelCatalogo>> = {};
    if (!hoja) return out;
    for (const d of DIRECCIONES) {
      const a = hoja.animaciones.find((x) => d.sufijos.test(x.nombreAnimacion));
      if (a) out[d.valor] = a;
    }
    return out;
  },

  /** La hoja con más direcciones reconocibles (para preseleccionarla). */
  hojaSugerida(catalogo: CatalogoGrafico): string | null {
    let mejor: string | null = null,
      max = -1;
    for (const h of catalogo.hojas()) {
      const n = Object.keys(this.coincidencias(catalogo, h.hojaId)).length;
      if (n > max) {
        max = n;
        mejor = h.hojaId;
      }
    }
    return mejor;
  },

  /**
   * Aplica las coincidencias de una hoja sobre cualquier entidad inmutable.
   * `aplicar` es lo único que sabe de la entidad: recibe una dirección y su referencia, y devuelve
   * la entidad nueva (para un objeto es `conEquipado`, para un cuerpo será `conDireccion`).
   */
  vincular<T>(
    entidad: T,
    hojaId: string,
    catalogo: CatalogoGrafico,
    aplicar: (entidad: T, direccion: Direccion, referencia: ReferenciaGrafica) => T,
  ): { entidad: T; cantidad: number } {
    const c = this.coincidencias(catalogo, hojaId);
    let actual = entidad,
      cantidad = 0;
    for (const d of DIRECCIONES) {
      const a = c[d.valor];
      if (!a) continue;
      actual = aplicar(actual, d.valor, Referencia.vinculada(a.hojaId, a.animacionId));
      cantidad++;
    }
    return { entidad: actual, cantidad };
  },
};
