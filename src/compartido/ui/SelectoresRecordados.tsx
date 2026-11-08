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
    const archivo = await intentar(() => recordado.elegir(tipos).catch(sinEntregar));
    if (archivo === SIN_ENTREGAR) {
      avisar(SE_CERRO_SOLO);
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
    const archivos = await recordada.archivos().catch(() => null);
    setLeyendo(false);
    if (!archivos) {
      /* El nombre antes de olvidarla: `olvidar` suelta el handle y con él el nombre. */
      const nombre = recordada.nombre;
      await recordada.olvidar();
      setEstado("sin-elegir");
      setNota(`No se pudo abrir «${nombre}». Puede que se haya movido, o que el navegador ya no la deje leer: elegila de nuevo.`);
      return;
    }
    setNota("");
    /* Se entrega aunque no haya venido nada. Que la carpeta esté vacía, o que no tenga lo que se
     * buscaba, lo sabe decir quien pidió —y lo dice en su propio panel, con el detalle de qué
     * esperaba—; quedarse callado acá dejaba la pantalla igual que antes del clic. */
    onArchivos(archivos);
  };

  const elegir = async () => {
    empezar();
    const elegida = await intentar(() => recordada.elegir().then(() => "elegida" as const, sinEntregar));
    if (elegida === SIN_ENTREGAR) {
      setNota(SE_CERRO_SOLO);
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

  const aviso = nota ? <p className="hint aviso">{nota}</p> : null;

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

/**
 * El selector se cerró sin entregar nada, y no hay forma de saber por qué.
 *
 * Chrome tira el mismo `AbortError` si cancelaste y si se negó a entregar lo que elegíste: tiene
 * una lista de carpetas de sistema que no deja leer —`Program Files`, `Windows`, la raíz de `C:`—
 * y una instalación del AO suele estar justo adentro de una. Lo documenta MDN y lo confirma el bug
 * de Electron 42459: el mismo error, sin nada que los distinga, y sin que llegue a pasar por los
 * permisos. Así que el cartel cuenta los dos casos en vez de adivinar uno, que es mejor que la
 * pantalla muda de antes: el clic no hacía nada y no decía nada.
 */
const SE_CERRO_SOLO =
  "El selector se cerró sin entregar nada. Si lo cancelaste, listo. Si no, Chrome se niega a abrir lo que está en una carpeta de sistema —Program Files, Windows, la raíz de C:— y avisa igual que si hubieras cancelado: copiá lo que necesitás a Documentos o al Escritorio y elegilo de ahí.";

/** El valor que distingue «canceló o se negó» de «falló de verdad», que ya avisa `intentar`. */
const SIN_ENTREGAR = "sin-entregar";

function sinEntregar(e: unknown): typeof SIN_ENTREGAR {
  if ((e as DOMException)?.name === "AbortError") return SIN_ENTREGAR;
  throw e;
}

/** Los cuadraditos y un texto, para adentro de un botón. */
function Trabajando({ children }: { children: ReactNode }) {
  return (
    <>
      <PuntosDeCarga />
      {children}
    </>
  );
}
