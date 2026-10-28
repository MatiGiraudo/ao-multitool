import type { ReferenciaPorNombre } from "@/compartido/aplicacion/ReferenciaPorNombre";
import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import type { Direccion } from "@/compartido/dominio/Direccion";
import type { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import type { HojaRepositorio } from "@/graficos/dominio/HojaRepositorio";
import type { ImportarApariencias, ResultadoDeImportacionDeApariencias } from "@/apariencias/aplicacion/casosDeUso";
import type { ReferenciaImportada } from "@/apariencias/dominio/Apariencia";
import type { Cabeza, CabezaImportada } from "@/apariencias/dominio/Cabeza";
import type { Cuerpo, CuerpoImportado } from "@/apariencias/dominio/Cuerpo";
import type { ImportarEfectos, ResultadoDeImportacionDeEfectos } from "@/fx/aplicacion/casosDeUso";
import type { ImportarHechizos, ResultadoDeImportacionDeHechizos } from "@/hechizos/aplicacion/casosDeUso";
import type { ImportarNpcs, ResultadoDeImportacionDeNpcs } from "@/npcs/aplicacion/casosDeUso";
import type { ImportarObjetos, ResultadoDeImportacion } from "@/objetos/aplicacion/casosDeUso";
import type { FabricaDeCatalogo } from "@/proyecto/aplicacion/ImportarProyectoLegado";
import { esElArchivo } from "../dominio/nombres";
import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import { TablaDeGrh } from "../dominio/TablaDeGrh";
import type { TablaDeGrhRepositorio } from "../dominio/TablaDeGrhRepositorio";
import type { PuenteDeGrh, VinculosDeGrh } from "./PuenteDeGrh";
import type {
  AparienciaClasica,
  EscritorDeGraficosClasicos,
  LectorDeAparienciasClasicas,
  LectorDeEfectosClasicos,
  LectorDeGraficosClasicos,
  LectorDeHechizosClasicos,
  LectorDeNpcsClasicos,
  LectorDeObjetosClasicos,
} from "./puertos";

/*
 * Módulo Importación: igual que Proyecto, coordina varios módulos y por eso depende de ellos,
 * nunca al revés. Gráficos, Objetos, Apariencias, FX y Hechizos no saben que existe.
 *
 * Todos los importadores que traen gráficos tienen la misma forma: leer el archivo, pedirle al
 * PuenteDeGrh que convierta los números de GRH en animaciones, y pasarle al módulo destino su
 * propio Importar<X>. Lo único propio de cada uno es cómo se llaman los campos.
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
/**
 * De un recorte de una hoja del proyecto al número de GRH con el que se dibuja.
 *
 * Es lo que deja pintar un mapa con gráficos que nunca estuvieron en un `Graficos.ini`: si el
 * recorte ya tiene número se reusa, y si no se le da el primer número libre y la tabla queda
 * guardada. Así el mapa sigue hablando en números de GRH, que es lo único que el juego entiende.
 */
export class GrhDeRecorte {
  constructor(private readonly tablas: TablaDeGrhRepositorio) {}

  async ejecutar(recorte: { archivo: string; x: number; y: number; ancho: number; alto: number }): Promise<{ numero: number; creado: boolean }> {
    const tabla = (await this.tablas.leer()) ?? TablaDeGrh.vacia();
    const existente = tabla.buscarRecorte(recorte.archivo, recorte.x, recorte.y, recorte.ancho, recorte.alto);
    if (existente) return { numero: existente.numero, creado: false };
    const numero = tabla.proximoNumero();
    await this.tablas.guardar(tabla.con({ numero, ...recorte, cuadros: [], msDelCiclo: 0 }));
    return { numero, creado: true };
  }
}

/** La tabla de vuelta como `Graficos.ini`, con los gráficos propios incluidos. */
export class ExportarGraficosIni {
  constructor(
    private readonly tablas: TablaDeGrhRepositorio,
    private readonly escritor: EscritorDeGraficosClasicos,
  ) {}

  async ejecutar(): Promise<string> {
    const tabla = await this.tablas.leer();
    if (!tabla?.cantidad) throw new ErrorDeDominio("Todavía no hay tabla de GRH: importá un Graficos.ini o pintá un mapa con gráficos del proyecto.");
    return this.escritor.escribir(tabla);
  }
}

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

/** Lo que todo importador con gráficos cuenta además de lo suyo: qué pudo vincular y qué no. */
export interface ResumenDeVinculos {
  animacionesCreadas: number;
  /** Archivos que hacían falta para los gráficos y no están cargados como hoja. */
  hojasFaltantes: string[];
  /** GRH que el archivo usa y la tabla no conoce (o que la tabla no está cargada). */
  grhSinResolver: number[];
}

export interface ResultadoDeObjetosClasicos extends ResumenDeVinculos {
  objetos: ResultadoDeImportacion;
}

export interface ResultadoDeAparienciasClasicas extends ResumenDeVinculos {
  apariencias: ResultadoDeImportacionDeApariencias;
}

export interface ResultadoDeEfectosClasicos extends ResumenDeVinculos {
  efectos: ResultadoDeImportacionDeEfectos;
}

export interface ResultadoDeHechizosClasicos extends ResultadoDeImportacionDeHechizos {
  /** Los hechizos cuyo efecto el archivo no trae. Con el Hechizos.dat del cliente, son todos. */
  sinEfecto: number[];
}

/**
 * Lo que necesita cualquier importador que traiga gráficos. Se declara una vez acá porque los
 * cuatro lo repiten, y `conGraficos` lo usa para hacer el paso común sin saber de quién se trata.
 */
interface ConGraficos {
  readonly tablas: TablaDeGrhRepositorio;
  readonly puente: PuenteDeGrh;
  readonly hojas: HojaRepositorio;
  readonly fabricaDeCatalogo: FabricaDeCatalogo;
}

/**
 * Trae el `OBJ.dat` completo: nombre, tipo, valor, banderas y atributos de cada objeto, y su
 * icono.
 *
 * Lo interesante es el icono. En el clásico es un número de GRH; acá es "tal hoja, tal animación".
 * El puente crea la animación que haga falta y recién ahí se vincula el objeto. Si la hoja no está
 * cargada queda anotada en `hojasFaltantes`: cargás esa imagen, volvés a importar y se vincula.
 */
export class ImportarObjetosClasicos implements ConGraficos {
  constructor(
    private readonly lector: LectorDeObjetosClasicos,
    readonly tablas: TablaDeGrhRepositorio,
    readonly puente: PuenteDeGrh,
    readonly hojas: HojaRepositorio,
    private readonly importarObjetos: ImportarObjetos,
    readonly fabricaDeCatalogo: FabricaDeCatalogo,
  ) {}

  async ejecutar(texto: string): Promise<ResultadoDeObjetosClasicos> {
    const clasicos = this.lector.leer(texto);
    const { vinculos, catalogo } = await conGraficos(
      this,
      clasicos.map((o) => o.grhIcono),
    );
    const objetos = await this.importarObjetos.importar(
      clasicos.map(({ grhIcono, ...resto }) => ({
        ...resto,
        graficos: { icono: vinculos.referencias.get(grhIcono) ?? null, suelo: null, equipado: {} },
      })),
      catalogo,
    );
    return { objetos, ...resumen(vinculos) };
  }
}

/**
 * Trae el índice de cuerpos (`Personajes.ini`): las cuatro animaciones de caminar y, lo que de
 * verdad no se puede cargar a mano, el corrimiento donde se apoya la cabeza.
 *
 * Los cuerpos del clásico no tienen nombre, así que se lo pone el importador ("Cuerpo 12"). Como
 * los que ya existen se reemplazan, un nombre editado a mano se pierde al reimportar.
 */
export class ImportarCuerposClasicos implements ConGraficos {
  constructor(
    private readonly lector: LectorDeAparienciasClasicas,
    readonly tablas: TablaDeGrhRepositorio,
    readonly puente: PuenteDeGrh,
    readonly hojas: HojaRepositorio,
    private readonly cuerpos: ImportarApariencias<Cuerpo, CuerpoImportado>,
    readonly fabricaDeCatalogo: FabricaDeCatalogo,
  ) {}

  async ejecutar(texto: string): Promise<ResultadoDeAparienciasClasicas> {
    const clasicas = this.lector.leer(texto);
    const { vinculos, catalogo } = await conGraficos(this, grhDe(clasicas));
    const apariencias = await this.cuerpos.importar(
      clasicas.map((c) => ({
        numero: c.numero,
        nombre: `Cuerpo ${c.numero}`,
        direcciones: direccionesVinculadas(c, vinculos.referencias),
        offsetCabezaX: c.offsetCabezaX,
        offsetCabezaY: c.offsetCabezaY,
      })),
      catalogo,
    );
    return { apariencias, ...resumen(vinculos) };
  }
}

/**
 * Trae el índice de cabezas (`Cabezas.ini`) o el de cascos (`Cascos.ini`): los dos archivos tienen
 * la misma forma, así que es el mismo caso de uso con otro lector.
 */
export class ImportarCabezasClasicas implements ConGraficos {
  constructor(
    private readonly lector: LectorDeAparienciasClasicas,
    readonly tablas: TablaDeGrhRepositorio,
    readonly puente: PuenteDeGrh,
    readonly hojas: HojaRepositorio,
    private readonly cabezas: ImportarApariencias<Cabeza, CabezaImportada>,
    readonly fabricaDeCatalogo: FabricaDeCatalogo,
  ) {}

  async ejecutar(texto: string): Promise<ResultadoDeAparienciasClasicas> {
    const clasicas = this.lector.leer(texto);
    const { vinculos, catalogo } = await conGraficos(this, grhDe(clasicas));
    const apariencias = await this.cabezas.importar(
      clasicas.map((c) => ({
        numero: c.numero,
        nombre: `Cabeza ${c.numero}`,
        direcciones: direccionesVinculadas(c, vinculos.referencias),
      })),
      catalogo,
    );
    return { apariencias, ...resumen(vinculos) };
  }
}

/**
 * Trae el `Fxs.ini`: la animación de cada efecto y su corrimiento, que es el dato que cuesta
 * acertar a ojo. El clásico no guarda nombre ni repeticiones, así que quedan en "FX n" y 1.
 */
export class ImportarEfectosClasicos implements ConGraficos {
  constructor(
    private readonly lector: LectorDeEfectosClasicos,
    readonly tablas: TablaDeGrhRepositorio,
    readonly puente: PuenteDeGrh,
    readonly hojas: HojaRepositorio,
    private readonly efectos: ImportarEfectos,
    readonly fabricaDeCatalogo: FabricaDeCatalogo,
  ) {}

  async ejecutar(texto: string): Promise<ResultadoDeEfectosClasicos> {
    const clasicos = this.lector.leer(texto);
    const { vinculos, catalogo } = await conGraficos(
      this,
      clasicos.map((e) => e.grh),
    );
    const efectos = await this.efectos.importar(
      clasicos.map((e) => ({
        numero: e.numero,
        nombre: `FX ${e.numero}`,
        animacion: vinculos.referencias.get(e.grh) ?? null,
        offsetX: e.offsetX,
        offsetY: e.offsetY,
        repeticiones: 1,
      })),
      catalogo,
    );
    return { efectos, ...resumen(vinculos) };
  }
}

/**
 * Trae el `Hechizos.dat` completo.
 *
 * Es el importador más simple: no toca gráficos, porque el hechizo apunta al FX por número igual
 * que acá. El lector traduce las banderas sueltas del clásico al tipo de efecto del editor, y el
 * caso de uso de Hechizos hace el resto. Los hechizos con el mismo ID se reemplazan.
 *
 * Lo único que agrega es `sinEfecto`: con el `Hechizos.dat` del cliente entra el texto completo
 * pero no la mecánica, y el editor tiene que decirlo en vez de dejar hechizos que dicen curar.
 */
export class ImportarHechizosClasicos {
  constructor(
    private readonly lector: LectorDeHechizosClasicos,
    private readonly hechizos: ImportarHechizos,
  ) {}

  async ejecutar(texto: string): Promise<ResultadoDeHechizosClasicos> {
    const { hechizos, sinEfecto } = this.lector.leer(texto);
    return { ...(await this.hechizos.importar(hechizos)), sinEfecto };
  }
}

/** El paso común de los cuatro: leer la tabla, vincular los GRH del archivo y armar el catálogo. */
async function conGraficos(quien: ConGraficos, grhs: number[]): Promise<{ vinculos: VinculosDeGrh; catalogo: CatalogoGrafico }> {
  const tabla = (await quien.tablas.leer()) ?? TablaDeGrh.vacia();
  const vinculos = await quien.puente.vincular(tabla, grhs);
  // El catálogo se arma DESPUÉS de vincular: el puente acaba de crear animaciones que tiene que ver.
  return { vinculos, catalogo: quien.fabricaDeCatalogo(await quien.hojas.listar()) };
}

function resumen(v: VinculosDeGrh): ResumenDeVinculos {
  return { animacionesCreadas: v.animacionesCreadas, hojasFaltantes: v.hojasFaltantes, grhSinResolver: v.grhSinResolver };
}

function grhDe(clasicas: readonly AparienciaClasica[]): number[] {
  return clasicas.flatMap((c) => Object.values(c.grhPorDireccion));
}

/** De "esta dirección usa el GRH 4582" a "esta dirección usa tal animación de tal hoja". */
function direccionesVinculadas(
  clasica: AparienciaClasica,
  referencias: Map<number, ReferenciaPorNombre>,
): Partial<Record<Direccion, ReferenciaImportada>> {
  const out: Partial<Record<Direccion, ReferenciaImportada>> = {};
  for (const [direccion, grh] of Object.entries(clasica.grhPorDireccion) as [Direccion, number][]) {
    const ref = referencias.get(grh);
    if (ref) out[direccion] = ref;
  }
  return out;
}

/**
 * Trae el `NPCs.dat` completo: apariencia, combate, hechizos, lo que suelta y lo que vende.
 *
 * No toca la tabla de GRH, porque el NPC no guarda gráficos propios: apunta a un cuerpo y a una
 * cabeza por número. Si esos números todavía no existen en el editor, el NPC entra igual y el
 * validador lo marca — es mejor tener los 500 NPCs con un aviso que no tenerlos.
 */
export class ImportarNpcsClasicos {
  constructor(
    private readonly lector: LectorDeNpcsClasicos,
    private readonly npcs: ImportarNpcs,
  ) {}

  async ejecutar(texto: string): Promise<ResultadoDeImportacionDeNpcs> {
    return this.npcs.importar(this.lector.leer(texto));
  }
}
