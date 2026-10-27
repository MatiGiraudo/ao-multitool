"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { contenedorCliente, type ContenedorCliente } from "@/contenedor/cliente";
import { Cargando } from "./componentes";

/*
 * Inyección de dependencias para React: la interfaz pide los casos de uso a este contexto
 * en lugar de crearlos ella misma. Los componentes no saben si por detrás hay HTTP, disco o memoria.
 */

interface ValorAplicacion {
  casos: ContenedorCliente;
  avisar: (mensaje: string) => void;
  /**
   * Ejecuta una acción y muestra el error como aviso si falla. Devuelve undefined en ese caso.
   *
   * La `etiqueta` es para las acciones que pueden tardar («Redimensionando…»): mientras corren, la
   * app muestra ese cartel. Van sin etiqueta las instantáneas y, sobre todo, lo que corre solo de
   * fondo (el JSON de la vista previa se recalcula con cada tecla): ahí el cartel sería un parpadeo.
   */
  intentar: <T>(fn: () => Promise<T>, etiqueta?: string) => Promise<T | undefined>;
  /**
   * Cada pantalla que mantiene una colección se anota acá (lo hace `useColeccionEditable` solo).
   * Devuelve la función para desanotarse al desmontarse.
   */
  registrarRecarga: (recargar: () => Promise<void>) => () => void;
  /** Refresca todo lo que esté montado. Lo usan las operaciones que cruzan módulos, como importar un proyecto. */
  recargarTodo: () => Promise<void>;
}

const Contexto = createContext<ValorAplicacion | null>(null);

const DEMORA_DEL_CARTEL = 250;

export function ProveedorDeAplicacion({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<{ texto: string; n: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avisar = useCallback((texto: string) => {
    setAviso((a) => ({ texto, n: (a?.n ?? 0) + 1 }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAviso(null), 3200);
  }, []);

  /*
   * El cartel de «esto está tardando».
   *
   * Aparece recién a los 250 ms porque casi todo termina antes, y un cartel que parpadea molesta más
   * de lo que ayuda. Lo que corre se anota en una lista y no en un booleano: así dos acciones a la
   * vez no se apagan el cartel entre ellas.
   *
   * `enVuelo` queda fuera del `valor` del contexto a propósito. Nadie afuera lo necesita, y dejarlo
   * afuera significa que mostrar y esconder el cartel no vuelve a renderizar la app entera.
   */
  const [enVuelo, setEnVuelo] = useState<readonly { id: number; etiqueta: string }[]>([]);
  const proximoId = useRef(0);
  const [mostrarCartel, setMostrarCartel] = useState(false);
  const hayAlgo = enVuelo.length > 0;

  useEffect(() => {
    if (!hayAlgo) {
      setMostrarCartel(false);
      return;
    }
    const t = setTimeout(() => setMostrarCartel(true), DEMORA_DEL_CARTEL);
    return () => clearTimeout(t);
  }, [hayAlgo]);

  const conEtiqueta = useCallback(async <T,>(etiqueta: string, fn: () => Promise<T>) => {
    const id = proximoId.current++;
    setEnVuelo((xs) => [...xs, { id, etiqueta }]);
    try {
      return await fn();
    } finally {
      setEnVuelo((xs) => xs.filter((x) => x.id !== id));
    }
  }, []);

  const intentar = useCallback(
    async <T,>(fn: () => Promise<T>, etiqueta?: string) => {
      try {
        return etiqueta ? await conEtiqueta(etiqueta, fn) : await fn();
      } catch (e) {
        avisar(e instanceof Error ? e.message : String(e));
        return undefined;
      }
    },
    [avisar, conEtiqueta],
  );

  const recargas = useRef(new Set<() => Promise<void>>());

  const registrarRecarga = useCallback((recargar: () => Promise<void>) => {
    recargas.current.add(recargar);
    return () => {
      recargas.current.delete(recargar);
    };
  }, []);

  // Releer todas las listas montadas puede tardar (miles de hojas), así que muestra el cartel solo.
  const recargarTodo = useCallback(
    () => conEtiqueta("Actualizando las listas…", () => Promise.all([...recargas.current].map((f) => f()))).then(() => undefined),
    [conEtiqueta],
  );

  const valor = useMemo(
    () => ({ casos: contenedorCliente(), avisar, intentar, registrarRecarga, recargarTodo }),
    [avisar, intentar, registrarRecarga, recargarTodo],
  );

  return (
    <Contexto.Provider value={valor}>
      {children}
      <div className={`toast${aviso ? " show" : ""}`} role="status" aria-live="polite">
        {aviso?.texto}
      </div>
      {mostrarCartel && hayAlgo && <Cargando className="flotante">{enVuelo[enVuelo.length - 1]!.etiqueta}</Cargando>}
    </Contexto.Provider>
  );
}

export function useAplicacion(): ValorAplicacion {
  const v = useContext(Contexto);
  if (!v) throw new Error("useAplicacion necesita <ProveedorDeAplicacion>.");
  return v;
}
