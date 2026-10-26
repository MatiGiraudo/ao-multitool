"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import type { ReferenciaGrafica } from "@/compartido/dominio/ReferenciaGrafica";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import { useColeccionEditable, type EstadoGuardado } from "@/compartido/ui/useColeccionEditable";
import { useGraficos, type GraficoResuelto } from "@/graficos/ui/ProveedorDeGraficos";
import type { ResultadoDeImportacionDeApariencias } from "../aplicacion/casosDeUso";
import type { Apariencia } from "../dominio/Apariencia";
import type { Cabeza } from "../dominio/Cabeza";
import type { Cuerpo } from "../dominio/Cuerpo";

/*
 * Estado del módulo en la interfaz: dos colecciones, cuerpos y cabezas, con el mismo
 * comportamiento. Igual que los casos de uso, se escribe una vez y se usa dos.
 */

export interface ColeccionDeApariencias<T extends Apariencia> {
  items: readonly T[];
  cargando: boolean;
  estadoGuardado: EstadoGuardado;
  actualizar(item: T): void;
  crear(): Promise<T | undefined>;
  duplicar(item: T): Promise<T | undefined>;
  eliminar(clave: string): Promise<boolean>;
  importar(texto: string): Promise<ResultadoDeImportacionDeApariencias | undefined>;
  exportar(): Promise<{ nombreArchivo: string; contenido: string } | undefined>;
}

/** Lo que el contenedor expone para cada especie. Se declara por forma, no por clase. */
interface CasosDeEspecie<T extends Apariencia> {
  listar: { ejecutar(): Promise<T[]> };
  crear: { ejecutar(): Promise<T> };
  guardar: { ejecutar(item: T): Promise<void> };
  duplicar: { ejecutar(item: T): Promise<T> };
  eliminar: { ejecutar(clave: string): Promise<void> };
  exportar: { ejecutar(catalogo: CatalogoGrafico): Promise<{ nombreArchivo: string; contenido: string }> };
  importar: { ejecutar(texto: string, catalogo: CatalogoGrafico): Promise<ResultadoDeImportacionDeApariencias> };
}

interface ValorApariencias {
  cuerpos: ColeccionDeApariencias<Cuerpo>;
  cabezas: ColeccionDeApariencias<Cabeza>;
  catalogo: CatalogoGrafico;
  resolver(ref: ReferenciaGrafica | null | undefined): GraficoResuelto | null;
}

const Contexto = createContext<ValorApariencias | null>(null);

function useEspecie<T extends Apariencia>(casos: CasosDeEspecie<T>, catalogo: CatalogoGrafico): ColeccionDeApariencias<T> {
  const { intentar } = useAplicacion();
  const { items, cargando, estadoGuardado, actualizar, poner, quitar, cancelarPendiente, guardarPendientes, recargar } = useColeccionEditable<T>({
    claveDe: (x) => x.clave,
    listar: () => casos.listar.ejecutar(),
    guardar: (x) => casos.guardar.ejecutar(x),
  });

  return useMemo(
    () => ({
      items,
      cargando,
      estadoGuardado,
      actualizar,
      async crear() {
        await guardarPendientes();
        const x = await intentar(() => casos.crear.ejecutar());
        if (x) poner(x);
        return x;
      },
      async duplicar(item) {
        await guardarPendientes();
        const x = await intentar(() => casos.duplicar.ejecutar(item));
        if (x) poner(x);
        return x;
      },
      async eliminar(clave) {
        cancelarPendiente(clave);
        const ok = await intentar(async () => (await casos.eliminar.ejecutar(clave), true));
        if (ok) quitar(clave);
        return !!ok;
      },
      async importar(texto) {
        await guardarPendientes();
        const r = await intentar(() => casos.importar.ejecutar(texto, catalogo));
        if (r) await recargar();
        return r;
      },
      async exportar() {
        await guardarPendientes();
        return intentar(() => casos.exportar.ejecutar(catalogo));
      },
    }),
    [items, cargando, estadoGuardado, actualizar, poner, quitar, cancelarPendiente, guardarPendientes, recargar, casos, catalogo, intentar],
  );
}

export function ProveedorDeApariencias({ children }: { children: ReactNode }) {
  const { casos } = useAplicacion();
  const { catalogo, resolver } = useGraficos();
  const cuerpos = useEspecie<Cuerpo>(casos.cuerpos, catalogo);
  const cabezas = useEspecie<Cabeza>(casos.cabezas, catalogo);

  const valor = useMemo<ValorApariencias>(() => ({ cuerpos, cabezas, catalogo, resolver }), [cuerpos, cabezas, catalogo, resolver]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useApariencias(): ValorApariencias {
  const v = useContext(Contexto);
  if (!v) throw new Error("useApariencias necesita <ProveedorDeApariencias>.");
  return v;
}
