"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import type { Animacion } from "@/graficos/dominio/Animacion";
import type { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import { useGraficos } from "@/graficos/ui/ProveedorDeGraficos";
import type { CatalogoGrafico } from "../dominio/CatalogoGrafico";
import type { Objeto } from "../dominio/Objeto";
import type { ReferenciaGrafica } from "../dominio/ReferenciaGrafica";

/*
 * Estado de Objetos en la interfaz. Igual que Gráficos: cambios al instante en memoria
 * y guardado en disco poco después.
 *
 * Nota de arquitectura: la INTERFAZ de Objetos sí usa la interfaz de Gráficos (para dibujar),
 * pero el DOMINIO de Objetos no conoce a Gráficos: sólo ve el CatalogoGrafico.
 */

export interface GraficoResuelto {
  hoja: HojaDeSprites;
  animacion: Animacion;
}

interface ValorObjetos {
  objetos: readonly Objeto[];
  cargando: boolean;
  catalogo: CatalogoGrafico;
  /** De una referencia del objeto a la hoja y animación reales, para dibujarlas. */
  resolver(ref: ReferenciaGrafica | null | undefined): GraficoResuelto | null;
  actualizar(o: Objeto): void;
  crear(): Promise<Objeto | undefined>;
  duplicar(o: Objeto): Promise<Objeto | undefined>;
  eliminar(clave: string): Promise<boolean>;
  importar(texto: string): Promise<{ agregados: number; reemplazados: number; pendientes: number } | undefined>;
  exportar(): Promise<{ nombreArchivo: string; contenido: string } | undefined>;
  recargar(): Promise<void>;
}

const Contexto = createContext<ValorObjetos | null>(null);

export function ProveedorDeObjetos({ children }: { children: ReactNode }) {
  const { casos, intentar } = useAplicacion();
  const graficos = useGraficos();
  const c = casos.objetos;
  const [objetos, setObjetos] = useState<Objeto[]>([]);
  const [cargando, setCargando] = useState(true);
  const pendientes = useRef(new Map<string, { o: Objeto; timer: ReturnType<typeof setTimeout> }>());

  const recargar = useCallback(async () => {
    const l = await intentar(() => c.listar.ejecutar());
    if (l) setObjetos(l);
    setCargando(false);
  }, [c, intentar]);
  useEffect(() => {
    void recargar();
  }, [recargar]);

  const catalogo = useMemo(() => casos.crearCatalogo(graficos.hojas), [casos, graficos.hojas]);

  const poner = useCallback((o: Objeto) => setObjetos((xs) => (xs.some((x) => x.clave === o.clave) ? xs.map((x) => (x.clave === o.clave ? o : x)) : [...xs, o])), []);

  const guardarTodo = useCallback(async () => {
    const ps = [...pendientes.current.values()];
    pendientes.current.clear();
    for (const p of ps) {
      clearTimeout(p.timer);
      await intentar(() => c.guardar.ejecutar(p.o));
    }
  }, [c, intentar]);

  const valor = useMemo<ValorObjetos>(
    () => ({
      objetos,
      cargando,
      catalogo,
      resolver(ref) {
        const a = catalogo.resolver(ref);
        if (!a) return null;
        const hoja = graficos.hoja(a.hojaId);
        const animacion = hoja?.animacion(a.animacionId);
        return hoja && animacion ? { hoja, animacion } : null;
      },
      actualizar(o) {
        poner(o);
        const prev = pendientes.current.get(o.clave);
        if (prev) clearTimeout(prev.timer);
        pendientes.current.set(o.clave, {
          o,
          timer: setTimeout(() => {
            pendientes.current.delete(o.clave);
            void intentar(() => c.guardar.ejecutar(o));
          }, 400),
        });
      },
      async crear() {
        await guardarTodo();
        const o = await intentar(() => c.crear.ejecutar());
        if (o) poner(o);
        return o;
      },
      async duplicar(o) {
        await guardarTodo();
        const d = await intentar(() => c.duplicar.ejecutar(o));
        if (d) poner(d);
        return d;
      },
      async eliminar(clave) {
        const p = pendientes.current.get(clave);
        if (p) clearTimeout(p.timer);
        pendientes.current.delete(clave);
        const ok = await intentar(async () => (await c.eliminar.ejecutar(clave), true));
        if (ok) setObjetos((xs) => xs.filter((x) => x.clave !== clave));
        return !!ok;
      },
      async importar(texto) {
        await guardarTodo();
        const r = await intentar(() => c.importar.ejecutar(texto, catalogo));
        if (r) await recargar();
        return r;
      },
      async exportar() {
        await guardarTodo();
        return intentar(() => c.exportar.ejecutar(catalogo));
      },
      recargar,
    }),
    [objetos, cargando, catalogo, graficos, c, intentar, poner, guardarTodo, recargar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useObjetos(): ValorObjetos {
  const v = useContext(Contexto);
  if (!v) throw new Error("useObjetos necesita <ProveedorDeObjetos>.");
  return v;
}
