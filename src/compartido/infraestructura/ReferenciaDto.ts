import type { ReferenciaGrafica } from "@/compartido/dominio/ReferenciaGrafica";

/**
 * Valida una referencia gráfica que viene de afuera (de un JSON en disco o de una petición HTTP).
 *
 * Nunca se confía en la forma del dato: si no es exactamente una referencia conocida, se descarta.
 * Lo usan todos los mappers que guardan vínculos a animaciones.
 */
export function referenciaValida(r: unknown): ReferenciaGrafica | null {
  if (!r || typeof r !== "object") return null;
  const x = r as Record<string, unknown>;
  const frame = Math.max(0, Math.floor(Number(x.frame) || 0));
  if (x.tipo === "vinculada" && typeof x.hojaId === "string" && typeof x.animacionId === "string")
    return { tipo: "vinculada", hojaId: x.hojaId, animacionId: x.animacionId, frame };
  if (x.tipo === "pendiente" && typeof x.nombreHoja === "string" && typeof x.nombreAnimacion === "string")
    return { tipo: "pendiente", nombreHoja: x.nombreHoja, nombreAnimacion: x.nombreAnimacion, frame };
  return null;
}
