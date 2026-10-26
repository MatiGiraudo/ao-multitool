"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import type { CalidadDeEscalado } from "../aplicacion/puertos";
import type { HojaDeSprites } from "../dominio/HojaDeSprites";
import type { Tamanio } from "../dominio/Tamanio";

/*
 * Estado de Gráficos para toda la app (lo usan la pestaña Animaciones y la de Objetos).
 *
 * Los cambios de edición (mover frames, renombrar…) se aplican al instante en memoria
 * y se guardan en disco 400 ms después del último cambio. Así arrastrar un frame no dispara
 * cien escrituras, pero nunca perdés más que una fracción de segundo de trabajo.
 */

type EstadoGuardado = "guardado" | "guardando" | "error";

interface ValorGraficos {
  hojas: readonly HojaDeSprites[];
  cargando: boolean;
  estadoGuardado: EstadoGuardado;
  hoja(id: string | null | undefined): HojaDeSprites | undefined;
  actualizar(hoja: HojaDeSprites): void;
  crearDesdeImagen(archivo: File): Promise<HojaDeSprites | undefined>;
  reemplazarImagen(hojaId: string, archivo: File): Promise<HojaDeSprites | undefined>;
  eliminar(hojaId: string): Promise<boolean>;
  redimensionar(hojaId: string, tamanio: Tamanio, calidad: CalidadDeEscalado, escalarContenido: boolean): Promise<HojaDeSprites | undefined>;
  restaurarOriginal(hojaId: string, escalarContenido: boolean): Promise<HojaDeSprites | undefined>;
  importar(texto: string): Promise<{ hoja: HojaDeSprites; creada: boolean } | undefined>;
  recargar(): Promise<void>;
  urlImagen(hoja: HojaDeSprites | undefined): string | null;
}

const Contexto = createContext<ValorGraficos | null>(null);

export function ProveedorDeGraficos({ children }: { children: ReactNode }) {
  const { casos, intentar } = useAplicacion();
  const g = casos.graficos;
  const [hojas, setHojas] = useState<HojaDeSprites[]>([]);
  const [cargando, setCargando] = useState(true);
  const [estadoGuardado, setEstado] = useState<EstadoGuardado>("guardado");
  const pendientes = useRef(new Map<string, { hoja: HojaDeSprites; timer: ReturnType<typeof setTimeout> }>());
  const enVuelo = useRef(0);

  const recargar = useCallback(async () => {
    const lista = await intentar(() => g.listar.ejecutar());
    if (lista) setHojas(lista);
    setCargando(false);
  }, [g, intentar]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const reemplazarEnLista = useCallback((h: HojaDeSprites) => {
    setHojas((xs) => (xs.some((x) => x.id === h.id) ? xs.map((x) => (x.id === h.id ? h : x)) : [...xs, h]));
  }, []);

  const guardarYa = useCallback(
    async (id: string) => {
      const p = pendientes.current.get(id);
      if (!p) return;
      clearTimeout(p.timer);
      pendientes.current.delete(id);
      enVuelo.current++;
      setEstado("guardando");
      try {
        await g.guardar.ejecutar(p.hoja);
        enVuelo.current--;
        if (!enVuelo.current && !pendientes.current.size) setEstado("guardado");
      } catch {
        enVuelo.current--;
        setEstado("error");
      }
    },
    [g],
  );

  const actualizar = useCallback(
    (h: HojaDeSprites) => {
      reemplazarEnLista(h);
      const previo = pendientes.current.get(h.id);
      if (previo) clearTimeout(previo.timer);
      pendientes.current.set(h.id, { hoja: h, timer: setTimeout(() => void guardarYa(h.id), 400) });
      setEstado("guardando");
    },
    [reemplazarEnLista, guardarYa],
  );

  // Si se cierra la pestaña con cambios sin guardar, avisamos.
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => {
      if (pendientes.current.size) e.preventDefault();
    };
    addEventListener("beforeunload", f);
    return () => removeEventListener("beforeunload", f);
  }, []);

  const valor = useMemo<ValorGraficos>(
    () => ({
      hojas,
      cargando,
      estadoGuardado,
      hoja: (id) => hojas.find((h) => h.id === id),
      actualizar,
      recargar,
      urlImagen: (h) => (h && h.tieneImagen ? casos.ubicadorDeImagenes.urlDe(h.id, h.versionImagen) : null),
      async crearDesdeImagen(archivo) {
        const h = await intentar(() => g.crearDesdeImagen.ejecutar({ archivo, nombreArchivo: archivo.name }));
        if (h) reemplazarEnLista(h);
        return h;
      },
      async reemplazarImagen(hojaId, archivo) {
        await guardarYa(hojaId);
        const h = await intentar(() => g.reemplazarImagen.ejecutar({ hojaId, archivo, nombreArchivo: archivo.name }));
        if (h) reemplazarEnLista(h);
        return h;
      },
      async eliminar(hojaId) {
        const p = pendientes.current.get(hojaId);
        if (p) clearTimeout(p.timer);
        pendientes.current.delete(hojaId);
        const ok = await intentar(async () => (await g.eliminar.ejecutar(hojaId), true));
        if (ok) setHojas((xs) => xs.filter((x) => x.id !== hojaId));
        return !!ok;
      },
      async redimensionar(hojaId, tamanio, calidad, escalarContenido) {
        await guardarYa(hojaId);
        const h = await intentar(() => g.redimensionar.ejecutar({ hojaId, tamanio, calidad, escalarContenido }));
        if (h) reemplazarEnLista(h);
        return h;
      },
      async restaurarOriginal(hojaId, escalarContenido) {
        await guardarYa(hojaId);
        const h = await intentar(() => g.restaurarOriginal.ejecutar({ hojaId, escalarContenido }));
        if (h) reemplazarEnLista(h);
        return h;
      },
      async importar(texto) {
        await Promise.all([...pendientes.current.keys()].map(guardarYa));
        const r = await intentar(() => g.importar.ejecutar(texto));
        if (r) reemplazarEnLista(r.hoja);
        return r;
      },
    }),
    [hojas, cargando, estadoGuardado, actualizar, recargar, casos, g, intentar, reemplazarEnLista, guardarYa],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useGraficos(): ValorGraficos {
  const v = useContext(Contexto);
  if (!v) throw new Error("useGraficos necesita <ProveedorDeGraficos>.");
  return v;
}
