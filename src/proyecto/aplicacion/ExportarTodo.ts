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
  /**
   * Texto para los catálogos y el `Graficos.ini`; bytes crudos para los binarios del juego.
   *
   * Los `.map` y `.inf` no son texto, y escribirlos como si lo fueran los rompe: el formato está
   * probado byte a byte contra los mapas del juego, así que acá viajan tal cual.
   */
  contenido: string | Uint8Array;
  /** Subcarpeta donde va, si el juego lo espera en una: los mapas van en `Mundos`. */
  carpeta?: string;
}

/** Lo que este caso de uso necesita de cada módulo: un archivo, dado el catálogo de gráficos. */
export type ExportarCatalogo = (catalogo: CatalogoGrafico) => Promise<ArchivoExportado>;

/** Los módulos que aportan varios archivos de una: los mapas son tres por cada uno. */
export type ExportarVarios = () => Promise<ArchivoExportado[]>;

/**
 * Qué llevarse. Son cuatro cosas distintas y casi nunca se quieren las cuatro:
 *
 * - **catálogos**: los JSON del remake (`objetos.json`, `npcs.json`…).
 * - **animaciones**: un `.anim.json` por hoja, también para el remake.
 * - **mundo**: los mapas como los lee el juego, más el `Graficos.ini`.
 * - **clásico**: los `.dat` y `.ini` del AO original, para devolvérselos a un servidor 13.x.
 */
export interface QueExportar {
  catalogos: boolean;
  animaciones: boolean;
  mundo: boolean;
  clasico: boolean;
}

export const TODO: QueExportar = { catalogos: true, animaciones: true, mundo: true, clasico: true };

export class ExportarTodo {
  constructor(
    private readonly hojas: HojaRepositorio,
    private readonly formatoDeAnimaciones: FormatoDeAnimaciones,
    private readonly fabricaDeCatalogo: FabricaDeCatalogo,
    /** Los exportadores de los catálogos (objetos, FX, cuerpos, cabezas, hechizos). */
    private readonly catalogos: readonly ExportarCatalogo[],
    /** Los mapas del proyecto y el `Graficos.ini`. */
    private readonly mundo: readonly ExportarVarios[] = [],
    /** Los archivos del AO clásico, que vuelven con todo lo que el editor no entiende. */
    private readonly clasico: readonly ExportarVarios[] = [],
  ) {}

  async ejecutar(que: QueExportar = TODO): Promise<ArchivoExportado[]> {
    const hojas = await this.hojas.listar();
    const catalogo = this.fabricaDeCatalogo(hojas);
    const archivos: ArchivoExportado[] = que.catalogos ? await Promise.all(this.catalogos.map((exportar) => exportar(catalogo))) : [];
    /* El clásico va primero aunque en la lista esté último, y no da lo mismo: devolverle sus
     * archivos resuelve los gráficos del editor a números de GRH, y al que no tenía se lo
     * inventa. Si el `Graficos.ini` saliera antes, saldría sin ésos y el cliente no encontraría
     * el gráfico del FX o del cuerpo que acaba de recibir. El orden de salida no cambia: los
     * archivos se ordenan por carpeta y nombre al final. */
    if (que.clasico) for (const exportar of this.clasico) archivos.push(...(await exportar()));
    if (que.mundo) for (const exportar of this.mundo) archivos.push(...(await exportar()));

    // Un .anim.json por hoja, pero sólo de las que tienen animaciones: después de importar los
    // gráficos del clásico hay miles de hojas cargadas y la mayoría todavía no tiene ninguna.
    if (que.animaciones) {
      for (const hoja of hojas) {
        if (!hoja.animaciones.length) continue;
        archivos.push({
          nombreArchivo: this.formatoDeAnimaciones.nombreDeArchivoPara(hoja),
          contenido: this.formatoDeAnimaciones.exportar(hoja),
        });
      }
    }

    // Los de cada subcarpeta quedan juntos, y dentro por nombre.
    return archivos.sort((a, b) => (a.carpeta ?? "").localeCompare(b.carpeta ?? "") || a.nombreArchivo.localeCompare(b.nombreArchivo));
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
