"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tramoDe, type Coleccion } from "@/compartido/aplicacion/Telemetria";
import { useAplicacion } from "./Aplicacion";

/*
 * Edición optimista con guardado diferido: el patrón de interfaz que repiten todas las pantallas
 * del editor y que conviene tener escrito una sola vez.
 *
 * Cómo funciona: el cambio se aplica al instante en memoria (así arrastrar un frame o tipear un
 * nombre se ve sin esperar al disco) y se guarda `demoraMs` después del último cambio de ESE item.
 * Si hay cambios sin guardar y se cierra la pestaña, el navegador avisa.
 *
 * Lo que hay que respetar al usarlo: antes de cualquier operación que vuelva a leer del servidor
 * (crear, duplicar, importar, exportar, redimensionar), llamá a `guardarPendientes()`. Si no, el
 * servidor contesta con datos viejos y se pierde lo último que escribió el usuario.
 */

export type EstadoGuardado = "guardado" | "guardando" | "error";

/*
 * Lo último que vio cada colección, para que cambiar de pestaña no empiece de cero.
 *
 * Cinco de las seis pantallas montan Gráficos, y listar las hojas de un cliente clásico tarda un
 * par de segundos: sin esto, cada ida y vuelta entre pestañas era volver a esperarlas mirando un
 * cartel. Se muestra lo recordado al instante y se relee igual por atrás, así que si algo cambió
 * afuera se corrige solo. Vive en memoria: recargar la página la vacía.
 */
const recordadas = new Map<string, readonly unknown[]>();

export interface ColeccionEditable<T> {
  items: readonly T[];
  cargando: boolean;
  estadoGuardado: EstadoGuardado;
  /** Aplica el cambio en memoria y programa su guardado. */
  actualizar(item: T): void;
  /** Lo suma o lo reemplaza en memoria, sin programar guardado: para lo que ya guardó un caso de uso. */
  poner(item: T): void;
  /** Lo saca de memoria y cancela su guardado pendiente. */
  quitar(clave: string): void;
  /** Descarta su guardado pendiente sin sacarlo de la lista (antes de borrarlo o de reemplazarlo). */
  cancelarPendiente(clave: string): void;
  /** Guarda ya mismo lo que esté pendiente: todo, o sólo un item. */
  guardarPendientes(clave?: string): Promise<void>;
  /** Vuelve a leer la lista del repositorio. */
  recargar(): Promise<void>;
}

export function useColeccionEditable<T>(opciones: {
  claveDe: (item: T) => string;
  listar: () => Promise<T[]>;
  guardar: (item: T) => Promise<void>;
  demoraMs?: number;
  /** Con qué nombre recordar la lista entre pantallas (ver `recordadas`). */
  recordarComo?: string;
  /**
   * Con qué nombre medir el tamaño de esta colección, si se mide.
   *
   * Se mide acá, y no en cada pantalla, porque acá ya está la lista leída: no cuesta una lectura
   * más. Y va en tramos («101-1000»), una vez por sesión, para contestar una sola pregunta: si el
   * editor aguanta proyectos de verdad o sólo pruebas de diez objetos.
   */
  medirComo?: Coleccion;
}): ColeccionEditable<T> {
  const { intentar, registrarRecarga, telemetria } = useAplicacion();
  const demora = opciones.demoraMs ?? 400;

  // Los callbacks se leen siempre en su versión más nueva, así el hook no se recrea con cada render.
  const ops = useRef(opciones);
  ops.current = opciones;

  const recordada = opciones.recordarComo ? (recordadas.get(opciones.recordarComo) as T[] | undefined) : undefined;
  const [items, setItems] = useState<T[]>(recordada ?? []);
  const [cargando, setCargando] = useState(!recordada);
  const [estadoGuardado, setEstado] = useState<EstadoGuardado>("guardado");
  const pendientes = useRef(new Map<string, { item: T; timer: ReturnType<typeof setTimeout> }>());
  const enVuelo = useRef(0);

  // Una vez por colección y por sesión: interesa con qué mundo se trabaja, no cada relectura.
  const medida = useRef(false);

  const recargar = useCallback(async () => {
    const lista = await intentar(() => ops.current.listar());
    if (lista) {
      setItems(lista);
      const coleccion = ops.current.medirComo;
      if (coleccion && !medida.current) {
        medida.current = true;
        telemetria.medir({ tipo: "mundo medido", coleccion, tamanio: tramoDe(lista.length) });
      }
    }
    setCargando(false);
  }, [intentar, telemetria]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  // Así "Importar proyecto…" puede refrescar todas las pantallas montadas sin conocer a ninguna.
  useEffect(() => registrarRecarga(recargar), [registrarRecarga, recargar]);

  useEffect(() => {
    if (ops.current.recordarComo) recordadas.set(ops.current.recordarComo, items);
  }, [items]);

  const poner = useCallback((item: T) => {
    const clave = ops.current.claveDe(item);
    setItems((xs) => (xs.some((x) => ops.current.claveDe(x) === clave) ? xs.map((x) => (ops.current.claveDe(x) === clave ? item : x)) : [...xs, item]));
  }, []);

  const olvidarPendiente = useCallback((clave: string) => {
    const p = pendientes.current.get(clave);
    if (p) clearTimeout(p.timer);
    pendientes.current.delete(clave);
  }, []);

  const quitar = useCallback(
    (clave: string) => {
      olvidarPendiente(clave);
      setItems((xs) => xs.filter((x) => ops.current.claveDe(x) !== clave));
    },
    [olvidarPendiente],
  );

  const guardarUno = useCallback(
    async (clave: string) => {
      const p = pendientes.current.get(clave);
      if (!p) return;
      olvidarPendiente(clave);
      enVuelo.current++;
      setEstado("guardando");
      const ok = await intentar(async () => (await ops.current.guardar(p.item), true));
      enVuelo.current--;
      if (!ok) setEstado("error");
      else if (!enVuelo.current && !pendientes.current.size) setEstado("guardado");
    },
    [intentar, olvidarPendiente],
  );

  const guardarPendientes = useCallback(
    async (clave?: string) => {
      if (clave !== undefined) return guardarUno(clave);
      await Promise.all([...pendientes.current.keys()].map(guardarUno));
    },
    [guardarUno],
  );

  const actualizar = useCallback(
    (item: T) => {
      const clave = ops.current.claveDe(item);
      poner(item);
      olvidarPendiente(clave);
      pendientes.current.set(clave, { item, timer: setTimeout(() => void guardarUno(clave), demora) });
      setEstado("guardando");
    },
    [poner, olvidarPendiente, guardarUno, demora],
  );

  // Si se cierra la pestaña con cambios sin guardar, avisamos.
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => {
      if (pendientes.current.size) e.preventDefault();
    };
    addEventListener("beforeunload", f);
    return () => removeEventListener("beforeunload", f);
  }, []);

  return useMemo(
    () => ({ items, cargando, estadoGuardado, actualizar, poner, quitar, cancelarPendiente: olvidarPendiente, guardarPendientes, recargar }),
    [items, cargando, estadoGuardado, actualizar, poner, quitar, olvidarPendiente, guardarPendientes, recargar],
  );
}
