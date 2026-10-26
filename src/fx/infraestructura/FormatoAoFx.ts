import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import type { ReferenciaPorNombre } from "@/compartido/aplicacion/ReferenciaPorNombre";
import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import type { Efecto } from "../dominio/Efecto";
import type { EfectoImportado, FormatoDeEfectos } from "../aplicacion/puertos";

/** Formato "ao-fx" v1: el contrato con Unity, en el mismo estilo que `ao-anim` y `ao-objs`. */

interface AnimJson {
  sheet?: string;
  anim?: string;
}
interface FxJson {
  id?: number;
  name?: string;
  anim?: AnimJson | null;
  offset?: { x?: number; y?: number } | null;
  loops?: number;
}

export class FormatoAoFx implements FormatoDeEfectos {
  readonly nombreDeArchivo = "fx.json";

  exportar(efectos: readonly Efecto[], catalogo: CatalogoGrafico): string {
    const json = {
      format: "ao-fx",
      version: 1,
      effects: efectos.map((e) => {
        const a = catalogo.resolver(e.animacion);
        const ref = e.animacion;
        const sheet = a ? a.nombreHoja : ref?.tipo === "pendiente" ? ref.nombreHoja : null;
        const anim = a ? a.nombreAnimacion : ref?.tipo === "pendiente" ? ref.nombreAnimacion : null;
        return {
          id: e.numero,
          name: e.nombre,
          anim: sheet && anim ? { sheet, anim } : null,
          offset: { x: e.offsetX, y: e.offsetY },
          loops: e.repeticiones,
        };
      }),
    };
    // Las referencias y los offsets vuelven a una línea: el archivo se lee y se versiona mucho mejor.
    return (
      JSON.stringify(json, null, 2)
        .replace(/\{\s*"sheet": ("(?:[^"\\]|\\.)*"),\s*"anim": ("(?:[^"\\]|\\.)*")\s*\}/g, (_m, s, a) => `{ "sheet": ${s}, "anim": ${a} }`)
        .replace(/\{\s*"x": (-?\d+),\s*"y": (-?\d+)\s*\}/g, (_m, x, y) => `{ "x": ${x}, "y": ${y} }`) + "\n"
    );
  }

  leer(texto: string): EfectoImportado[] {
    let d: { effects?: FxJson[] };
    try {
      d = JSON.parse(texto) as { effects?: FxJson[] };
    } catch {
      throw new ErrorDeDominio("El texto no es un JSON válido.");
    }
    if (!d || !Array.isArray(d.effects)) throw new ErrorDeDominio('Falta la lista "effects".');
    const ref = (a: AnimJson | null | undefined): ReferenciaPorNombre | null =>
      a && a.sheet && a.anim ? { hoja: String(a.sheet), animacion: String(a.anim), frame: 0 } : null;
    return d.effects
      .filter((e) => Number.isInteger(Number(e.id)) && Number(e.id) > 0)
      .map((e) => ({
        numero: Number(e.id),
        nombre: String(e.name ?? ""),
        animacion: ref(e.anim),
        offsetX: Math.round(Number(e.offset?.x) || 0),
        offsetY: Math.round(Number(e.offset?.y) || 0),
        repeticiones: Math.max(0, Math.round(Number(e.loops) || 0)),
      }));
  }
}
