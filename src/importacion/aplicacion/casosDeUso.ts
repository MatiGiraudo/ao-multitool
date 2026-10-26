import type { GeneradorDeIds } from "@/compartido/aplicacion/GeneradorDeIds";
import type { ReferenciaPorNombre } from "@/compartido/aplicacion/ReferenciaPorNombre";
import { Animacion } from "@/graficos/dominio/Animacion";
import { Frame } from "@/graficos/dominio/Frame";
import type { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import type { HojaRepositorio } from "@/graficos/dominio/HojaRepositorio";
import type { ImportarHechizos, ResultadoDeImportacionDeHechizos } from "@/hechizos/aplicacion/casosDeUso";
import type { ImportarObjetos, ResultadoDeImportacion } from "@/objetos/aplicacion/casosDeUso";
import type { FabricaDeCatalogo } from "@/proyecto/aplicacion/ImportarProyectoLegado";
import { esElArchivo } from "../dominio/nombres";
import { TablaDeGrh } from "../dominio/TablaDeGrh";
import type { TablaDeGrhRepositorio } from "../dominio/TablaDeGrhRepositorio";
import type { LectorDeGraficosClasicos, LectorDeHechizosClasicos, LectorDeObjetosClasicos } from "./puertos";

/*
 * Módulo Importación: igual que Proyecto, coordina varios módulos y por eso depende de ellos,
 * nunca al revés. Gráficos y Objetos no saben que existe.
 */

export interface ResultadoDeTablaDeGrh {
  grhs: number;
  /** Archivos de imagen que menciona el Graficos.ini. */
  archivos: string[];
  /** De esos, los que ya están cargados como hoja en el editor. */
  cargados: string[];
  faltantes: string[];
}

/**
 * Lee el `Graficos.ini` y guarda la tabla de GRH.
 *
 * Es el primer paso de cualquier importación del clásico: sin esta tabla, los `GrhIndex` de los
 * demás archivos no se pueden traducir a hojas y animaciones.
 */
export class ImportarTablaDeGrh {
  constructor(
    private readonly lector: LectorDeGraficosClasicos,
    private readonly tablas: TablaDeGrhRepositorio,
    private readonly hojas: HojaRepositorio,
  ) {}

  async ejecutar(texto: string): Promise<ResultadoDeTablaDeGrh> {
    const tabla = TablaDeGrh.desde(this.lector.leer(texto));
    await this.tablas.guardar(tabla);
    return this.revisar(tabla, await this.hojas.listar());
  }

  /** El estado actual, sin importar nada: para mostrarlo al abrir la pantalla. */
  async estado(): Promise<ResultadoDeTablaDeGrh | null> {
    const tabla = await this.tablas.leer();
    return tabla ? this.revisar(tabla, await this.hojas.listar()) : null;
  }

  private revisar(tabla: TablaDeGrh, hojas: readonly HojaDeSprites[]): ResultadoDeTablaDeGrh {
    const archivos = tabla.archivos();
    const cargados = archivos.filter((a) => hojas.some((h) => esElArchivo(h.nombreArchivo, a)));
    return { grhs: tabla.cantidad, archivos, cargados, faltantes: archivos.filter((a) => !cargados.includes(a)) };
  }
}

export interface ResultadoDeObjetosClasicos {
  objetos: ResultadoDeImportacion;
  animacionesCreadas: number;
  /** Archivos que hacían falta para los iconos y no están cargados como hoja. */
  hojasFaltantes: string[];
  /** GRH que los objetos usan y la tabla no conoce (o que no está cargada). */
  grhSinResolver: number[];
}

/**
 * Trae el `OBJ.dat` completo: nombre, tipo, valor, banderas y atributos de cada objeto, y su
 * icono.
 *
 * Lo interesante es el icono. En el clásico es un número de GRH; acá es "tal hoja, tal animación".
 * Así que este caso de uso, para cada GRH que haga falta, **crea la animación en la hoja que
 * corresponda** (llamada `grh505`, con los recortes que dice la tabla) y recién ahí vincula el
 * objeto. Si la hoja no está cargada, lo anota en `hojasFaltantes`: cargás esa imagen, volvés a
 * importar y se vincula.
 */
export class ImportarObjetosClasicos {
  constructor(
    private readonly lector: LectorDeObjetosClasicos,
    private readonly tablas: TablaDeGrhRepositorio,
    private readonly hojas: HojaRepositorio,
    private readonly importarObjetos: ImportarObjetos,
    private readonly fabricaDeCatalogo: FabricaDeCatalogo,
    private readonly ids: GeneradorDeIds,
  ) {}

  async ejecutar(texto: string): Promise<ResultadoDeObjetosClasicos> {
    const clasicos = this.lector.leer(texto);
    const tabla = (await this.tablas.leer()) ?? TablaDeGrh.vacia();
    const hojas = await this.hojas.listar();

    const hojasFaltantes = new Set<string>();
    const grhSinResolver = new Set<number>();
    const referencias = new Map<number, ReferenciaPorNombre>();
    const tocadas = new Map<string, HojaDeSprites>();
    let animacionesCreadas = 0;

    for (const grh of new Set(clasicos.map((o) => o.grhIcono).filter((n) => n > 0))) {
      const recortes = tabla.recortes(grh);
      if (!recortes) {
        grhSinResolver.add(grh);
        continue;
      }
      const original = hojas.find((h) => esElArchivo(h.nombreArchivo, recortes.archivo));
      if (!original) {
        hojasFaltantes.add(recortes.archivo);
        continue;
      }
      let hoja = tocadas.get(original.id) ?? original;
      const nombre = `grh${grh}`;
      if (!hoja.animacionLlamada(nombre)) {
        const animacion = Animacion.crear(this.ids.nuevo(), nombre)
          .conMsPorFrame(recortes.msPorFrame || 120)
          .conFramesAgregados(recortes.rects.map((r) => Frame.deCoordenadas(r.x, r.y, r.ancho, r.alto)));
        hoja = hoja.conAnimacionAgregada(animacion);
        tocadas.set(hoja.id, hoja);
        animacionesCreadas++;
      }
      referencias.set(grh, { hoja: hoja.nombreArchivo, animacion: nombre, frame: 0 });
    }

    for (const hoja of tocadas.values()) await this.hojas.guardar(hoja);

    const catalogo = this.fabricaDeCatalogo(await this.hojas.listar());
    const objetos = await this.importarObjetos.importar(
      clasicos.map(({ grhIcono, ...resto }) => ({
        ...resto,
        graficos: { icono: referencias.get(grhIcono) ?? null, suelo: null, equipado: {} },
      })),
      catalogo,
    );

    return {
      objetos,
      animacionesCreadas,
      hojasFaltantes: [...hojasFaltantes].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)),
      grhSinResolver: [...grhSinResolver].sort((a, b) => a - b),
    };
  }
}

/**
 * Trae el `Hechizos.dat` completo.
 *
 * Es el importador más simple de todos, y se nota lo que ganaron los cimientos: el lector traduce
 * las banderas sueltas del clásico al tipo de efecto del editor, y el caso de uso de Hechizos hace
 * el resto. Los hechizos con el mismo ID se reemplazan.
 */
export class ImportarHechizosClasicos {
  constructor(
    private readonly lector: LectorDeHechizosClasicos,
    private readonly hechizos: ImportarHechizos,
  ) {}

  async ejecutar(texto: string): Promise<ResultadoDeImportacionDeHechizos> {
    return this.hechizos.importar(this.lector.leer(texto));
  }
}
