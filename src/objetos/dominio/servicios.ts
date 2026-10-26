import { DIRECCIONES, type Direccion } from "./Direccion";
import type { AnimacionDelCatalogo, CatalogoGrafico } from "./CatalogoGrafico";
import type { Objeto } from "./Objeto";
import { Referencia } from "./ReferenciaGrafica";

/*
 * Servicios de dominio: reglas que involucran a más de un objeto (o a un objeto y al catálogo),
 * así que no le pertenecen a una sola entidad.
 */

export interface Problema {
  gravedad: "error" | "aviso";
  mensaje: string;
}

export const ValidadorDeObjetos = {
  problemas(objeto: Objeto, todos: readonly Objeto[], catalogo: CatalogoGrafico): Problema[] {
    const out: Problema[] = [];
    if (todos.some((o) => o !== objeto && o.clave !== objeto.clave && o.numero === objeto.numero))
      out.push({ gravedad: "error", mensaje: "ID repetido" });
    if (objeto.referenciasVigentes().some((r) => !catalogo.resolver(r))) out.push({ gravedad: "error", mensaje: "Vínculo roto" });
    if (!objeto.nombre.trim()) out.push({ gravedad: "aviso", mensaje: "Sin nombre" });
    if (!objeto.graficos.icono) out.push({ gravedad: "aviso", mensaje: "Sin icono" });
    if (objeto.tipo.equipable) {
      const faltan = DIRECCIONES.filter((d) => !objeto.graficos.equipado[d.valor]).length;
      if (faltan) out.push({ gravedad: "aviso", mensaje: faltan === 4 ? "Sin equipado" : `Faltan ${faltan} dir.` });
    }
    return out;
  },
};

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

  vincular(objeto: Objeto, hojaId: string, catalogo: CatalogoGrafico): { objeto: Objeto; cantidad: number } {
    const c = this.coincidencias(catalogo, hojaId);
    let o = objeto,
      cantidad = 0;
    for (const d of DIRECCIONES) {
      const a = c[d.valor];
      if (!a) continue;
      o = o.conEquipado(d.valor, Referencia.vinculada(a.hojaId, a.animacionId));
      cantidad++;
    }
    return { objeto: o, cantidad };
  },
};
