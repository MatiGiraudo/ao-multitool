import type { GeneradorDeIds } from "@/compartido/aplicacion/GeneradorDeIds";
import { referenciaDesdeNombre } from "@/compartido/aplicacion/ReferenciaPorNombre";
import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import type { ColeccionRepositorio } from "@/compartido/dominio/ColeccionRepositorio";
import { siguienteNumero } from "@/compartido/dominio/NumeroDeAo";
import type { Apariencia, EspecieDeApariencia } from "../dominio/Apariencia";
import type { FormatoDeApariencias } from "./puertos";

/*
 * Los casos de uso del módulo están escritos UNA vez y sirven para cuerpos y cabezas: lo único
 * que cambia entre las dos especies es lo que declara `EspecieDeApariencia` (cómo se crea, cómo
 * se duplica y cómo se arma desde un archivo).
 *
 * Es el mismo molde que en Objetos o FX, pero parametrizado. Si mañana aparece una tercera especie
 * de apariencia (cascos propios, por ejemplo), no hay casos de uso nuevos que escribir.
 */

export interface ResultadoDeImportacionDeApariencias {
  agregados: number;
  reemplazados: number;
  pendientes: number;
}

export class ListarApariencias<T extends Apariencia> {
  constructor(private readonly repo: ColeccionRepositorio<T>) {}
  async ejecutar(): Promise<T[]> {
    return (await this.repo.listar()).sort((a, b) => a.numero - b.numero);
  }
}

export class CrearApariencia<T extends Apariencia, I> {
  constructor(
    private readonly repo: ColeccionRepositorio<T>,
    private readonly ids: GeneradorDeIds,
    private readonly especie: EspecieDeApariencia<T, I>,
  ) {}
  async ejecutar(): Promise<T> {
    const item = this.especie.crear(this.ids.nuevo(), siguienteNumero(await this.repo.listar()));
    await this.repo.guardar(item);
    return item;
  }
}

export class GuardarApariencia<T extends Apariencia> {
  constructor(private readonly repo: ColeccionRepositorio<T>) {}
  async ejecutar(item: T): Promise<void> {
    await this.repo.guardar(item);
  }
}

export class DuplicarApariencia<T extends Apariencia, I> {
  constructor(
    private readonly repo: ColeccionRepositorio<T>,
    private readonly ids: GeneradorDeIds,
    private readonly especie: EspecieDeApariencia<T, I>,
  ) {}
  async ejecutar(item: T): Promise<T> {
    const copia = this.especie.duplicar(item, this.ids.nuevo(), siguienteNumero(await this.repo.listar()));
    await this.repo.guardar(copia);
    return copia;
  }
}

export class EliminarApariencia<T extends Apariencia> {
  constructor(private readonly repo: ColeccionRepositorio<T>) {}
  async ejecutar(clave: string): Promise<void> {
    await this.repo.eliminar(clave);
  }
}

export class ExportarApariencias<T extends Apariencia, I> {
  constructor(
    private readonly repo: ColeccionRepositorio<T>,
    private readonly formato: FormatoDeApariencias<T, I>,
  ) {}
  async ejecutar(catalogo: CatalogoGrafico): Promise<{ nombreArchivo: string; contenido: string }> {
    const items = (await this.repo.listar()).sort((a, b) => a.numero - b.numero);
    return { nombreArchivo: this.formato.nombreDeArchivo, contenido: this.formato.exportar(items, catalogo) };
  }
}

/**
 * Importa un archivo de la especie. Los que tienen el mismo ID se reemplazan, el resto se agrega.
 * Las animaciones que no se encuentran quedan "pendientes" y se resuelven al cargar esa hoja.
 */
export class ImportarApariencias<T extends Apariencia, I extends { numero: number }> {
  constructor(
    private readonly repo: ColeccionRepositorio<T>,
    private readonly formato: FormatoDeApariencias<T, I>,
    private readonly ids: GeneradorDeIds,
    private readonly especie: EspecieDeApariencia<T, I>,
  ) {}

  async ejecutar(texto: string, catalogo: CatalogoGrafico): Promise<ResultadoDeImportacionDeApariencias> {
    return this.importar(this.formato.leer(texto), catalogo);
  }

  async importar(importados: readonly I[], catalogo: CatalogoGrafico): Promise<ResultadoDeImportacionDeApariencias> {
    const existentes = await this.repo.listar();
    const porNumero = new Map(existentes.map((x) => [x.numero, x]));
    let agregados = 0,
      reemplazados = 0,
      pendientes = 0;
    const aGuardar: T[] = [];
    for (const i of importados) {
      const previo = porNumero.get(i.numero);
      const item = this.especie.desdeImportado(previo?.clave ?? this.ids.nuevo(), i, (r) => referenciaDesdeNombre(r, catalogo));
      if (item.referenciasVigentes().some((r) => r.tipo === "pendiente")) pendientes++;
      if (previo) reemplazados++;
      else agregados++;
      porNumero.set(item.numero, item);
      aGuardar.push(item);
    }
    await this.repo.guardarVarios(aGuardar);
    return { agregados, reemplazados, pendientes };
  }
}
