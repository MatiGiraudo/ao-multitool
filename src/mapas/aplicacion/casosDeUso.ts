import type { HojaRepositorio } from "@/graficos/dominio/HojaRepositorio";
import { esElArchivo } from "@/importacion/dominio/nombres";
import type { TablaDeGrhRepositorio } from "@/importacion/dominio/TablaDeGrhRepositorio";
import type { Mapa } from "../dominio/Mapa";
import type { MapaGuardado, MapaRepositorio, ResumenDeMapa } from "../dominio/MapaRepositorio";
import { FormatoMapaClasico, type AnchoDeGrafico, type ArchivosDeMapa } from "../infraestructura/FormatoMapaClasico";

/*
 * Los casos de uso de Mapas. Igual que Importación, este módulo coordina: necesita la tabla de
 * GRH y las hojas para saber con qué se dibuja cada celda.
 */

export interface ArchivosElegidos {
  numero: number;
  map: ArrayBuffer;
  inf: ArrayBuffer;
  dat?: string;
}

/** Abre un mapa del juego. El formato detecta solo si los gráficos son de 2 o de 4 bytes. */
export class AbrirMapaClasico {
  constructor(private readonly formato = new FormatoMapaClasico()) {}

  ejecutar(archivos: ArchivosElegidos): { mapa: Mapa; ancho: AnchoDeGrafico } {
    return this.formato.leer(archivos.numero, archivos.map, archivos.inf, archivos.dat);
  }

  /** Para la ida y vuelta: devuelve los tres archivos tal como los espera el juego. */
  escribir(mapa: Mapa, ancho: AnchoDeGrafico = 4): ArchivosDeMapa {
    return this.formato.escribir(mapa, ancho);
  }
}

/*
 * Los mapas del proyecto, que son los que sobreviven a cerrar la pestaña. Son cuatro llamadas al
 * repositorio y no mucho más: la gracia está en el formato (ver `MapaDto`), no acá.
 */
export class ListarMapasGuardados {
  constructor(private readonly repo: MapaRepositorio) {}
  ejecutar(): Promise<ResumenDeMapa[]> {
    return this.repo.listar();
  }
}

export class AbrirMapaGuardado {
  constructor(private readonly repo: MapaRepositorio) {}
  ejecutar(numero: number): Promise<MapaGuardado | null> {
    return this.repo.obtener(numero);
  }
}

export class GuardarMapa {
  constructor(private readonly repo: MapaRepositorio) {}
  ejecutar(guardado: MapaGuardado): Promise<void> {
    return this.repo.guardar(guardado);
  }
}

export class EliminarMapaGuardado {
  constructor(private readonly repo: MapaRepositorio) {}
  ejecutar(numero: number): Promise<void> {
    return this.repo.eliminar(numero);
  }
}

/** Un recorte listo para dibujar: de qué hoja sale y qué pedazo es. */
export interface RecorteDeGrh {
  hojaId: string;
  nombreHoja: string;
  /** Para armar la URL de la imagen, que cambia cuando se reemplaza la hoja. */
  versionImagen: number;
  /** Los cuadros del gráfico: uno solo si es estático, varios si es animado. */
  cuadros: { x: number; y: number; ancho: number; alto: number }[];
  msPorFrame: number;
}

export interface GraficosDelMapa {
  /** Qué dibujar para cada número de GRH que el mapa usa. */
  porGrh: Map<number, RecorteDeGrh>;
  /** Hojas que el mapa necesita y no están cargadas, por nombre de archivo del clásico. */
  hojasFaltantes: string[];
  /** GRH que la tabla no conoce. */
  sinResolver: number[];
  /** Los ids de hoja que hay que tener en memoria para dibujar este mapa. */
  hojas: string[];
}

/**
 * De los números de GRH de un mapa a los recortes concretos.
 *
 * Es lo que hace que el visor no tenga que cargar las miles de hojas del juego: un mapa usa unos
 * 180 gráficos distintos, que salen de unas pocas decenas de hojas. Esto devuelve exactamente
 * esas, y dice cuáles faltan.
 */
export class ResolverGraficosDelMapa {
  constructor(
    private readonly tablas: TablaDeGrhRepositorio,
    private readonly hojas: HojaRepositorio,
  ) {}

  /**
   * `extra` son gráficos que el mapa todavía no usa y hay que poder dibujar igual: el que el
   * editor tiene cargado en el pincel. Sin esto, pintar con un gráfico nuevo mostraría un color
   * plano hasta recargar, porque su hoja no estaría en memoria.
   */
  async ejecutar(mapa: Mapa, extra: Iterable<number> = []): Promise<GraficosDelMapa> {
    const tabla = await this.tablas.leer();
    const hojas = await this.hojas.listar();
    const porGrh = new Map<number, RecorteDeGrh>();
    const faltantes = new Set<string>();
    const sinResolver: number[] = [];
    const usadas = new Set<string>();

    const pedidos = new Set(mapa.graficosUsados());
    for (const grh of extra) if (grh > 0) pedidos.add(grh);

    for (const grh of [...pedidos].sort((a, b) => a - b)) {
      const recortes = tabla?.recortes(grh);
      if (!recortes) {
        sinResolver.push(grh);
        continue;
      }
      const hoja = hojas.find((h) => esElArchivo(h.nombreArchivo, recortes.archivo));
      if (!hoja) {
        faltantes.add(recortes.archivo);
        continue;
      }
      usadas.add(hoja.id);
      porGrh.set(grh, {
        hojaId: hoja.id,
        nombreHoja: hoja.nombreArchivo,
        versionImagen: hoja.versionImagen,
        cuadros: recortes.rects,
        msPorFrame: recortes.msPorFrame,
      });
    }

    return {
      porGrh,
      hojasFaltantes: [...faltantes].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)),
      sinResolver,
      hojas: [...usadas],
    };
  }
}
