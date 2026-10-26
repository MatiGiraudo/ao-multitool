import type { GeneradorDeIds } from "@/compartido/aplicacion/GeneradorDeIds";
import type { ValorDeAtributo } from "@/compartido/dominio/Atributos";
import { siguienteNumero } from "@/compartido/dominio/NumeroDeAo";
import { Hechizo } from "../dominio/Hechizo";
import type { HechizoRepositorio } from "../dominio/HechizoRepositorio";
import { esObjetivoValido, esTipoDeHechizoValido } from "../dominio/TipoDeHechizo";

/** Un hechizo tal como viaja en un archivo. A diferencia de los gráficos, acá no hay nada que resolver. */
export interface HechizoImportado {
  numero: number;
  nombre: string;
  descripcion: string;
  palabrasMagicas: string;
  tipo: string;
  objetivo: string;
  mana: number;
  energia: number;
  skillRequerido: number;
  nivelMinimo: number;
  banderas: string[];
  atributos: Record<string, ValorDeAtributo>;
  fx: number;
  sonido: string;
}

/** El formato de intercambio de hechizos (hoy: "ao-spells" v1). */
export interface FormatoDeHechizos {
  readonly nombreDeArchivo: string;
  exportar(hechizos: readonly Hechizo[]): string;
  leer(texto: string): HechizoImportado[];
}

export interface ResultadoDeImportacionDeHechizos {
  agregados: number;
  reemplazados: number;
}

export class ListarHechizos {
  constructor(private readonly repo: HechizoRepositorio) {}
  async ejecutar(): Promise<Hechizo[]> {
    return (await this.repo.listar()).sort((a, b) => a.numero - b.numero);
  }
}

export class CrearHechizo {
  constructor(
    private readonly repo: HechizoRepositorio,
    private readonly ids: GeneradorDeIds,
  ) {}
  async ejecutar(): Promise<Hechizo> {
    const h = Hechizo.crear(this.ids.nuevo(), siguienteNumero(await this.repo.listar()));
    await this.repo.guardar(h);
    return h;
  }
}

export class GuardarHechizo {
  constructor(private readonly repo: HechizoRepositorio) {}
  async ejecutar(h: Hechizo): Promise<void> {
    await this.repo.guardar(h);
  }
}

export class DuplicarHechizo {
  constructor(
    private readonly repo: HechizoRepositorio,
    private readonly ids: GeneradorDeIds,
  ) {}
  async ejecutar(h: Hechizo): Promise<Hechizo> {
    const copia = h.duplicado(this.ids.nuevo(), siguienteNumero(await this.repo.listar()));
    await this.repo.guardar(copia);
    return copia;
  }
}

export class EliminarHechizo {
  constructor(private readonly repo: HechizoRepositorio) {}
  async ejecutar(clave: string): Promise<void> {
    await this.repo.eliminar(clave);
  }
}

export class ExportarHechizos {
  constructor(
    private readonly repo: HechizoRepositorio,
    private readonly formato: FormatoDeHechizos,
  ) {}
  async ejecutar(): Promise<{ nombreArchivo: string; contenido: string }> {
    const hechizos = (await this.repo.listar()).sort((a, b) => a.numero - b.numero);
    return { nombreArchivo: this.formato.nombreDeArchivo, contenido: this.formato.exportar(hechizos) };
  }
}

/** Importa un hechizos.json. Los que tienen el mismo ID se reemplazan, el resto se agrega. */
export class ImportarHechizos {
  constructor(
    private readonly repo: HechizoRepositorio,
    private readonly formato: FormatoDeHechizos,
    private readonly ids: GeneradorDeIds,
  ) {}

  async ejecutar(texto: string): Promise<ResultadoDeImportacionDeHechizos> {
    return this.importar(this.formato.leer(texto));
  }

  async importar(importados: readonly HechizoImportado[]): Promise<ResultadoDeImportacionDeHechizos> {
    const existentes = await this.repo.listar();
    const porNumero = new Map(existentes.map((h) => [h.numero, h]));
    let agregados = 0,
      reemplazados = 0;
    const aGuardar: Hechizo[] = [];

    for (const i of importados) {
      const previo = porNumero.get(i.numero);
      const h = Hechizo.reconstituir({
        clave: previo?.clave ?? this.ids.nuevo(),
        numero: i.numero,
        nombre: i.nombre,
        descripcion: i.descripcion,
        palabrasMagicas: i.palabrasMagicas,
        // Lo que no se reconoce no rompe la importación: cae en un valor sano y se ve en la ficha.
        tipo: esTipoDeHechizoValido(i.tipo) ? i.tipo : "dano",
        objetivo: esObjetivoValido(i.objetivo) ? i.objetivo : "ambos",
        mana: Math.max(0, i.mana || 0),
        energia: Math.max(0, i.energia || 0),
        skillRequerido: Math.max(0, i.skillRequerido || 0),
        nivelMinimo: Math.max(0, i.nivelMinimo || 0),
        banderas: i.banderas,
        atributos: i.atributos,
        fx: Math.max(0, i.fx || 0),
        sonido: i.sonido,
        esEjemplo: false,
      });
      if (previo) reemplazados++;
      else agregados++;
      porNumero.set(h.numero, h);
      aGuardar.push(h);
    }

    await this.repo.guardarVarios(aGuardar);
    return { agregados, reemplazados };
  }
}
