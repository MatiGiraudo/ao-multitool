"use client";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { contenedorCliente, type ContenedorCliente } from "@/contenedor/cliente";

/*
 * Inyección de dependencias para React: la interfaz pide los casos de uso a este contexto
 * en lugar de crearlos ella misma. Los componentes no saben si por detrás hay HTTP, disco o memoria.
 */

interface ValorAplicacion {
  casos: ContenedorCliente;
  avisar: (mensaje: string) => void;
  /** Ejecuta una acción y muestra el error como aviso si falla. Devuelve undefined en ese caso. */
  intentar: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
  /**
   * Cada pantalla que mantiene una colección se anota acá (lo hace `useColeccionEditable` solo).
   * Devuelve la función para desanotarse al desmontarse.
   */
  registrarRecarga: (recargar: () => Promise<void>) => () => void;
  /** Refresca todo lo que esté montado. Lo usan las operaciones que cruzan módulos, como importar un proyecto. */
  recargarTodo: () => Promise<void>;
}

const Contexto = createContext<ValorAplicacion | null>(null);

export function ProveedorDeAplicacion({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<{ texto: string; n: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avisar = useCallback((texto: string) => {
    setAviso((a) => ({ texto, n: (a?.n ?? 0) + 1 }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAviso(null), 3200);
  }, []);

  const intentar = useCallback(
    async <T,>(fn: () => Promise<T>) => {
      try {
        return await fn();
      } catch (e) {
        avisar(e instanceof Error ? e.message : String(e));
        return undefined;
      }
    },
    [avisar],
  );

  const recargas = useRef(new Set<() => Promise<void>>());

  const registrarRecarga = useCallback((recargar: () => Promise<void>) => {
    recargas.current.add(recargar);
    return () => {
      recargas.current.delete(recargar);
    };
  }, []);

  const recargarTodo = useCallback(async () => {
    await Promise.all([...recargas.current].map((f) => f()));
  }, []);

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
    </Contexto.Provider>
  );
}

export function useAplicacion(): ValorAplicacion {
  const v = useContext(Contexto);
  if (!v) throw new Error("useAplicacion necesita <ProveedorDeAplicacion>.");
  return v;
}
