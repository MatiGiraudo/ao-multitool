import type { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import type { AnimacionDelCatalogo, CatalogoGrafico, HojaDelCatalogo } from "../dominio/CatalogoGrafico";
import type { ReferenciaGrafica } from "../dominio/ReferenciaGrafica";

/**
 * Capa anticorrupción: traduce las hojas del módulo Gráficos al idioma que entiende Objetos.
 * Es el ÚNICO archivo del módulo Objetos que importa algo de Gráficos.
 */
export class CatalogoGraficoDesdeHojas implements CatalogoGrafico {
  private readonly lista: HojaDelCatalogo[];

  constructor(hojas: readonly HojaDeSprites[]) {
    this.lista = hojas.map((h) => ({
      hojaId: h.id,
      nombreHoja: h.nombreArchivo,
      animaciones: h.animaciones.map((a) => ({
        hojaId: h.id,
        nombreHoja: h.nombreArchivo,
        animacionId: a.id,
        nombreAnimacion: a.nombre,
        cantidadDeFrames: a.cantidadDeFrames,
      })),
    }));
  }

  hojas(): HojaDelCatalogo[] {
    return this.lista;
  }

  buscarPorNombre(nombreHoja: string, nombreAnimacion: string): AnimacionDelCatalogo | null {
    const h = this.lista.find((x) => x.nombreHoja === nombreHoja);
    return h?.animaciones.find((a) => a.nombreAnimacion === nombreAnimacion) ?? null;
  }

  resolver(ref: ReferenciaGrafica | null | undefined): AnimacionDelCatalogo | null {
    if (!ref) return null;
    if (ref.tipo === "pendiente") return this.buscarPorNombre(ref.nombreHoja, ref.nombreAnimacion);
    const h = this.lista.find((x) => x.hojaId === ref.hojaId);
    return h?.animaciones.find((a) => a.animacionId === ref.animacionId) ?? null;
  }
}
