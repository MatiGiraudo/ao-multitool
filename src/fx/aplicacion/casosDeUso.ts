import { referenciaDesdeNombre } from "@/compartido/aplicacion/ReferenciaPorNombre";
import type { GeneradorDeIds } from "@/compartido/aplicacion/GeneradorDeIds";
import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import { siguienteNumero } from "@/compartido/dominio/NumeroDeAo";
import { Efecto } from "../dominio/Efecto";
import type { EfectoRepositorio } from "../dominio/EfectoRepositorio";
import type { EfectoImportado, FormatoDeEfectos } from "./puertos";

export interface ResultadoDeImportacionDeEfectos {
  agregados: number;
  reemplazados: number;
  pendientes: number;
}

export class ListarEfectos {
  constructor(private readonly repo: EfectoRepositorio) {}
  async ejecutar(): Promise<Efecto[]> {
    return (await this.repo.listar()).sort((a, b) => a.numero - b.numero);
  }
}

export class CrearEfecto {
  constructor(
    private readonly repo: EfectoRepositorio,
    private readonly ids: GeneradorDeIds,
  ) {}
  async ejecutar(): Promise<Efecto> {
    const e = Efecto.crear(this.ids.nuevo(), siguienteNumero(await this.repo.listar()));
    await this.repo.guardar(e);
    return e;
  }
}

export class GuardarEfecto {
  constructor(private readonly repo: EfectoRepositorio) {}
  async ejecutar(e: Efecto): Promise<void> {
    await this.repo.guardar(e);
  }
}

export class DuplicarEfecto {
  constructor(
    private readonly repo: EfectoRepositorio,
    private readonly ids: GeneradorDeIds,
  ) {}
  async ejecutar(e: Efecto): Promise<Efecto> {
    const copia = e.duplicado(this.ids.nuevo(), siguienteNumero(await this.repo.listar()));
    await this.repo.guardar(copia);
    return copia;
  }
}

export class EliminarEfecto {
  constructor(private readonly repo: EfectoRepositorio) {}
  async ejecutar(clave: string): Promise<void> {
    await this.repo.eliminar(clave);
  }
}

export class ExportarEfectos {
  constructor(
    private readonly repo: EfectoRepositorio,
    private readonly formato: FormatoDeEfectos,
  ) {}
  async ejecutar(catalogo: CatalogoGrafico): Promise<{ nombreArchivo: string; contenido: string }> {
    const efectos = (await this.repo.listar()).sort((a, b) => a.numero - b.numero);
    return { nombreArchivo: this.formato.nombreDeArchivo, contenido: this.formato.exportar(efectos, catalogo) };
  }
}

/**
 * Importa un fx.json. Los efectos con el mismo ID se reemplazan, el resto se agrega.
 * Las animaciones que no se encuentran quedan "pendientes" y se resuelven solas al cargar esa hoja.
 */
export class ImportarEfectos {
  constructor(
    private readonly repo: EfectoRepositorio,
    private readonly formato: FormatoDeEfectos,
    private readonly ids: GeneradorDeIds,
  ) {}

  async ejecutar(texto: string, catalogo: CatalogoGrafico): Promise<ResultadoDeImportacionDeEfectos> {
    return this.importar(this.formato.leer(texto), catalogo);
  }

  async importar(importados: readonly EfectoImportado[], catalogo: CatalogoGrafico): Promise<ResultadoDeImportacionDeEfectos> {
    const existentes = await this.repo.listar();
    const porNumero = new Map(existentes.map((e) => [e.numero, e]));
    let agregados = 0,
      reemplazados = 0,
      pendientes = 0;
    const aGuardar: Efecto[] = [];
    for (const i of importados) {
      const previo = porNumero.get(i.numero);
      const e = Efecto.reconstituir({
        clave: previo?.clave ?? this.ids.nuevo(),
        numero: i.numero,
        nombre: i.nombre,
        animacion: referenciaDesdeNombre(i.animacion, catalogo),
        offsetX: i.offsetX,
        offsetY: i.offsetY,
        repeticiones: i.repeticiones,
        esEjemplo: false,
      });
      if (e.referenciasVigentes().some((r) => r.tipo === "pendiente")) pendientes++;
      if (previo) reemplazados++;
      else agregados++;
      porNumero.set(e.numero, e);
      aGuardar.push(e);
    }
    await this.repo.guardarVarios(aGuardar);
    return { agregados, reemplazados, pendientes };
  }
}
