import type { GeneradorDeIds } from "@/compartido/aplicacion/GeneradorDeIds";
import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import { DIRECCIONES, type Direccion } from "@/compartido/dominio/Direccion";
import { siguienteNumero } from "@/compartido/dominio/NumeroDeAo";
import { Objeto } from "../dominio/Objeto";
import type { ObjetoRepositorio } from "../dominio/ObjetoRepositorio";
import { referenciaDesdeNombre, type ReferenciaPorNombre } from "@/compartido/aplicacion/ReferenciaPorNombre";
import type { ReferenciaGrafica } from "@/compartido/dominio/ReferenciaGrafica";
import { autovincularEquipado } from "../dominio/servicios";
import { esTipoValido } from "../dominio/TipoDeObjeto";
import type { FormatoDeObjetos, ObjetoImportado } from "./puertos";

export interface ResultadoDeImportacion {
  agregados: number;
  reemplazados: number;
  pendientes: number;
}

export class ListarObjetos {
  constructor(private readonly repo: ObjetoRepositorio) {}
  async ejecutar(): Promise<Objeto[]> {
    return (await this.repo.listar()).sort((a, b) => a.numero - b.numero);
  }
}

export class CrearObjeto {
  constructor(
    private readonly repo: ObjetoRepositorio,
    private readonly ids: GeneradorDeIds,
  ) {}
  async ejecutar(): Promise<Objeto> {
    const o = Objeto.crear(this.ids.nuevo(), siguienteNumero(await this.repo.listar()));
    await this.repo.guardar(o);
    return o;
  }
}

export class GuardarObjeto {
  constructor(private readonly repo: ObjetoRepositorio) {}
  async ejecutar(o: Objeto): Promise<void> {
    await this.repo.guardar(o);
  }
}

export class DuplicarObjeto {
  constructor(
    private readonly repo: ObjetoRepositorio,
    private readonly ids: GeneradorDeIds,
  ) {}
  async ejecutar(o: Objeto): Promise<Objeto> {
    const copia = o.duplicado(this.ids.nuevo(), siguienteNumero(await this.repo.listar()));
    await this.repo.guardar(copia);
    return copia;
  }
}

export class EliminarObjeto {
  constructor(private readonly repo: ObjetoRepositorio) {}
  async ejecutar(clave: string): Promise<void> {
    await this.repo.eliminar(clave);
  }
}

export class AutovincularEquipado {
  constructor(private readonly repo: ObjetoRepositorio) {}
  async ejecutar(o: Objeto, hojaId: string, catalogo: CatalogoGrafico): Promise<{ objeto: Objeto; cantidad: number }> {
    const r = autovincularEquipado(o, hojaId, catalogo);
    if (r.cantidad) await this.repo.guardar(r.objeto);
    return r;
  }
}

export class ExportarObjetos {
  constructor(
    private readonly repo: ObjetoRepositorio,
    private readonly formato: FormatoDeObjetos,
  ) {}
  async ejecutar(catalogo: CatalogoGrafico): Promise<{ nombreArchivo: string; contenido: string }> {
    const objetos = (await this.repo.listar()).sort((a, b) => a.numero - b.numero);
    return { nombreArchivo: this.formato.nombreDeArchivo, contenido: this.formato.exportar(objetos, catalogo) };
  }
}

/**
 * Importa un objetos.json. Los objetos con el mismo ID (número) se reemplazan, el resto se agrega.
 * Las referencias que no se encuentran quedan "pendientes" y se resuelven solas cuando cargues esa hoja.
 */
export class ImportarObjetos {
  constructor(
    private readonly repo: ObjetoRepositorio,
    private readonly formato: FormatoDeObjetos,
    private readonly ids: GeneradorDeIds,
  ) {}
  async ejecutar(texto: string, catalogo: CatalogoGrafico): Promise<ResultadoDeImportacion> {
    return this.importar(this.formato.leer(texto), catalogo);
  }

  /** Lo mismo pero con los objetos ya leídos (lo usa la importación de proyectos completos). */
  async importar(importados: readonly ObjetoImportado[], catalogo: CatalogoGrafico): Promise<ResultadoDeImportacion> {
    const existentes = await this.repo.listar();
    const porNumero = new Map(existentes.map((o) => [o.numero, o]));
    const aRef = (r: ReferenciaPorNombre | null | undefined) => referenciaDesdeNombre(r, catalogo);
    let agregados = 0,
      reemplazados = 0,
      pendientes = 0;
    const aGuardar: Objeto[] = [];
    for (const i of importados) {
      const previo = porNumero.get(i.numero);
      const equipado: Partial<Record<Direccion, ReferenciaGrafica>> = {};
      for (const d of DIRECCIONES) {
        const r = aRef(i.graficos.equipado[d.valor]);
        if (r) equipado[d.valor] = r;
      }
      const o = Objeto.reconstituir({
        clave: previo?.clave ?? this.ids.nuevo(),
        numero: i.numero,
        nombre: i.nombre,
        tipo: esTipoValido(i.tipo) ? i.tipo : "otro",
        valor: Math.max(0, i.valor || 0),
        descripcion: i.descripcion,
        apilable: i.apilable,
        nivelMinimo: Math.max(0, i.nivelMinimo || 0),
        banderas: i.banderas,
        atributos: i.atributos,
        graficos: { icono: aRef(i.graficos.icono), suelo: aRef(i.graficos.suelo), equipado },
        esEjemplo: false,
      });
      if (o.referenciasVigentes().some((r) => r.tipo === "pendiente")) pendientes++;
      if (previo) reemplazados++;
      else agregados++;
      porNumero.set(o.numero, o);
      aGuardar.push(o);
    }
    await this.repo.guardarVarios(aGuardar);
    return { agregados, reemplazados, pendientes };
  }
}
