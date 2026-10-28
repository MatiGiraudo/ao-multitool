"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import type { ReferenciaGrafica } from "@/compartido/dominio/ReferenciaGrafica";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import { useColeccionEditable, type EstadoGuardado } from "@/compartido/ui/useColeccionEditable";
import { useGraficos, type GraficoResuelto } from "@/graficos/ui/ProveedorDeGraficos";
import type { Objeto } from "../dominio/Objeto";

/*
 * Estado de Objetos en la interfaz. La edición optimista con guardado diferido la aporta
 * `useColeccionEditable`; acá quedan sólo las operaciones propias de objetos.
 *
 * Nota de arquitectura: la INTERFAZ de Objetos sí usa la interfaz de Gráficos (para dibujar),
 * pero el DOMINIO de Objetos no conoce a Gráficos: sólo ve el CatalogoGrafico.
 */

interface ValorObjetos {
  objetos: readonly Objeto[];
  cargando: boolean;
  estadoGuardado: EstadoGuardado;
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
  const c = casos.objetos;

  // El catálogo y la traducción de referencias los arma Gráficos: acá sólo se usan.
  const { catalogo, resolver } = useGraficos();

  const coleccion = useColeccionEditable<Objeto>({
    claveDe: (o) => o.clave,
    listar: () => c.listar.ejecutar(),
    guardar: (o) => c.guardar.ejecutar(o),
    recordarComo: "objetos",
  });
  const { items, cargando, estadoGuardado, actualizar, poner, quitar, cancelarPendiente, guardarPendientes, recargar } = coleccion;

  const valor = useMemo<ValorObjetos>(
    () => ({
      objetos: items,
      cargando,
      estadoGuardado,
      catalogo,
      resolver,
      actualizar,
      recargar,
      async crear() {
        await guardarPendientes();
        const o = await intentar(() => c.crear.ejecutar(), "Creando…");
        if (o) poner(o);
        return o;
      },
      async duplicar(o) {
        await guardarPendientes();
        const d = await intentar(() => c.duplicar.ejecutar(o), "Duplicando…");
        if (d) poner(d);
        return d;
      },
      async eliminar(clave) {
        cancelarPendiente(clave);
        const ok = await intentar(async () => (await c.eliminar.ejecutar(clave), true), "Borrando…");
        if (ok) quitar(clave);
        return !!ok;
      },
      async importar(texto) {
        await guardarPendientes();
        const r = await intentar(() => c.importar.ejecutar(texto, catalogo), "Importando…");
        if (r) await recargar();
        return r;
      },
      async exportar() {
        await guardarPendientes();
        return intentar(() => c.exportar.ejecutar(catalogo));
      },
    }),
    [items, cargando, estadoGuardado, catalogo, resolver, actualizar, poner, quitar, cancelarPendiente, guardarPendientes, recargar, c, intentar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useObjetos(): ValorObjetos {
  const v = useContext(Contexto);
  if (!v) throw new Error("useObjetos necesita <ProveedorDeObjetos>.");
  return v;
}
