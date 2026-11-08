"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArchivoRecordado, CarpetaRecordada, type EstadoRecordado } from "@/compartido/infraestructura/carpeta/HandleRecordado";
import { useAplicacion } from "./Aplicacion";
import { BotonArchivo, BotonArchivos, PuntosDeCarga } from "./componentes";

/*
 * Los selectores que no se olvidan de lo que elegiste.
 *
 * El editor lee archivos de otro programa —la carpeta `Graficos` del cliente, los siete archivos
 * del clásico, la carpeta `Mundos`—, y cada visita empezaba por volver a buscarlos a mano en el
 * selector del sistema. Acá lo elegido queda guardado (`HandleRecordado`) y la segunda vez son
 * dos botones: el primario relee lo de siempre, y el de al lado deja elegir otra cosa.
 *
 * Entregan lo mismo que entregaban los `<input type=file>` que reemplazan —un `File`, o una lista
 * de `File`—, así que quien los usa no cambió en nada más que el nombre del componente.
 *
 * En Firefox y en Safari no hay API que recordar, y ahí caen al `<input>` de antes: se pierde la
 * comodidad, no la función. Por eso `estado` arranca en "mirando" y no preguntando si la API
 * está: en el servidor no está, y decidirlo al renderizar le daba a todo el mundo el HTML del
 * camino sin soporte y rehacía el árbol al hidratar. Es el mismo cuidado que `PuertaDeCarpeta`.
 */

type Estado = "mirando" | "sin-soporte" | EstadoRecordado;

/** Lo que el botón dice mientras trabaja: lo pone quien lo usa, porque sólo él sabe en qué anda. */
type Ocupado = ReactNode | undefined;

export function BotonArchivoRecordado({
  clave,
  accept,
  tipos,
  etiqueta,
  ocupado,
  onArchivo,
  className,
  id,
}: {
  /** Con qué nombre se recuerda. Uno por cosa: el `Graficos.ini` no es el `OBJ.dat`. */
  clave: string;
  /** El filtro del `<input>`, para los navegadores sin la API. */
  accept: string;
  /** El filtro del selector de la API, que pide tipo MIME y extensiones. */
  tipos: readonly FilePickerAcceptType[];
  etiqueta: string;
  ocupado?: Ocupado;
  onArchivo: (archivo: File) => void;
  className?: string;
  id?: string;
}) {
  const { avisar, intentar } = useAplicacion();
  const recordado = useMemo(() => new ArchivoRecordado(clave), [clave]);
  const [estado, setEstado] = useState<Estado>("mirando");

  useEffect(() => {
    if (!ArchivoRecordado.disponible) {
      setEstado("sin-soporte");
      return;
    }
    void recordado
      .recuperar()
      .then(setEstado)
      .catch(() => setEstado("sin-elegir"));
  }, [recordado]);

  const elegir = async () => {
    const archivo = await intentar(() => abrirSelector(() => recordado.elegir(tipos)));
    if (archivo instanceof SelectorVacio) {
      avisar(archivo.explicacion);
      return;
    }
    if (!archivo) return;
    setEstado("listo");
    onArchivo(archivo);
  };

  const volverALeer = async () => {
    if (estado === "falta-permiso" && !(await recordado.pedirPermiso())) {
      avisar(`El navegador no dio permiso sobre «${recordado.nombre}». Podés elegirlo de nuevo.`);
      return;
    }
    setEstado("listo");
    /* Que no esté quiere decir que se movió o se borró desde la última vez. Lo recordado ya no
     * sirve, así que se olvida y el botón vuelve a ser el de elegir: insistir no lo va a traer. */
    const archivo = await recordado.leer().catch(() => null);
    if (!archivo) {
      await recordado.olvidar();
      setEstado("sin-elegir");
      avisar("Ese archivo ya no está donde estaba. Elegilo de nuevo.");
      return;
    }
    onArchivo(archivo);
  };

  if (estado === "mirando" || estado === "sin-soporte") {
    return (
      <BotonArchivo id={id} className={className} accept={accept} onArchivo={onArchivo}>
        {ocupado ?? etiqueta}
      </BotonArchivo>
    );
  }

  if (estado === "sin-elegir") {
    return (
      <button id={id} className={className} disabled={!!ocupado} onClick={elegir}>
        {ocupado ?? etiqueta}
      </button>
    );
  }

  return (
    <>
      <button
        id={id}
        className={className}
        disabled={!!ocupado}
        onClick={volverALeer}
        title={estado === "falta-permiso" ? PIDE_PERMISO : undefined}
      >
        {ocupado ?? `Volver a leer «${recordado.nombre}»`}
      </button>
      <button disabled={!!ocupado} onClick={elegir}>
        Elegir otro…
      </button>
    </>
  );
}

export function BotonCarpetaRecordada({
  clave,
  accept,
  etiqueta,
  ocupado,
  onArchivos,
  alIntentar,
  className,
  id,
}: {
  clave: string;
  /** El filtro del `<input>`. El selector de carpetas no filtra: entrega todo lo que hay adentro. */
  accept: string;
  etiqueta: string;
  ocupado?: Ocupado;
  onArchivos: (archivos: File[]) => void;
  /**
   * Empieza un intento nuevo. Quien lo usa aprovecha para borrar lo que haya dicho del anterior:
   * si no, su cartel —«la carpeta vino vacía»— queda al lado del de acá diciendo otra cosa.
   */
  alIntentar?: () => void;
  className?: string;
  id?: string;
}) {
  const { intentar } = useAplicacion();
  const recordada = useMemo(() => new CarpetaRecordada(clave), [clave]);
  const [estado, setEstado] = useState<Estado>("mirando");
  /* Lo que pasó en el último intento, cuando no se pudo entregar nada. Va pegado al botón y no al
   * aviso de arriba, que se borra a los tres segundos: el usuario vuelve del selector del sistema
   * justo para no verlo, y lo que le queda es la misma pantalla que antes de hacer clic. */
  const [nota, setNota] = useState("");
  /* Recorrer la `Graficos` del clásico son miles de archivos: tarda lo suficiente como para que
   * el botón tenga que decir algo, y eso pasa antes de que quien lo usa vea el primer archivo. */
  const [leyendo, setLeyendo] = useState(false);

  useEffect(() => {
    if (!CarpetaRecordada.disponible) {
      setEstado("sin-soporte");
      return;
    }
    void recordada
      .recuperar()
      .then(setEstado)
      .catch(() => setEstado("sin-elegir"));
  }, [recordada]);

  const trabajando: Ocupado = ocupado ?? (leyendo ? <Trabajando>Leyendo la carpeta…</Trabajando> : undefined);

  /** Lo dicho del intento anterior ya no vale, ni lo de acá ni lo de quien lo usa. */
  const empezar = () => {
    setNota("");
    alIntentar?.();
  };

  const entregar = async () => {
    setLeyendo(true);
    const leido = await recordada.archivos().then(
      (archivos) => ({ archivos }),
      (e: unknown) => ({ archivos: null, fallo: comoLoDijo(e) }),
    );
    setLeyendo(false);
    if (!leido.archivos) {
      /* El nombre antes de olvidarla: `olvidar` suelta el handle y con él el nombre. */
      const nombre = recordada.nombre;
      await recordada.olvidar();
      setEstado("sin-elegir");
      setNota(`No se pudo abrir «${nombre}». Puede que se haya movido, o que el navegador ya no la deje leer: elegila de nuevo. ${comoLoDijoEl(leido.fallo)}`);
      return;
    }
    setNota("");
    /* Se entrega aunque no haya venido nada. Que la carpeta esté vacía, o que no tenga lo que se
     * buscaba, lo sabe decir quien pidió —y lo dice en su propio panel, con el detalle de qué
     * esperaba—; quedarse callado acá dejaba la pantalla igual que antes del clic. */
    onArchivos(leido.archivos);
  };

  const elegir = async () => {
    empezar();
    const elegida = await intentar(() => abrirSelector(() => recordada.elegir().then(() => "elegida" as const)));
    if (elegida instanceof SelectorVacio) {
      setNota(elegida.explicacion);
      return;
    }
    if (!elegida) return;
    setEstado("listo");
    await entregar();
  };

  const volverALeer = async () => {
    empezar();
    if (estado === "falta-permiso" && !(await recordada.pedirPermiso())) {
      setNota(`El navegador no dio permiso sobre «${recordada.nombre}». Podés elegirla de nuevo.`);
      return;
    }
    setEstado("listo");
    await entregar();
  };

  /*
   * El cartel y, debajo, la salida de emergencia.
   *
   * El `<input type=file webkitdirectory>` de siempre no pasa por la File System Access API, así
   * que no se topa con nada de lo que a esa la hace fallar: ni el permiso del sitio, ni la lista
   * de carpetas que el navegador no entrega, ni IndexedDB. Es el mismo camino por el que entran
   * Firefox y Safari, y devuelve exactamente la misma lista de `File`. Se pierde que la carpeta
   * quede recordada; se gana poder trabajar hoy en vez de esperar a que alguien adivine qué le
   * pasa a tu navegador. Aparece recién cuando el camino bueno falló, que es cuando vale la pena
   * ofrecer el que tiene menos comodidades.
   */
  const aviso = nota ? (
    <>
      <p className="hint aviso">{nota}</p>
      <BotonArchivos carpeta accept={accept} disabled={!!trabajando} onArchivos={onArchivos}>
        Probar de otra forma…
      </BotonArchivos>
    </>
  ) : null;

  if (estado === "mirando" || estado === "sin-soporte") {
    return (
      <BotonArchivos carpeta id={id} className={className} accept={accept} disabled={!!trabajando} onArchivos={onArchivos}>
        {trabajando ?? etiqueta}
      </BotonArchivos>
    );
  }

  if (estado === "sin-elegir") {
    return (
      <>
        <button id={id} className={className} disabled={!!trabajando} onClick={elegir}>
          {trabajando ?? etiqueta}
        </button>
        {aviso}
      </>
    );
  }

  return (
    <>
      <button
        id={id}
        className={className}
        disabled={!!trabajando}
        onClick={volverALeer}
        title={estado === "falta-permiso" ? PIDE_PERMISO : undefined}
      >
        {trabajando ?? `Volver a leer «${recordada.nombre}»`}
      </button>
      <button disabled={!!trabajando} onClick={elegir}>
        Elegir otra…
      </button>
      {aviso}
    </>
  );
}

const PIDE_PERMISO = "El navegador pide el permiso de nuevo en cada sesión, y sólo lo puede pedir cuando hacés clic: por eso el botón.";

/*
 * Abrir un selector del sistema, distinguiendo «se cerró con tu mano» de «no se abrió nunca».
 *
 * Chrome tira el mismo `AbortError` en los dos casos: lo documenta MDN y lo confirma el bug de
 * Electron 42459, que se queja de que la negativa no llega siquiera a pasar por los permisos.
 * Nada en el error los distingue… pero el reloj sí. Cancelar es ver el cuadro, mirarlo y
 * cerrarlo, y eso no baja del medio segundo; una negativa de Chrome vuelve en lo que tarda una
 * llamada que no hizo nada.
 *
 * Vale la pena separarlos porque los consejos son opuestos. Al que no vio ningún cuadro hay que
 * mandarlo al permiso del sitio, que es lo único que puede cerrar un selector sin abrirlo. Al que
 * lo vio y volvió con las manos vacías, al cartelito de Chrome que pregunta si el sitio puede ver
 * los archivos: si el sitio lo tiene bloqueado, Chrome lo rechaza solo y sin mostrar nada, después
 * de que el cuadro ya estuvo abierto. Y recién en tercer lugar, a dónde está la carpeta, porque
 * tampoco entrega lo que vive en `Program Files`, en `Windows` o en la raíz de `C:`.
 */
/** Menos que esto no lo cerró una persona. */
const UN_PARPADEO = 250;

/** El selector que volvió con las manos vacías, con las palabras del navegador adentro. */
class SelectorVacio {
  constructor(
    readonly abrio: boolean,
    private readonly dijo: string,
  ) {}

  get explicacion(): string {
    return `${this.abrio ? QUIZAS_CANCELASTE : NUNCA_SE_ABRIO} ${comoLoDijoEl(this.dijo)}`;
  }
}

async function abrirSelector<T>(abrir: () => Promise<T>): Promise<T | SelectorVacio> {
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
 * Son en inglés y no se las escribió nadie pensando en quien las va a leer, así que van al final
 * y entre paréntesis. Pero son lo único que distingue un caso del otro cuando el nuestro falla en
 * la máquina de otro: sin esto, lo único que vuelve es «sigue igual», y de ahí no se sale
 * adivinando.
 */
function comoLoDijo(e: unknown): string {
  const error = e as DOMException;
  return error?.name ? `${error.name}: ${error.message}` : String(e);
}

const comoLoDijoEl = (dijo: string | undefined) => (dijo ? `(El navegador dijo: ${dijo}.)` : "");

const NUNCA_SE_ABRIO =
  "El navegador cerró el selector sin llegar a abrirlo. Eso no lo decide la página: es el permiso del sitio. Tocá el candado al lado de la dirección y fijate si hay algo bloqueado ahí; si la máquina es de la empresa, puede ser una política de Chrome.";

const QUIZAS_CANCELASTE =
  "El selector se abrió pero volvió con las manos vacías. Si lo cancelaste, listo. Si elegíste la carpeta, lo más probable es que el sitio tenga bloqueado el permiso para ver archivos, y entonces Chrome lo rechaza solo, sin mostrar nada: tocá el candado al lado de la dirección, dale a restablecer los permisos y volvé a elegirla. Lo tercero que puede ser es dónde está: tampoco entrega lo que vive en Program Files, en Windows o en la raíz de C:.";

/** Los cuadraditos y un texto, para adentro de un botón. */
function Trabajando({ children }: { children: ReactNode }) {
  return (
    <>
      <PuntosDeCarga />
      {children}
    </>
  );
}
