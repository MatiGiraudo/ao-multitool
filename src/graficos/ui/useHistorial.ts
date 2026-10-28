"use client";
import { useCallback, useEffect, useReducer, useRef } from "react";
import type { HojaDeSprites } from "../dominio/HojaDeSprites";

/** Cuántos pasos atrás se recuerdan por hoja. */
const TOPE = 60;

export interface Historial {
  /** Aplica el cambio y lo deja anotado para poder deshacerlo. */
  cambiar(nueva: HojaDeSprites): void;
  deshacer(): void;
  rehacer(): void;
  puedeDeshacer: boolean;
  puedeRehacer: boolean;
}

/**
 * Deshacer y rehacer de la hoja abierta.
 *
 * Guarda hojas enteras, que sale gratis porque el dominio es inmutable: cada cambio devuelve una
 * hoja nueva y la anterior sigue entera en memoria, sin copiar nada.
 *
 * Dos decisiones que no son obvias:
 * - **El historial es por hoja.** Cambiar de hoja y volver encuentra sus propios pasos, en vez de
 *   deshacer en una hoja algo que se hizo en otra.
 * - **Lo que cambia la hoja por fuera de acá la olvida**: redimensionar, reemplazar la imagen o
 *   importar dejan una hoja que ya no corresponde a los pasos anotados, y deshacer hasta antes de
 *   eso mostraría frames que no tienen nada que ver con la imagen que se ve.
 */
export function useHistorial(hoja: HojaDeSprites | undefined, actualizar: (h: HojaDeSprites) => void): Historial {
  const pilas = useRef(new Map<string, { atras: HojaDeSprites[]; adelante: HojaDeSprites[] }>());
  // La hoja que el historial dio por buena, y la última que pasó por acá (para detectar las de afuera).
  const propia = useRef<HojaDeSprites | undefined>(undefined);
  const ultima = useRef<HojaDeSprites | undefined>(undefined);
  const [, repintar] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const previa = ultima.current;
    ultima.current = hoja;
    if (!hoja || !previa || previa.id !== hoja.id || hoja === previa || hoja === propia.current) return;
    pilas.current.delete(hoja.id);
    repintar();
  }, [hoja]);

  const pilaDe = (id: string) => {
    const p = pilas.current.get(id) ?? { atras: [], adelante: [] };
    pilas.current.set(id, p);
    return p;
  };

  const ir = useCallback(
    (desde: "atras" | "adelante") => {
      const actual = ultima.current;
      if (!actual) return;
      const p = pilas.current.get(actual.id);
      const destino = p?.[desde].pop();
      if (!p || !destino) return;
      p[desde === "atras" ? "adelante" : "atras"].push(actual);
      propia.current = destino;
      ultima.current = destino;
      actualizar(destino);
      repintar();
    },
    [actualizar],
  );

  const cambiar = useCallback(
    (nueva: HojaDeSprites) => {
      const previa = ultima.current;
      if (previa && previa.id === nueva.id) {
        const p = pilaDe(nueva.id);
        p.atras.push(previa);
        if (p.atras.length > TOPE) p.atras.shift();
        p.adelante.length = 0;
      }
      propia.current = nueva;
      ultima.current = nueva;
      actualizar(nueva);
      repintar();
    },
    [actualizar],
  );

  const p = hoja ? pilas.current.get(hoja.id) : undefined;
  return {
    cambiar,
    deshacer: useCallback(() => ir("atras"), [ir]),
    rehacer: useCallback(() => ir("adelante"), [ir]),
    puedeDeshacer: !!p?.atras.length,
    puedeRehacer: !!p?.adelante.length,
  };
}
