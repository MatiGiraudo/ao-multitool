import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import type { FormatoDeAnimaciones } from "@/graficos/aplicacion/puertos";
import type { HojaRepositorio } from "@/graficos/dominio/HojaRepositorio";
import type { FabricaDeCatalogo } from "./ImportarProyectoLegado";

/*
 * Exportar el mundo entero de una vez.
 *
 * Cada módulo ya sabe exportar lo suyo; lo que faltaba es juntarlo. Es lo que el lado de Unity
 * quiere leer: una carpeta con todos los JSON, no siete descargas desde siete pantallas.
 */

export interface ArchivoExportado {
  nombreArchivo: string;
  contenido: string;
}

/** Lo que este caso de uso necesita de cada módulo: un archivo, dado el catálogo de gráficos. */
export type ExportarCatalogo = (catalogo: CatalogoGrafico) => Promise<ArchivoExportado>;

export class ExportarTodo {
  constructor(
    private readonly hojas: HojaRepositorio,
    private readonly formatoDeAnimaciones: FormatoDeAnimaciones,
    private readonly fabricaDeCatalogo: FabricaDeCatalogo,
    /** Los exportadores de los catálogos (objetos, FX, cuerpos, cabezas, hechizos). */
    private readonly catalogos: readonly ExportarCatalogo[],
  ) {}

  async ejecutar(): Promise<ArchivoExportado[]> {
    const hojas = await this.hojas.listar();
    const catalogo = this.fabricaDeCatalogo(hojas);
    const archivos = await Promise.all(this.catalogos.map((exportar) => exportar(catalogo)));

    // Un .anim.json por hoja, pero sólo de las que tienen animaciones: después de importar los
    // gráficos del clásico hay miles de hojas cargadas y la mayoría todavía no tiene ninguna.
    for (const hoja of hojas) {
      if (!hoja.animaciones.length) continue;
      archivos.push({
        nombreArchivo: this.formatoDeAnimaciones.nombreDeArchivoPara(hoja),
        contenido: this.formatoDeAnimaciones.exportar(hoja),
      });
    }

    return archivos.sort((a, b) => a.nombreArchivo.localeCompare(b.nombreArchivo));
  }
}

/** Dónde se dejan los archivos exportados. */
export interface AlmacenDeExportacion {
  guardar(archivos: readonly ArchivoExportado[]): Promise<ResultadoDeGuardado>;
}

export interface ResultadoDeGuardado {
  /** La carpeta donde quedaron, para poder decírselo a quien la va a abrir. */
  carpeta: string;
  escritos: number;
}

/**
 * Guarda la exportación en disco.
 *
 * Es un caso de uso aparte a propósito: armar los archivos y decidir dónde van son dos trabajos
 * distintos, y el primero sirve igual para descargarlos uno por uno desde el navegador.
 */
export class GuardarExportacion {
  constructor(private readonly almacen: AlmacenDeExportacion) {}

  async ejecutar(archivos: readonly ArchivoExportado[]): Promise<ResultadoDeGuardado> {
    return this.almacen.guardar(archivos);
  }
}
