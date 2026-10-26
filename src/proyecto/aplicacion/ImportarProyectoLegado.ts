import type { GeneradorDeIds } from "@/compartido/aplicacion/GeneradorDeIds";
import { Animacion } from "@/graficos/dominio/Animacion";
import { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import type { HojaRepositorio } from "@/graficos/dominio/HojaRepositorio";
import type { Grilla } from "@/graficos/dominio/Grilla";
import type { AlmacenDeImagenes, DatosAnimacionImportada, ProcesadorDeImagenes } from "@/graficos/aplicacion/puertos";
import type { CatalogoGrafico } from "@/objetos/dominio/CatalogoGrafico";
import type { ImportarObjetos, ResultadoDeImportacion } from "@/objetos/aplicacion/casosDeUso";
import type { ObjetoImportado } from "@/objetos/aplicacion/puertos";

/*
 * Módulo Proyecto: coordina varios módulos a la vez. Por eso vive aparte y depende de los otros,
 * nunca al revés (Gráficos y Objetos no saben que existe).
 */

export interface HojaLegada {
  nombreArchivo: string;
  png: Blob | null;
  grilla: Grilla | null;
  animaciones: DatosAnimacionImportada[];
}

export interface ProyectoLegado {
  hojas: HojaLegada[];
  objetos: ObjetoImportado[];
}

/** Puerto: sabe leer el archivo "proyecto-ao.json" del indexador web. */
export interface LectorDeProyectoLegado {
  leer(texto: string): ProyectoLegado;
}

/** Puerto: arma un catálogo gráfico a partir de hojas (lo implementa la capa anticorrupción de Objetos). */
export type FabricaDeCatalogo = (hojas: readonly HojaDeSprites[]) => CatalogoGrafico;

export interface ResultadoDeProyecto {
  hojasNuevas: number;
  hojasActualizadas: number;
  objetos: ResultadoDeImportacion;
}

export class ImportarProyectoLegado {
  constructor(
    private readonly lector: LectorDeProyectoLegado,
    private readonly hojas: HojaRepositorio,
    private readonly imagenes: AlmacenDeImagenes,
    private readonly procesador: ProcesadorDeImagenes,
    private readonly importarObjetos: ImportarObjetos,
    private readonly fabricaDeCatalogo: FabricaDeCatalogo,
    private readonly ids: GeneradorDeIds,
  ) {}

  async ejecutar(texto: string): Promise<ResultadoDeProyecto> {
    const proyecto = this.lector.leer(texto);
    const existentes = await this.hojas.listar();
    let hojasNuevas = 0,
      hojasActualizadas = 0;

    for (const h of proyecto.hojas) {
      let hoja = existentes.find((x) => x.nombreArchivo === h.nombreArchivo);
      if (hoja) hojasActualizadas++;
      else {
        hojasNuevas++;
        hoja = HojaDeSprites.crear(this.ids.nuevo(), h.nombreArchivo, this.ids.nuevo());
        hoja = hoja.sinAnimacion(hoja.animaciones[0]!.id);
      }
      if (h.png) {
        const { png, tamanio } = await this.procesador.decodificar(h.png);
        await this.imagenes.guardar(hoja.id, png, "actual");
        await this.imagenes.guardar(hoja.id, png, "original");
        hoja = hoja.conImagenNueva(tamanio);
      }
      if (h.grilla) hoja = hoja.conGrilla(h.grilla);
      hoja = hoja.conAnimacionesImportadas(h.animaciones.map((a) => Animacion.reconstituir({ ...a, id: this.ids.nuevo() })));
      await this.hojas.guardar(hoja);
    }

    const catalogo = this.fabricaDeCatalogo(await this.hojas.listar());
    const objetos = await this.importarObjetos.importar(proyecto.objetos, catalogo);
    return { hojasNuevas, hojasActualizadas, objetos };
  }
}
