/*
 * Qué se mide del uso del editor. Nada más que esto, y por construcción.
 *
 * Los eventos son una unión cerrada y cada campo es otra unión cerrada: no hay un solo lugar donde
 * quepa un `string` libre. Eso no es prolijidad, es el punto del archivo. Los errores del editor
 * traen nombres de hojas y rutas del disco de quien lo usa, y los nombres de archivo del cliente
 * clásico son suyos; con esta forma no se puede mandar nada de eso sin querer, porque no hay campo
 * donde ponerlo. La privacidad la garantiza el compilador y no el acordarse.
 *
 * Por lo mismo los tamaños van en tramos («101-1000») y no en números exactos: la pregunta que se
 * quiere contestar es si el editor aguanta proyectos de verdad, y para eso el tramo alcanza. El
 * número exacto, en cambio, es casi una huella: identifica a una persona entre pocas.
 *
 * Quién emite: la interfaz, en el borde. El dominio y los casos de uso no conocen este puerto ni
 * tienen por qué; miden las pantallas, que son las que saben que algo pasó.
 */

/** Cuántas cosas hay, sin decir cuántas exactamente. */
export type Tramo = "vacío" | "1-10" | "11-100" | "101-1000" | "1000+";

/** Las colecciones del mundo, una por módulo (apariencias tiene dos). */
export type Coleccion = "hojas" | "objetos" | "fx" | "cuerpos" | "cabezas" | "hechizos" | "npcs" | "mapas";

/** Los siete pasos de «Importar del AO original». */
export type PasoDeImportacion = "graficos" | "cuerpos" | "cabezas" | "fx" | "objetos" | "hechizos" | "npcs";

/*
 * Las cuatro partes de «Exportar todo». Repite a propósito las claves de `QueExportar`, que vive en
 * `proyecto/`: `compartido/` no puede conocer a los módulos. Si allá cambian, el `for` de la
 * pantalla de exportación deja de compilar, que es justo lo que se quiere.
 */
export type QueSeExporto = "catalogos" | "animaciones" | "mundo" | "clasico";

/** A quién le cierra la puerta el modo carpeta. No hace falta más precisión que ésta. */
export type NavegadorSinCarpetas = "firefox" | "safari" | "otro";

/*
 * En qué pantalla pasó algo. Es la lista de pestañas del editor, y la escribe este archivo porque
 * `compartido/` no puede conocer la capa de entrega, que es donde viven las rutas.
 *
 * Que estén las dos listas se banca con un test: `telemetria.test.ts` recorre las secciones de
 * verdad y falla si alguna cae en "otra". Así, el día que se sume una herramienta, el que avisa es
 * el test y no el silencio de un tablero que la cuenta mal.
 */
export type Pantalla =
  | "animaciones"
  | "apariencias"
  | "npcs"
  | "objetos"
  | "fx"
  | "hechizos"
  | "mapas"
  | "diagnostico"
  | "importar"
  | "exportar"
  | "otra";

/*
 * Qué clase de error fue, y nada más que la clase.
 *
 * El mensaje no se manda nunca: en este editor trae nombres de hojas, rutas del disco y a veces una
 * línea de los datos de quien lo usa. Lo que sí sirve es la clase, porque cada una se arregla en
 * otro lado: "dominio" es una regla del editor funcionando (el mensaje es para la persona, no es un
 * bug), "permiso-de-carpeta" es el navegador retirando lo que había dado, "sin-memoria" es una hoja
 * o un mapa más grande de lo que la máquina aguanta, y "otro" es lo que hay que ir a mirar.
 */
export type TipoDeError =
  | "dominio"
  | "permiso-de-carpeta"
  | "no-esta"
  | "sin-espacio"
  | "sin-memoria"
  | "red"
  | "otro";

export type Evento =
  /** Alguien pasó la puerta y se puso a trabajar. Es la medida de uso real, no de visitas. */
  | { tipo: "carpeta elegida" }
  /** Alguien no pudo entrar porque su navegador no abre carpetas. */
  | { tipo: "navegador sin soporte"; navegador: NavegadorSinCarpetas }
  /** Qué tan grande es el mundo de quien lo usa, una vez por colección y por sesión. */
  | { tipo: "mundo medido"; coleccion: Coleccion; tamanio: Tramo }
  /** Qué partes del mundo se llevó. */
  | { tipo: "exportado"; que: QueSeExporto }
  /** Qué paso del importador del clásico corrió, y si salió bien. */
  | { tipo: "importado"; paso: PasoDeImportacion; resultado: "ok" | "error" }
  /** Algo se rompió: qué clase de cosa y en qué pantalla. Nunca el mensaje. */
  | { tipo: "error inesperado"; pantalla: Pantalla; error: TipoDeError };

/**
 * El puerto. Medir es «mandar y olvidarse»: no devuelve nada, no falla y no se espera.
 *
 * Que no devuelva una promesa es deliberado: ninguna pantalla debería poder quedarse esperando a
 * que una medición termine, ni enterarse de que no salió.
 */
export interface Telemetria {
  medir(evento: Evento): void;
}

/**
 * De la ruta a la pantalla, con "otra" para lo que no esté en la lista.
 *
 * El `pathname` es un texto que viene de afuera —puede ser cualquier cosa, incluso algo que alguien
 * escribió en la barra—, así que esto es también el filtro que evita que ese texto llegue crudo a
 * un evento.
 */
export function pantallaDe(ruta: string): Pantalla {
  const primerTramo = ruta.split("/")[1] ?? "";
  return (PANTALLAS as readonly string[]).includes(primerTramo) ? (primerTramo as Pantalla) : "otra";
}

const PANTALLAS: readonly Pantalla[] = [
  "animaciones",
  "apariencias",
  "npcs",
  "objetos",
  "fx",
  "hechizos",
  "mapas",
  "diagnostico",
  "importar",
  "exportar",
];

/** De cuántos hay al tramo que se manda. */
export function tramoDe(cuantos: number): Tramo {
  if (cuantos <= 0) return "vacío";
  if (cuantos <= 10) return "1-10";
  if (cuantos <= 100) return "11-100";
  if (cuantos <= 1000) return "101-1000";
  return "1000+";
}
