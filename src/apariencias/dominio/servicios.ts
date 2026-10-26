import { Autovinculador } from "@/compartido/dominio/Autovinculador";
import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import type { Direccion } from "@/compartido/dominio/Direccion";
import { direccionesFaltantes } from "@/compartido/dominio/PorDireccion";
import type { Problema } from "@/compartido/dominio/Problema";
import type { ReferenciaGrafica } from "@/compartido/dominio/ReferenciaGrafica";
import type { Apariencia } from "./Apariencia";

/*
 * Servicios de dominio del módulo. Trabajan contra `Apariencia`, así que valen igual para
 * cuerpos y para cabezas.
 */

export const ValidadorDeApariencias = {
  problemas(apariencia: Apariencia, todas: readonly Apariencia[], catalogo: CatalogoGrafico): Problema[] {
    const out: Problema[] = [];
    if (todas.some((a) => a !== apariencia && a.clave !== apariencia.clave && a.numero === apariencia.numero))
      out.push({ gravedad: "error", mensaje: "ID repetido" });
    if (apariencia.referenciasVigentes().some((r) => !catalogo.resolver(r))) out.push({ gravedad: "error", mensaje: "Vínculo roto" });
    if (!apariencia.nombre.trim()) out.push({ gravedad: "aviso", mensaje: "Sin nombre" });
    const faltan = direccionesFaltantes(apariencia.direcciones).length;
    if (faltan) out.push({ gravedad: "aviso", mensaje: faltan === 4 ? "Sin gráficos" : `Faltan ${faltan} dir.` });
    return out;
  },
};

/** Lo único que el autovínculo necesita saber de una apariencia para poder aplicarse. */
export interface SabeGuardarDirecciones<T> {
  conDireccion(direccion: Direccion, referencia: ReferenciaGrafica | null): T;
}

/**
 * Autovincula las cuatro direcciones desde una hoja. El `Autovinculador` compartido sabe qué
 * animación corresponde a cada dirección; acá se dice dónde las guarda una apariencia.
 */
export function autovincularDirecciones<T extends SabeGuardarDirecciones<T>>(
  apariencia: T,
  hojaId: string,
  catalogo: CatalogoGrafico,
): { apariencia: T; cantidad: number } {
  const { entidad, cantidad } = Autovinculador.vincular(apariencia, hojaId, catalogo, (a, direccion, referencia) => a.conDireccion(direccion, referencia));
  return { apariencia: entidad, cantidad };
}
