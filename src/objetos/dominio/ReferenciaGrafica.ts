/**
 * Objeto de valor: a qué animación (y qué frame) apunta un objeto.
 *
 * - "vinculada": apunta por id a una animación que existe.
 * - "pendiente": vino de un JSON importado y todavía no existe esa hoja/animación.
 *   Se resuelve por nombre en cuanto cargues la hoja que falta.
 *
 * El módulo Objetos NO importa nada del módulo Gráficos: sólo guarda ids y nombres.
 * Así cada contexto puede evolucionar sin romper al otro.
 */
export type ReferenciaGrafica =
  | { readonly tipo: "vinculada"; readonly hojaId: string; readonly animacionId: string; readonly frame: number }
  | { readonly tipo: "pendiente"; readonly nombreHoja: string; readonly nombreAnimacion: string; readonly frame: number };

export const Referencia = {
  vinculada(hojaId: string, animacionId: string, frame = 0): ReferenciaGrafica {
    return { tipo: "vinculada", hojaId, animacionId, frame: Math.max(0, Math.floor(frame)) };
  },
  pendiente(nombreHoja: string, nombreAnimacion: string, frame = 0): ReferenciaGrafica {
    return { tipo: "pendiente", nombreHoja, nombreAnimacion, frame: Math.max(0, Math.floor(frame)) };
  },
  conFrame(r: ReferenciaGrafica, frame: number): ReferenciaGrafica {
    return { ...r, frame: Math.max(0, Math.floor(frame)) };
  },
  iguales(a: ReferenciaGrafica | null | undefined, b: ReferenciaGrafica | null | undefined): boolean {
    if (!a || !b) return a === b;
    if (a.tipo === "vinculada" && b.tipo === "vinculada") return a.hojaId === b.hojaId && a.animacionId === b.animacionId && a.frame === b.frame;
    if (a.tipo === "pendiente" && b.tipo === "pendiente")
      return a.nombreHoja === b.nombreHoja && a.nombreAnimacion === b.nombreAnimacion && a.frame === b.frame;
    return false;
  },
};
