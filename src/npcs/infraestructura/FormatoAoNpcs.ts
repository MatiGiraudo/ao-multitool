import type { ValorDeAtributo } from "@/compartido/dominio/Atributos";
import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import type { FormatoDeNpcs, NpcImportado } from "../aplicacion/casosDeUso";
import type { Npc } from "../dominio/Npc";

/** Formato "ao-npcs" v1: el contrato con Unity, en la línea de `ao-objs` y `ao-spells`. */

interface DropJson {
  item?: number;
  amount?: number;
  chance?: number;
}
interface VentaJson {
  item?: number;
  amount?: number;
}
interface NpcJson {
  id?: number;
  name?: string;
  description?: string;
  type?: string;
  appearance?: { body?: number; head?: number; heading?: string };
  movement?: string;
  flags?: Record<string, boolean>;
  stats?: Record<string, ValorDeAtributo>;
  spells?: number[];
  drops?: DropJson[];
  shop?: VentaJson[];
}

export class FormatoAoNpcs implements FormatoDeNpcs {
  readonly nombreDeArchivo = "npcs.json";

  exportar(npcs: readonly Npc[]): string {
    const json = {
      format: "ao-npcs",
      version: 1,
      npcs: npcs.map((n) => ({
        id: n.numero,
        name: n.nombre,
        description: n.descripcion,
        type: n.tipo.id,
        appearance: { body: n.cuerpo, head: n.cabeza, heading: n.direccion },
        movement: n.movimiento,
        flags: Object.fromEntries(n.banderasVigentes().map((b) => [b, true])),
        stats: n.atributosVigentes(),
        // Lo que no corresponde al tipo no se escribe: un banquero no exporta drops.
        spells: [...n.hechizosVigentes()],
        drops: n.dropsVigentes().map((d) => ({ item: d.objeto, amount: d.cantidad, chance: d.probabilidad })),
        shop: n.enVentaVigente().map((v) => ({ item: v.objeto, amount: v.cantidad })),
      })),
    };
    return (
      JSON.stringify(json, null, 2)
        .replace(/\{\s*"body": (-?\d+),\s*"head": (-?\d+),\s*"heading": ("[a-z]+")\s*\}/g, (_m, b, h, d) => `{ "body": ${b}, "head": ${h}, "heading": ${d} }`)
        .replace(/\{\s*"item": (\d+),\s*"amount": (\d+)(?:,\s*"chance": (\d+))?\s*\}/g, (_m, i, a, c) => `{ "item": ${i}, "amount": ${a}${c !== undefined ? `, "chance": ${c}` : ""} }`) + "\n"
    );
  }

  leer(texto: string): NpcImportado[] {
    let d: { npcs?: NpcJson[] };
    try {
      d = JSON.parse(texto) as { npcs?: NpcJson[] };
    } catch {
      throw new ErrorDeDominio("El texto no es un JSON válido.");
    }
    if (!d || !Array.isArray(d.npcs)) throw new ErrorDeDominio('Falta la lista "npcs".');
    return d.npcs
      .filter((n) => Number.isInteger(Number(n.id)) && Number(n.id) > 0)
      .map((n) => ({
        numero: Number(n.id),
        nombre: String(n.name ?? ""),
        descripcion: String(n.description ?? ""),
        tipo: String(n.type ?? ""),
        cuerpo: Number(n.appearance?.body) || 0,
        cabeza: Number(n.appearance?.head) || 0,
        direccion: String(n.appearance?.heading ?? "sur"),
        movimiento: String(n.movement ?? ""),
        banderas: Object.entries(n.flags ?? {})
          .filter(([, v]) => v)
          .map(([k]) => k),
        atributos: { ...(n.stats ?? {}) },
        hechizos: (n.spells ?? []).map(Number).filter((x) => Number.isInteger(x) && x > 0),
        drops: (n.drops ?? []).map((x) => ({
          objeto: Number(x.item) || 0,
          cantidad: Math.max(1, Number(x.amount) || 1),
          probabilidad: Math.min(100, Math.max(1, Number(x.chance) || 100)),
        })),
        enVenta: (n.shop ?? []).map((x) => ({ objeto: Number(x.item) || 0, cantidad: Math.max(1, Number(x.amount) || 1) })),
      }));
  }
}
