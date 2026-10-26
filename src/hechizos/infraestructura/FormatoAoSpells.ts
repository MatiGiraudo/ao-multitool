import type { ValorDeAtributo } from "@/compartido/dominio/Atributos";
import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import type { FormatoDeHechizos, HechizoImportado } from "../aplicacion/casosDeUso";
import type { Hechizo } from "../dominio/Hechizo";

/** Formato "ao-spells" v1: el contrato con Unity, en la línea de `ao-objs` y `ao-fx`. */

interface SpellJson {
  id?: number;
  name?: string;
  description?: string;
  words?: string;
  type?: string;
  target?: string;
  mana?: number;
  stamina?: number;
  minSkill?: number;
  minLevel?: number;
  flags?: Record<string, boolean>;
  stats?: Record<string, ValorDeAtributo>;
  fx?: number;
  sound?: string;
}

export class FormatoAoSpells implements FormatoDeHechizos {
  readonly nombreDeArchivo = "hechizos.json";

  exportar(hechizos: readonly Hechizo[]): string {
    const json = {
      format: "ao-spells",
      version: 1,
      spells: hechizos.map((h) => ({
        id: h.numero,
        name: h.nombre,
        description: h.descripcion,
        words: h.palabrasMagicas,
        type: h.tipo.id,
        target: h.objetivo,
        mana: h.mana,
        stamina: h.energia,
        minSkill: h.skillRequerido,
        minLevel: h.nivelMinimo,
        flags: Object.fromEntries(h.banderasVigentes().map((b) => [b, true])),
        stats: h.atributosVigentes(),
        fx: h.fx,
        sound: h.sonido,
      })),
    };
    return JSON.stringify(json, null, 2) + "\n";
  }

  leer(texto: string): HechizoImportado[] {
    let d: { spells?: SpellJson[] };
    try {
      d = JSON.parse(texto) as { spells?: SpellJson[] };
    } catch {
      throw new ErrorDeDominio("El texto no es un JSON válido.");
    }
    if (!d || !Array.isArray(d.spells)) throw new ErrorDeDominio('Falta la lista "spells".');
    return d.spells
      .filter((s) => Number.isInteger(Number(s.id)) && Number(s.id) > 0)
      .map((s) => ({
        numero: Number(s.id),
        nombre: String(s.name ?? ""),
        descripcion: String(s.description ?? ""),
        palabrasMagicas: String(s.words ?? ""),
        tipo: String(s.type ?? ""),
        objetivo: String(s.target ?? ""),
        mana: Number(s.mana) || 0,
        energia: Number(s.stamina) || 0,
        skillRequerido: Number(s.minSkill) || 0,
        nivelMinimo: Number(s.minLevel) || 0,
        banderas: Object.entries(s.flags ?? {})
          .filter(([, v]) => v)
          .map(([k]) => k),
        atributos: { ...(s.stats ?? {}) },
        fx: Number(s.fx) || 0,
        sonido: String(s.sound ?? ""),
      }));
  }
}
