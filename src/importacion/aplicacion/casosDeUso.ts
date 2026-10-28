import type { ReferenciaPorNombre } from "@/compartido/aplicacion/ReferenciaPorNombre";
import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import type { Direccion } from "@/compartido/dominio/Direccion";
import type { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import type { HojaRepositorio } from "@/graficos/dominio/HojaRepositorio";
import type { ImportarApariencias, ResultadoDeImportacionDeApariencias } from "@/apariencias/aplicacion/casosDeUso";
import type { Apariencia, ReferenciaImportada } from "@/apariencias/dominio/Apariencia";
import type { Cabeza, CabezaImportada } from "@/apariencias/dominio/Cabeza";
import type { Cuerpo, CuerpoImportado } from "@/apariencias/dominio/Cuerpo";
import type { ImportarEfectos, ResultadoDeImportacionDeEfectos } from "@/fx/aplicacion/casosDeUso";
import type { Efecto } from "@/fx/dominio/Efecto";
import type { ImportarHechizos, ResultadoDeImportacionDeHechizos } from "@/hechizos/aplicacion/casosDeUso";
import type { ImportarNpcs, ResultadoDeImportacionDeNpcs } from "@/npcs/aplicacion/casosDeUso";
import type { ImportarObjetos, ResultadoDeImportacion } from "@/objetos/aplicacion/casosDeUso";
import type { Hechizo } from "@/hechizos/dominio/Hechizo";
import type { Npc } from "@/npcs/dominio/Npc";
import type { Objeto } from "@/objetos/dominio/Objeto";
import type { FabricaDeCatalogo } from "@/proyecto/aplicacion/ImportarProyectoLegado";
import { esElArchivo } from "../dominio/nombres";
import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import { TablaDeGrh } from "../dominio/TablaDeGrh";
import { ENCABEZADO, SIN_ORIGINALES, type FamiliaClasica, type OriginalesRepositorio } from "../dominio/OriginalesRepositorio";
import type { TablaDeGrhRepositorio } from "../dominio/TablaDeGrhRepositorio";
import type { PuenteDeGrh, VinculosDeGrh } from "./PuenteDeGrh";
import type {
  AparienciaClasica,
  EscritorDeGraficosClasicos,
  EscritorDeAparienciasClasicas,
  EscritorDeEfectosClasicos,
  EscritorDeHechizosClasicos,
  EscritorDeNpcsClasicos,
  EscritorDeObjetosClasicos,
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
  /** Gráficos propios del proyecto que la importación respetó. */
  propiosConservados: number;
  /** Números donde el propio le ganó al que traía el archivo: ésos del clásico no entraron. */
  pisados: number[];
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
  private cola: Promise<unknown> = Promise.resolve();

  constructor(private readonly tablas: TablaDeGrhRepositorio) {}

  /**
   * De a uno por vez.
   *
   * Leer, elegir el número y guardar no puede solaparse: dos recortes elegidos seguidos leerían
   * los dos la misma tabla, se llevarían el mismo número, y el segundo guardado dejaría afuera al
   * primero. Las celdas ya pintadas con ese número pasarían a mostrar otro gráfico.
   */
  ejecutar(recorte: { archivo: string; x: number; y: number; ancho: number; alto: number }): Promise<{ numero: number; creado: boolean }> {
    const siguiente = this.cola.then(
      () => this.resolver(recorte),
      () => this.resolver(recorte),
    );
    this.cola = siguiente.catch(() => undefined);
    return siguiente;
  }

  private async resolver(recorte: { archivo: string; x: number; y: number; ancho: number; alto: number }): Promise<{ numero: number; creado: boolean }> {
    const tabla = (await this.tablas.leer()) ?? TablaDeGrh.vacia();
    const existente = tabla.buscarRecorte(recorte.archivo, recorte.x, recorte.y, recorte.ancho, recorte.alto);
    if (existente) return { numero: existente.numero, creado: false };
    const numero = tabla.proximoNumero();
    // `propio` es lo que lo salva de la próxima importación del Graficos.ini.
    await this.tablas.guardar(tabla.con({ numero, ...recorte, cuadros: [], msDelCiclo: 0, propio: true }));
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

  /**
   * Lo mismo para la exportación del mundo entero, donde no tener tabla no es un error.
   *
   * El botón de la pantalla sí avisa —si lo apretaste es porque esperabas un archivo—, pero un
   * proyecto que todavía no importó gráficos tiene que poder exportar sus catálogos igual.
   */
  async archivoSiHay(): Promise<{ nombreArchivo: string; contenido: string }[]> {
    const tabla = await this.tablas.leer();
    return tabla?.cantidad ? [{ nombreArchivo: "Graficos.ini", contenido: this.escritor.escribir(tabla) }] : [];
  }
}

/**
 * El `OBJ.dat` de vuelta, con lo editado adentro.
 *
 * Va en `Dat/`, que es donde el servidor del clásico busca sus archivos. Sin objetos no devuelve
 * nada: un proyecto vacío no tiene por qué pisar el OBJ.dat de nadie.
 */
export class ExportarObjetosClasicos {
  constructor(
    private readonly listar: () => Promise<Objeto[]>,
    private readonly originales: OriginalesRepositorio,
    private readonly escritor: EscritorDeObjetosClasicos,
  ) {}

  async ejecutar(): Promise<{ nombreArchivo: string; contenido: string; carpeta: string }[]> {
    const objetos = await this.listar();
    if (!objetos.length) return [];
    return [{ nombreArchivo: "OBJ.dat", contenido: this.escritor.escribir(objetos, await this.originales.leer("obj")), carpeta: "Dat" }];
  }
}

/** El `NPCs.dat` de vuelta, con lo editado adentro. */
export class ExportarNpcsClasicos {
  constructor(
    private readonly listar: () => Promise<Npc[]>,
    private readonly originales: OriginalesRepositorio,
    private readonly escritor: EscritorDeNpcsClasicos,
  ) {}

  async ejecutar(): Promise<{ nombreArchivo: string; contenido: string; carpeta: string }[]> {
    const npcs = await this.listar();
    if (!npcs.length) return [];
    return [{ nombreArchivo: "NPCs.dat", contenido: this.escritor.escribir(npcs, await this.originales.leer("npcs")), carpeta: "Dat" }];
  }
}

/** El `Hechizos.dat` de vuelta. */
export class ExportarHechizosClasicos {
  constructor(
    private readonly listar: () => Promise<Hechizo[]>,
    private readonly originales: OriginalesRepositorio,
    private readonly escritor: EscritorDeHechizosClasicos,
  ) {}

  async ejecutar(): Promise<{ nombreArchivo: string; contenido: string; carpeta: string }[]> {
    const hechizos = await this.listar();
    if (!hechizos.length) return [];
    return [{ nombreArchivo: "Hechizos.dat", contenido: this.escritor.escribir(hechizos, await this.originales.leer("hechizos")), carpeta: "Dat" }];
  }
}

/** El `Fxs.ini` de vuelta: los corrimientos editados, el resto como vino. */
export class ExportarEfectosClasicos {
  constructor(
    private readonly listar: () => Promise<Efecto[]>,
    private readonly originales: OriginalesRepositorio,
    private readonly escritor: EscritorDeEfectosClasicos,
  ) {}

  async ejecutar(): Promise<{ nombreArchivo: string; contenido: string; carpeta: string }[]> {
    const efectos = await this.listar();
    if (!efectos.length) return [];
    return [{ nombreArchivo: "Fxs.ini", contenido: this.escritor.escribir(efectos, await this.originales.leer("fxs")), carpeta: "Init" }];
  }
}

/** El `Personajes.ini` o el `Cabezas.ini` de vuelta, con los corrimientos de cabeza editados. */
export class ExportarAparienciasClasicas {
  constructor(
    private readonly listar: () => Promise<Apariencia[]>,
    private readonly familia: FamiliaClasica,
    private readonly nombreArchivo: string,
    private readonly originales: OriginalesRepositorio,
    private readonly escritor: EscritorDeAparienciasClasicas,
  ) {}

  async ejecutar(): Promise<{ nombreArchivo: string; contenido: string; carpeta: string }[]> {
    const apariencias = await this.listar();
    if (!apariencias.length) return [];
    const contenido = this.escritor.escribir(apariencias, await this.originales.leer(this.familia));
    return [{ nombreArchivo: this.nombreArchivo, contenido, carpeta: "Init" }];
  }
}

export class ImportarTablaDeGrh {
  constructor(
    private readonly lector: LectorDeGraficosClasicos,
    private readonly tablas: TablaDeGrhRepositorio,
    private readonly hojas: HojaRepositorio,
  ) {}

  /**
   * Importar reemplaza la tabla del clásico, pero no los gráficos propios del proyecto.
   *
   * Ésos los inventó el editor al pintar un mapa con un recorte de una hoja, y los mapas guardados
   * los referencian por número: si la importación los borrara, esas celdas quedarían apuntando a
   * un gráfico que ya no existe —o, peor, a otro distinto del archivo nuevo— sin que nadie avise.
   */
  async ejecutar(texto: string): Promise<ResultadoDeTablaDeGrh> {
    const delArchivo = TablaDeGrh.desde(this.lector.leer(texto));
    const anterior = await this.tablas.leer();
    const { tabla, pisados } = anterior ? delArchivo.sumandoLosPropiosDe(anterior) : { tabla: delArchivo, pisados: [] };
    await this.tablas.guardar(tabla);
    return this.revisar(tabla, await this.hojas.listar(), pisados);
  }

  /** El estado actual, sin importar nada: para mostrarlo al abrir la pantalla. */
  async estado(): Promise<ResultadoDeTablaDeGrh | null> {
    const tabla = await this.tablas.leer();
    return tabla ? this.revisar(tabla, await this.hojas.listar()) : null;
  }

  private revisar(tabla: TablaDeGrh, hojas: readonly HojaDeSprites[], pisados: number[] = []): ResultadoDeTablaDeGrh {
    const archivos = tabla.archivos();
    const cargados = archivos.filter((a) => hojas.some((h) => esElArchivo(h.nombreArchivo, a)));
    return {
      grhs: tabla.cantidad,
      archivos,
      cargados,
      faltantes: archivos.filter((a) => !cargados.includes(a)),
      propiosConservados: tabla.propios().length,
      pisados,
    };
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
    private readonly originales: OriginalesRepositorio = SIN_ORIGINALES,
  ) {}

  async ejecutar(texto: string): Promise<ResultadoDeObjetosClasicos> {
    const { objetos: clasicos, encabezado } = this.lector.leer(texto);
    /* El texto de cada sección se guarda aparte: es lo que permite devolver el OBJ.dat entero.
     * El 0 no es ningún objeto, así que ahí va el encabezado del archivo. */
    await this.originales.guardar("obj", {
      [ENCABEZADO]: encabezado,
      ...Object.fromEntries(clasicos.map((o) => [o.numero, o.crudo])),
    });
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
    private readonly originales: OriginalesRepositorio = SIN_ORIGINALES,
  ) {}

  async ejecutar(texto: string): Promise<ResultadoDeAparienciasClasicas> {
    const { apariencias: clasicas, encabezado } = this.lector.leer(texto);
    await this.originales.guardar("cuerpos", { [ENCABEZADO]: encabezado, ...Object.fromEntries(clasicas.map((c) => [c.numero, c.crudo])) });
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
    private readonly originales: OriginalesRepositorio = SIN_ORIGINALES,
  ) {}

  async ejecutar(texto: string): Promise<ResultadoDeAparienciasClasicas> {
    const { apariencias: clasicas, encabezado } = this.lector.leer(texto);
    await this.originales.guardar("cabezas", { [ENCABEZADO]: encabezado, ...Object.fromEntries(clasicas.map((c) => [c.numero, c.crudo])) });
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
    private readonly originales: OriginalesRepositorio = SIN_ORIGINALES,
  ) {}

  async ejecutar(texto: string): Promise<ResultadoDeEfectosClasicos> {
    const { efectos: clasicos, encabezado } = this.lector.leer(texto);
    await this.originales.guardar("fxs", { [ENCABEZADO]: encabezado, ...Object.fromEntries(clasicos.map((e) => [e.numero, e.crudo])) });
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
    private readonly originales: OriginalesRepositorio = SIN_ORIGINALES,
  ) {}

  async ejecutar(texto: string): Promise<ResultadoDeHechizosClasicos> {
    const { hechizos, sinEfecto, crudos, encabezado } = this.lector.leer(texto);
    await this.originales.guardar("hechizos", { [ENCABEZADO]: encabezado, ...crudos });
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
    private readonly originales: OriginalesRepositorio = SIN_ORIGINALES,
  ) {}

  async ejecutar(texto: string): Promise<ResultadoDeImportacionDeNpcs> {
    const { npcs, encabezado } = this.lector.leer(texto);
    await this.originales.guardar("npcs", { [ENCABEZADO]: encabezado, ...Object.fromEntries(npcs.map((n) => [n.numero, n.crudo])) });
    return this.npcs.importar(npcs);
  }
}
