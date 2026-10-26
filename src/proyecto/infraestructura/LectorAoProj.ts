import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import { Frame } from "@/graficos/dominio/Frame";
import { Grilla } from "@/graficos/dominio/Grilla";
import type { Ancla } from "@/graficos/dominio/Ancla";
import type { ReferenciaPorNombre } from "@/compartido/aplicacion/ReferenciaPorNombre";
import { DIRECCIONES, type Direccion } from "@/compartido/dominio/Direccion";
import type { HojaLegada, LectorDeProyectoLegado, ProyectoLegado } from "../aplicacion/ImportarProyectoLegado";

/*
 * Lee el "proyecto-ao.json" que guardaba el indexador web (format "ao-proj").
 * Ahí las hojas traen la imagen embebida como data URL y los objetos apuntan a ids numéricos viejos;
 * este adaptador traduce esos ids a nombres para que el caso de uso los vuelva a vincular.
 */

const ANCLAS: Record<string, Ancla> = { bottom: "abajo-centro", center: "centro", topleft: "arriba-izquierda" };

interface RefVieja {
  s?: number;
  a?: number;
  f?: number;
  miss?: { sheet?: string; anim?: string };
}

export class LectorAoProj implements LectorDeProyectoLegado {
  leer(texto: string): ProyectoLegado {
    let d: {
      format?: string;
      sheets?: {
        id?: number;
        name?: string;
        imgData?: string | null;
        grid?: { w?: number; h?: number; ox?: number; oy?: number; sx?: number; sy?: number };
        anims?: { id?: number; name?: string; frameMs?: number; loop?: boolean; anchor?: string; frames?: { x: number; y: number; w: number; h: number; ms?: number }[] }[];
      }[];
      objects?: {
        id?: number;
        name?: string;
        type?: string;
        value?: number;
        description?: string;
        stackable?: boolean;
        minLevel?: number;
        flags?: Record<string, boolean>;
        stats?: Record<string, string | number>;
        gfx?: { icon?: RefVieja | null; ground?: RefVieja | null; equip?: Record<string, RefVieja> };
      }[];
    };
    try {
      d = JSON.parse(texto);
    } catch {
      throw new ErrorDeDominio("El archivo no es un JSON válido.");
    }
    if (d?.format !== "ao-proj") throw new ErrorDeDominio('Este archivo no es un "proyecto-ao.json" del indexador.');

    const nombres = new Map<string, { hoja: string; animacion: string }>();
    const hojas: HojaLegada[] = (d.sheets ?? []).map((s) => {
      const nombreArchivo = String(s.name ?? "hoja.png");
      for (const a of s.anims ?? []) nombres.set(`${s.id}:${a.id}`, { hoja: nombreArchivo, animacion: String(a.name ?? "anim") });
      const g = s.grid;
      return {
        nombreArchivo,
        png: s.imgData ? dataUrlABlob(s.imgData) : null,
        grilla: g && g.w && g.h ? Grilla.crear({ anchoCelda: g.w, altoCelda: g.h, offsetX: g.ox, offsetY: g.oy, separacionX: g.sx, separacionY: g.sy }) : null,
        animaciones: (s.anims ?? []).map((a) => ({
          nombre: String(a.name ?? "anim"),
          msPorFrame: Math.max(10, Number(a.frameMs) || 120),
          enBucle: a.loop !== false,
          ancla: ANCLAS[a.anchor ?? ""] ?? "abajo-centro",
          frames: (a.frames ?? []).map((f) => Frame.deCoordenadas(f.x, f.y, f.w, f.h, f.ms && f.ms > 0 ? f.ms : null)),
        })),
      };
    });

    const ref = (r: RefVieja | null | undefined): ReferenciaPorNombre | null => {
      if (!r) return null;
      if (r.miss?.sheet && r.miss.anim) return { hoja: r.miss.sheet, animacion: r.miss.anim, frame: r.f ?? 0 };
      const n = nombres.get(`${r.s}:${r.a}`);
      return n ? { ...n, frame: r.f ?? 0 } : null;
    };

    const objetos = (d.objects ?? [])
      .filter((o) => Number.isInteger(Number(o.id)) && Number(o.id) > 0)
      .map((o) => {
        const equipado: Partial<Record<Direccion, ReferenciaPorNombre>> = {};
        for (const dir of DIRECCIONES) {
          const r = ref(o.gfx?.equip?.[dir.valor]);
          if (r) equipado[dir.valor] = { ...r, frame: 0 };
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
          graficos: { icono: ref(o.gfx?.icon), suelo: ref(o.gfx?.ground), equipado },
        };
      });

    return { hojas, objetos };
  }
}

function dataUrlABlob(url: string): Blob | null {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(url);
  if (!m) return null;
  const tipo = m[1] ?? "image/png";
  const datos = m[3] ?? "";
  if (m[2]) {
    const bin = atob(datos);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: tipo });
  }
  return new Blob([decodeURIComponent(datos)], { type: tipo });
}
