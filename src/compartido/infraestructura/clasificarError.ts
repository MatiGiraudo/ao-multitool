import type { TipoDeError } from "@/compartido/aplicacion/Telemetria";
import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";

/**
 * De un error cualquiera a la clase que se puede medir. `null` quiere decir «esto no es un error
 * que valga medir».
 *
 * Acá sí se mira el mensaje, y no se contradice con no mandarlo nunca: eso es justamente lo que
 * hace esta función. El mensaje se lee en la máquina de quien usa el editor para decidir de qué
 * clase es, y lo único que sale es la clase. Sin mirarlo, medio `TypeError` sería «red» y medio
 * `RangeError` sería «sin memoria», que es peor que no medir: esconde bugs de verdad detrás de una
 * etiqueta tranquilizadora.
 *
 * Vive en infraestructura porque conoce las dos puntas: el error del dominio y los nombres que
 * reparte la plataforma (`DOMException`, los de la File System Access API, los de Next). El puerto
 * declara qué se puede decir; traducir el mundo real a eso es trabajo de un adaptador.
 */
export function clasificarError(e: unknown): TipoDeError | null {
  /*
   * Cancelar no es fallar. Cerrar el selector de carpetas tira `AbortError`, y es alguien que
   * cambió de idea: medirlo sería inventar un problema que no pasó.
   */
  if (nombre(e) === "AbortError") return null;

  /* El `name` además del `instanceof`: un error que cruzó un límite puede llegar sin su prototipo. */
  if (e instanceof ErrorDeDominio || nombre(e) === "ErrorDeDominio") return "dominio";

  switch (nombre(e)) {
    /* El navegador retiró el permiso sobre la carpeta, o nunca lo dio. */
    case "NotAllowedError":
    case "SecurityError":
    /* La carpeta está abierta en otro lado y no deja escribir. */
    case "NoModificationAllowedError":
      return "permiso-de-carpeta";
    /* El archivo o la carpeta ya no están donde estaban: los movieron o los borraron por fuera. */
    case "NotFoundError":
      return "no-esta";
    case "QuotaExceededError":
      return "sin-espacio";
    /* Un trozo de la app que no se pudo bajar. En un sitio estático es la conexión, no un bug. */
    case "ChunkLoadError":
      return "red";
  }

  const m = mensaje(e);

  /*
   * Quedarse sin memoria es el límite real de este editor: un cliente clásico entero son miles de
   * hojas, y un mapa son 40.000 celdas por capa. Según qué lo pida, el navegador tira un
   * `RangeError` al reservar, un largo inválido de arreglo o de texto, o directamente «out of
   * memory». Es la clase que más conviene ver subir.
   */
  if (/allocation failed|invalid array length|invalid string length|out of memory/i.test(m)) return "sin-memoria";

  /*
   * `TypeError` es el más ambiguo de todos: lo tira `fetch` cuando no hay red, y lo tira un bug
   * cualquiera al tocar algo que es `undefined`. Sólo el primero es «red»; el resto tiene que caer
   * en «otro», que es la pila que hay que ir a mirar.
   */
  if (nombre(e) === "TypeError" && /failed to fetch|networkerror|load failed/i.test(m)) return "red";

  return "otro";
}

/*
 * Los dos campos se leen a lo pato y no con `instanceof Error`, porque acá llega de todo: una
 * `DOMException` de la File System Access API, un error que cruzó un límite de Next y perdió su
 * prototipo, o lo que haya tirado un `throw` de una biblioteca. Si se pide el prototipo, la mitad
 * de los errores que más importan caen en "otro" sin razón.
 */
function nombre(e: unknown): string {
  return typeof e === "object" && e !== null && "name" in e && typeof e.name === "string" ? e.name : "";
}

function mensaje(e: unknown): string {
  if (typeof e === "string") return e;
  return typeof e === "object" && e !== null && "message" in e && typeof e.message === "string" ? e.message : "";
}
