"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import type { ReferenciaGrafica } from "@/compartido/dominio/ReferenciaGrafica";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import { useColeccionEditable, type EstadoGuardado } from "@/compartido/ui/useColeccionEditable";
import { useGraficos, type GraficoResuelto } from "@/graficos/ui/ProveedorDeGraficos";
import type { ResultadoDeImportacionDeEfectos } from "../aplicacion/casosDeUso";
import type { Efecto } from "../dominio/Efecto";

/*
 * Estado de FX en la interfaz. Es el mismo molde que Objetos: el guardado diferido lo pone
 * `useColeccionEditable` y los gráficos los resuelve el proveedor de Gráficos.
 */

interface ValorEfectos {
  efectos: readonly Efecto[];
  cargando: boolean;
  estadoGuardado: EstadoGuardado;
  catalogo: CatalogoGrafico;
  resolver(ref: ReferenciaGrafica | null | undefined): GraficoResuelto | null;
  actualizar(e: Efecto): void;
  crear(): Promise<Efecto | undefined>;
  duplicar(e: Efecto): Promise<Efecto | undefined>;
  eliminar(clave: string): Promise<boolean>;
  importar(texto: string): Promise<ResultadoDeImportacionDeEfectos | undefined>;
  exportar(): Promise<{ nombreArchivo: string; contenido: string } | undefined>;
  recargar(): Promise<void>;
}

const Contexto = createContext<ValorEfectos | null>(null);

export function ProveedorDeEfectos({ children }: { children: ReactNode }) {
  const { casos, intentar } = useAplicacion();
  const c = casos.fx;
  const { catalogo, resolver } = useGraficos();

  const coleccion = useColeccionEditable<Efecto>({
    claveDe: (e) => e.clave,
    listar: () => c.listar.ejecutar(),
    guardar: (e) => c.guardar.ejecutar(e),
  });
  const { items, cargando, estadoGuardado, actualizar, poner, quitar, cancelarPendiente, guardarPendientes, recargar } = coleccion;

  const valor = useMemo<ValorEfectos>(
    () => ({
      efectos: items,
      cargando,
      estadoGuardado,
      catalogo,
      resolver,
      actualizar,
      recargar,
      async crear() {
        await guardarPendientes();
        const e = await intentar(() => c.crear.ejecutar(), "Creando…");
        if (e) poner(e);
        return e;
      },
      async duplicar(e) {
        await guardarPendientes();
        const d = await intentar(() => c.duplicar.ejecutar(e), "Duplicando…");
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

export function useEfectos(): ValorEfectos {
  const v = useContext(Contexto);
  if (!v) throw new Error("useEfectos necesita <ProveedorDeEfectos>.");
  return v;
}
