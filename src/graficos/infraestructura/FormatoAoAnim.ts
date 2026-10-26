import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import { pivoteDe, type Ancla } from "../dominio/Ancla";
import { Frame } from "../dominio/Frame";
import { Grilla } from "../dominio/Grilla";
import type { HojaDeSprites } from "../dominio/HojaDeSprites";
import type { AnimacionesImportadas, FormatoDeAnimaciones } from "../aplicacion/puertos";

/*
 * Formato "ao-anim" v1: el mismo JSON que exportaba el indexador web.
 * Es el contrato con Unity, por eso sus claves están en inglés y no cambian aunque el dominio cambie.
 */

const ANCLA_A_JSON: Record<Ancla, string> = { "abajo-centro": "bottom", centro: "center", "arriba-izquierda": "topleft" };
const JSON_A_ANCLA: Record<string, Ancla> = { bottom: "abajo-centro", center: "centro", topleft: "arriba-izquierda" };

interface AoAnimJson {
  format?: string;
  version?: number;
  image?: { file?: string; width?: number; height?: number };
  animations?: {
    name?: string;
    frameMs?: number;
    loop?: boolean;
    anchor?: string;
    frames?: { x?: number; y?: number; w?: number; h?: number; ms?: number }[];
  }[];
  editor?: { grid?: { w?: number; h?: number; ox?: number; oy?: number; sx?: number; sy?: number } };
}

export class FormatoAoAnim implements FormatoDeAnimaciones {
  nombreDeArchivoPara(hoja: HojaDeSprites): string {
    return hoja.nombreArchivo.replace(/\.[^.]+$/, "") + ".anim.json";
  }

  exportar(hoja: HojaDeSprites): string {
    const g = hoja.grilla;
    const json = {
      format: "ao-anim",
      version: 1,
      image: { file: hoja.nombreArchivo, width: hoja.tamanio?.ancho ?? 0, height: hoja.tamanio?.alto ?? 0 },
      animations: hoja.animaciones.map((a) => ({
        name: a.nombre,
        frameMs: a.msPorFrame,
        loop: a.enBucle,
        pivot: pivoteDe(a.ancla),
        anchor: ANCLA_A_JSON[a.ancla],
        frames: a.frames.map((f) => {
          const o: Record<string, number> = { x: f.rect.x, y: f.rect.y, w: f.rect.ancho, h: f.rect.alto };
          if (f.duracionMs !== null) o.ms = f.duracionMs;
          return o;
        }),
      })),
      editor: { grid: { w: g.anchoCelda, h: g.altoCelda, ox: g.offsetX, oy: g.offsetY, sx: g.separacionX, sy: g.separacionY } },
    };
    // Cada frame y cada pivote en una sola línea: el archivo queda legible y los diffs de git son claros.
    return (
      JSON.stringify(json, null, 2)
        .replace(
          /\{\s*"x": (\d+),\s*"y": (\d+),\s*"w": (\d+),\s*"h": (\d+)(?:,\s*"ms": (\d+))?\s*\}/g,
          (_m, x, y, w, h, ms) => `{ "x": ${x}, "y": ${y}, "w": ${w}, "h": ${h}${ms ? `, "ms": ${ms}` : ""} }`,
        )
        .replace(/"pivot": \{\s*"x": ([\d.]+),\s*"y": ([\d.]+)\s*\}/g, '"pivot": { "x": $1, "y": $2 }') + "\n"
    );
  }

  leer(texto: string): AnimacionesImportadas {
    let d: AoAnimJson;
    try {
      d = JSON.parse(texto) as AoAnimJson;
    } catch {
      throw new ErrorDeDominio("El texto no es un JSON válido.");
    }
    if (!d || !Array.isArray(d.animations)) throw new ErrorDeDominio('Falta la lista "animations".');
    const gr = d.editor?.grid;
    return {
      nombreArchivo: d.image?.file ? String(d.image.file) : null,
      grilla: gr && gr.w && gr.h ? Grilla.crear({ anchoCelda: gr.w, altoCelda: gr.h, offsetX: gr.ox, offsetY: gr.oy, separacionX: gr.sx, separacionY: gr.sy }) : null,
      animaciones: d.animations.map((a) => ({
        nombre: String(a.name ?? "anim"),
        msPorFrame: Math.max(10, Number(a.frameMs) || 120),
        enBucle: a.loop !== false,
        ancla: JSON_A_ANCLA[a.anchor ?? ""] ?? "abajo-centro",
        frames: (a.frames ?? []).map((f) => Frame.deCoordenadas(+(f.x ?? 0), +(f.y ?? 0), +(f.w ?? 1), +(f.h ?? 1), f.ms && f.ms > 0 ? +f.ms : null)),
      })),
    };
  }
}
