import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import type { CatalogoGrafico } from "../dominio/CatalogoGrafico";
import { DIRECCIONES, type Direccion } from "../dominio/Direccion";
import type { Objeto, ValorDeAtributo } from "../dominio/Objeto";
import type { ReferenciaGrafica } from "../dominio/ReferenciaGrafica";
import type { FormatoDeObjetos, ObjetoImportado, ReferenciaPorNombre } from "../aplicacion/puertos";

/** Formato "ao-objs" v1: el mismo que exportaba el indexador web. Es el contrato con Unity. */

interface RefJson {
  sheet?: string;
  anim?: string;
  frame?: number;
}
interface ObjJson {
  id?: number;
  name?: string;
  type?: string;
  description?: string;
  value?: number;
  stackable?: boolean;
  minLevel?: number;
  flags?: Record<string, boolean>;
  stats?: Record<string, ValorDeAtributo>;
  graphics?: { icon?: RefJson | null; ground?: RefJson | null; equipped?: Partial<Record<Direccion, RefJson | null>> };
}

export class FormatoAoObjs implements FormatoDeObjetos {
  readonly nombreDeArchivo = "objetos.json";

  exportar(objetos: readonly Objeto[], catalogo: CatalogoGrafico): string {
    const ref = (r: ReferenciaGrafica | null, conFrame: boolean) => {
      if (!r) return null;
      const a = catalogo.resolver(r);
      const sheet = a ? a.nombreHoja : r.tipo === "pendiente" ? r.nombreHoja : null;
      const anim = a ? a.nombreAnimacion : r.tipo === "pendiente" ? r.nombreAnimacion : null;
      if (!sheet || !anim) return null;
      const frame = a ? Math.min(r.frame, Math.max(0, a.cantidadDeFrames - 1)) : r.frame;
      return conFrame ? { sheet, anim, frame } : { sheet, anim };
    };
    const json = {
      format: "ao-objs",
      version: 1,
      objects: objetos.map((o) => {
        const graphics: Record<string, unknown> = { icon: ref(o.graficos.icono, true), ground: ref(o.graficos.suelo, true) };
        if (o.tipo.equipable) {
          const eq: Record<string, unknown> = {};
          for (const d of DIRECCIONES) eq[d.valor] = ref(o.graficos.equipado[d.valor] ?? null, false);
          graphics.equipped = eq;
        }
        return {
          id: o.numero,
          name: o.nombre,
          type: o.tipo.id,
          description: o.descripcion,
          value: o.valor,
          stackable: o.apilable,
          minLevel: o.nivelMinimo,
          flags: Object.fromEntries(o.banderasVigentes().map((b) => [b, true])),
          stats: o.atributosVigentes(),
          graphics,
        };
      }),
    };
    return (
      JSON.stringify(json, null, 2).replace(
        /\{\s*"sheet": ("(?:[^"\\]|\\.)*"),\s*"anim": ("(?:[^"\\]|\\.)*")(?:,\s*"frame": (\d+))?\s*\}/g,
        (_m, a, b, f) => `{ "sheet": ${a}, "anim": ${b}${f !== undefined ? `, "frame": ${f}` : ""} }`,
      ) + "\n"
    );
  }

  leer(texto: string): ObjetoImportado[] {
    let d: { objects?: ObjJson[] };
    try {
      d = JSON.parse(texto) as { objects?: ObjJson[] };
    } catch {
      throw new ErrorDeDominio("El texto no es un JSON válido.");
    }
    if (!d || !Array.isArray(d.objects)) throw new ErrorDeDominio('Falta la lista "objects".');
    const ref = (r: RefJson | null | undefined): ReferenciaPorNombre | null =>
      r && r.sheet && r.anim ? { hoja: String(r.sheet), animacion: String(r.anim), frame: Math.max(0, Number(r.frame) || 0) } : null;
    return d.objects
      .filter((o) => Number.isInteger(Number(o.id)) && Number(o.id) > 0)
      .map((o) => {
        const equipado: Partial<Record<Direccion, ReferenciaPorNombre>> = {};
        for (const dir of DIRECCIONES) {
          const r = ref(o.graphics?.equipped?.[dir.valor]);
          if (r) equipado[dir.valor] = r;
        }
        return {
          numero: Number(o.id),
          nombre: String(o.name ?? ""),
          tipo: String(o.type ?? "otro"),
          valor: Number(o.value) || 0,
          descripcion: String(o.description ?? ""),
          apilable: !!o.stackable,
          nivelMinimo: Number(o.minLevel) || 0,
          banderas: Object.entries(o.flags ?? {})
            .filter(([, v]) => v)
            .map(([k]) => k),
          atributos: { ...(o.stats ?? {}) },
          graficos: { icono: ref(o.graphics?.icon), suelo: ref(o.graphics?.ground), equipado },
        };
      });
  }
}
