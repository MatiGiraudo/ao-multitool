/*
 * Abrir un selector del sistema, distinguiendo «se cerró con tu mano» de «no se abrió nunca».
 *
 * Chrome tira el mismo `AbortError` en los dos casos: lo documenta MDN y lo confirma el bug de
 * Electron 42459, que se queja de que la negativa no llega siquiera a pasar por los permisos.
 * Nada en el error los distingue… pero el reloj sí. Cancelar es ver el cuadro, mirarlo y cerrarlo,
 * y eso no baja del medio segundo; una negativa de Chrome vuelve en lo que tarda una llamada que
 * no hizo nada.
 *
 * Vale la pena separarlos porque los consejos son opuestos. Al que no vio ningún cuadro hay que
 * mandarlo al permiso del sitio, que es lo único que puede cerrar un selector sin abrirlo. Al que
 * lo vio y volvió con las manos vacías, al cartelito de Chrome que pregunta si el sitio puede ver
 * los archivos: si el sitio lo tiene bloqueado, Chrome lo rechaza solo y sin mostrar nada, después
 * de que el cuadro ya estuvo abierto. Y recién en tercer lugar, a dónde está la carpeta.
 *
 * Vive en su propio archivo porque lo usan los dos lados de la misma puerta: los selectores de los
 * archivos del juego y la puerta de la carpeta del proyecto, que no se conocen entre sí.
 */

/** Menos que esto no lo cerró una persona. */
const UN_PARPADEO = 250;

/** El selector que volvió con las manos vacías, con las palabras del navegador adentro. */
export class SelectorVacio {
  constructor(
    readonly abrio: boolean,
    private readonly dijo: string,
  ) {}

  get explicacion(): string {
    return `${this.abrio ? QUIZAS_CANCELASTE : NUNCA_SE_ABRIO} ${comoLoDijoEl(this.dijo)}`;
  }
}

export async function abrirSelector<T>(abrir: () => Promise<T>): Promise<T | SelectorVacio> {
  const empezo = performance.now();
  try {
    return await abrir();
  } catch (e) {
    if ((e as DOMException)?.name !== "AbortError") throw e;
    const tardo = performance.now() - empezo;
    return new SelectorVacio(tardo >= UN_PARPADEO, `${comoLoDijo(e)}, a los ${Math.round(tardo)} ms`);
  }
}

/*
 * Las palabras del navegador, tal cual, pegadas al final del cartel.
 *
 * Son en inglés y no se las escribió nadie pensando en quien las va a leer, así que van al final y
 * entre paréntesis. Pero son lo único que distingue un caso del otro cuando el nuestro falla en la
 * máquina de otro: sin esto, lo único que vuelve es «sigue igual», y de ahí no se sale adivinando.
 */
export function comoLoDijo(e: unknown): string {
  const error = e as DOMException;
  return error?.name ? `${error.name}: ${error.message}` : String(e);
}

export const comoLoDijoEl = (dijo: string | undefined) => (dijo ? `(El navegador dijo: ${dijo}.)` : "");

const NUNCA_SE_ABRIO =
  "El navegador cerró el selector sin llegar a abrirlo. Eso no lo decide la página: es el permiso del sitio. Tocá el candado al lado de la dirección y fijate si hay algo bloqueado ahí; si la máquina es de la empresa, puede ser una política de Chrome.";

/*
 * La lista de carpetas que el navegador no entrega, en el orden en que conviene revisarla.
 *
 * Las cuatro primeras son la trampa buena, porque son las que uno usa todos los días: Chrome las
 * bloquea a ellas mismas pero no a lo que tienen adentro (`kDontBlockChildren`), así que
 * `Descargas\Mundos` se entrega y `Descargas` no. En el cuadro de Windows la diferencia es un
 * doble clic: parado en Descargas, «Seleccionar carpeta» elige Descargas. Y el rechazo después es
 * el mismo `AbortError` del cancelar, así que uno jura que eligió bien.
 */
const QUIZAS_CANCELASTE =
  "El selector se abrió pero volvió con las manos vacías. Si lo cancelaste, listo. Si elegíste una carpeta, fijate cuál: el navegador no entrega Descargas, Documentos, el Escritorio ni tu carpeta de usuario —esas mismas, no lo que tienen adentro—, ni nada que viva en Program Files, en Windows o en la raíz de C:. Entrá a la carpeta que querés y elegí esa, no la que la contiene. Si la carpeta estaba bien, entonces es el permiso del sitio: tocá el candado al lado de la dirección y restablecé los permisos.";
