import type { GeneradorDeIds } from "@/compartido/aplicacion/GeneradorDeIds";
import type { ValorDeAtributo } from "@/compartido/dominio/Atributos";
import type { Direccion } from "@/compartido/dominio/Direccion";
import { siguienteNumero } from "@/compartido/dominio/NumeroDeAo";
import { Npc, type Drop, type EnVenta } from "../dominio/Npc";
import type { NpcRepositorio } from "../dominio/NpcRepositorio";
import { esMovimientoValido, esTipoDeNpcValido } from "../dominio/TipoDeNpc";

/** Un NPC tal como viaja en un archivo. Todo lo que apunta a otra familia va por número. */
export interface NpcImportado {
  numero: number;
  nombre: string;
  descripcion: string;
  tipo: string;
  cuerpo: number;
  cabeza: number;
  direccion: string;
  movimiento: string;
  banderas: string[];
  atributos: Record<string, ValorDeAtributo>;
  hechizos: number[];
  drops: Drop[];
  enVenta: EnVenta[];
}

/** El formato de intercambio de NPCs (hoy: "ao-npcs" v1). */
export interface FormatoDeNpcs {
  readonly nombreDeArchivo: string;
  exportar(npcs: readonly Npc[]): string;
  leer(texto: string): NpcImportado[];
}

export interface ResultadoDeImportacionDeNpcs {
  agregados: number;
  reemplazados: number;
}

export class ListarNpcs {
  constructor(private readonly repo: NpcRepositorio) {}
  async ejecutar(): Promise<Npc[]> {
    return (await this.repo.listar()).sort((a, b) => a.numero - b.numero);
  }
}

export class CrearNpc {
  constructor(
    private readonly repo: NpcRepositorio,
    private readonly ids: GeneradorDeIds,
  ) {}
  async ejecutar(): Promise<Npc> {
    const n = Npc.crear(this.ids.nuevo(), siguienteNumero(await this.repo.listar()));
    await this.repo.guardar(n);
    return n;
  }
}

export class GuardarNpc {
  constructor(private readonly repo: NpcRepositorio) {}
  async ejecutar(n: Npc): Promise<void> {
    await this.repo.guardar(n);
  }
}

export class DuplicarNpc {
  constructor(
    private readonly repo: NpcRepositorio,
    private readonly ids: GeneradorDeIds,
  ) {}
  async ejecutar(n: Npc): Promise<Npc> {
    const copia = n.duplicado(this.ids.nuevo(), siguienteNumero(await this.repo.listar()));
    await this.repo.guardar(copia);
    return copia;
  }
}

export class EliminarNpc {
  constructor(private readonly repo: NpcRepositorio) {}
  async ejecutar(clave: string): Promise<void> {
    await this.repo.eliminar(clave);
  }
}

export class ExportarNpcs {
  constructor(
    private readonly repo: NpcRepositorio,
    private readonly formato: FormatoDeNpcs,
  ) {}
  async ejecutar(): Promise<{ nombreArchivo: string; contenido: string }> {
    const npcs = (await this.repo.listar()).sort((a, b) => a.numero - b.numero);
    return { nombreArchivo: this.formato.nombreDeArchivo, contenido: this.formato.exportar(npcs) };
  }
}

/** Importa un npcs.json. Los que tienen el mismo ID se reemplazan, el resto se agrega. */
export class ImportarNpcs {
  constructor(
    private readonly repo: NpcRepositorio,
    private readonly formato: FormatoDeNpcs,
    private readonly ids: GeneradorDeIds,
  ) {}

  async ejecutar(texto: string): Promise<ResultadoDeImportacionDeNpcs> {
    return this.importar(this.formato.leer(texto));
  }

  async importar(importados: readonly NpcImportado[]): Promise<ResultadoDeImportacionDeNpcs> {
    const existentes = await this.repo.listar();
    const porNumero = new Map(existentes.map((n) => [n.numero, n]));
    let agregados = 0,
      reemplazados = 0;
    const aGuardar: Npc[] = [];

    for (const i of importados) {
      const previo = porNumero.get(i.numero);
      const npc = Npc.reconstituir({
        clave: previo?.clave ?? this.ids.nuevo(),
        numero: i.numero,
        nombre: i.nombre,
        descripcion: i.descripcion,
        // Lo que no se reconoce cae en algo sano en vez de romper la importación entera.
        tipo: esTipoDeNpcValido(i.tipo) ? i.tipo : "otro",
        cuerpo: Math.max(0, Math.round(i.cuerpo || 0)),
        cabeza: Math.max(0, Math.round(i.cabeza || 0)),
        direccion: (["sur", "norte", "este", "oeste"].includes(i.direccion) ? i.direccion : "sur") as Direccion,
        movimiento: esMovimientoValido(i.movimiento) ? i.movimiento : "quieto",
        banderas: i.banderas,
        atributos: i.atributos,
        hechizos: i.hechizos.filter((n) => Number.isInteger(n) && n > 0),
        drops: i.drops.filter((d) => d.objeto > 0 && d.cantidad > 0),
        enVenta: i.enVenta.filter((v) => v.objeto > 0 && v.cantidad > 0),
        esEjemplo: false,
      });
      if (previo) reemplazados++;
      else agregados++;
      porNumero.set(npc.numero, npc);
      aGuardar.push(npc);
    }

    await this.repo.guardarVarios(aGuardar);
    return { agregados, reemplazados };
  }
}
