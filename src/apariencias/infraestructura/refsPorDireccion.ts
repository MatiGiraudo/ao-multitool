import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import { DIRECCIONES, type Direccion } from "@/compartido/dominio/Direccion";
import type { PorDireccion } from "@/compartido/dominio/PorDireccion";
import type { ReferenciaGrafica } from "@/compartido/dominio/ReferenciaGrafica";
import type { ReferenciaImportada } from "../dominio/Apariencia";

/*
 * La parte que los dos formatos (ao-bodies y ao-heads) escriben y leen igual: el bloque
 * `graphics` con una referencia por dirección, siempre con las cuatro claves, en el mismo orden.
 */

export interface RefJson {
  sheet?: string;
  anim?: string;
  frame?: number;
}

/** Del dominio al archivo: ids adentro, nombres afuera. `conFrame` lo piden las cabezas. */
export function graficosAJson(
  direcciones: PorDireccion<ReferenciaGrafica>,
  catalogo: CatalogoGrafico,
  conFrame: boolean,
): Record<string, RefJson | null> {
  const out: Record<string, RefJson | null> = {};
  for (const d of DIRECCIONES) {
    const ref = direcciones[d.valor] ?? null;
    const a = catalogo.resolver(ref);
    const sheet = a ? a.nombreHoja : ref?.tipo === "pendiente" ? ref.nombreHoja : null;
    const anim = a ? a.nombreAnimacion : ref?.tipo === "pendiente" ? ref.nombreAnimacion : null;
    if (!ref || !sheet || !anim) {
      out[d.valor] = null;
      continue;
    }
    const frame = a ? Math.min(ref.frame, Math.max(0, a.cantidadDeFrames - 1)) : ref.frame;
    out[d.valor] = conFrame ? { sheet, anim, frame } : { sheet, anim };
  }
  return out;
}

/** Del archivo al dominio (todavía por nombres: el caso de uso los resuelve contra el catálogo). */
export function graficosDesdeJson(g: Partial<Record<Direccion, RefJson | null>> | undefined): Partial<Record<Direccion, ReferenciaImportada>> {
  const out: Partial<Record<Direccion, ReferenciaImportada>> = {};
  for (const d of DIRECCIONES) {
    const r = g?.[d.valor];
    if (r && r.sheet && r.anim) out[d.valor] = { hoja: String(r.sheet), animacion: String(r.anim), frame: Math.max(0, Number(r.frame) || 0) };
  }
  return out;
}

/** Deja las referencias y los offsets en una línea, como en los demás formatos del editor. */
export function compactar(json: string): string {
  return json
    .replace(
      /\{\s*"sheet": ("(?:[^"\\]|\\.)*"),\s*"anim": ("(?:[^"\\]|\\.)*")(?:,\s*"frame": (\d+))?\s*\}/g,
      (_m, s, a, f) => `{ "sheet": ${s}, "anim": ${a}${f !== undefined ? `, "frame": ${f}` : ""} }`,
    )
    .replace(/\{\s*"x": (-?\d+),\s*"y": (-?\d+)\s*\}/g, (_m, x, y) => `{ "x": ${x}, "y": ${y} }`);
}
