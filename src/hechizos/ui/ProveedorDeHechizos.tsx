"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { CATALOGO_VACIO, type CatalogoPorNumero } from "@/compartido/dominio/CatalogoPorNumero";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import { useColeccionEditable, type EstadoGuardado } from "@/compartido/ui/useColeccionEditable";
import type { ResultadoDeImportacionDeHechizos } from "../aplicacion/casosDeUso";
import type { Hechizo } from "../dominio/Hechizo";

/*
 * Estado de Hechizos en la interfaz.
 *
 * El catálogo de FX llega de afuera, como propiedad: la página es la que junta los dos módulos
 * (ver `app/hechizos/PantallaHechizos.tsx`). Así este módulo no importa a FX ni en la interfaz.
 */

interface ValorHechizos {
  hechizos: readonly Hechizo[];
  cargando: boolean;
  estadoGuardado: EstadoGuardado;
  /** Para validar y para elegir el FX de un hechizo. Vacío si FX no está montado. */
  fx: CatalogoPorNumero;
  actualizar(h: Hechizo): void;
  crear(): Promise<Hechizo | undefined>;
  duplicar(h: Hechizo): Promise<Hechizo | undefined>;
  eliminar(clave: string): Promise<boolean>;
  importar(texto: string): Promise<ResultadoDeImportacionDeHechizos | undefined>;
  exportar(): Promise<{ nombreArchivo: string; contenido: string } | undefined>;
  recargar(): Promise<void>;
}

const Contexto = createContext<ValorHechizos | null>(null);

export function ProveedorDeHechizos({ children, fx = CATALOGO_VACIO }: { children: ReactNode; fx?: CatalogoPorNumero }) {
  const { casos, intentar } = useAplicacion();
  const c = casos.hechizos;
  const { items, cargando, estadoGuardado, actualizar, poner, quitar, cancelarPendiente, guardarPendientes, recargar } = useColeccionEditable<Hechizo>({
    claveDe: (h) => h.clave,
    listar: () => c.listar.ejecutar(),
    guardar: (h) => c.guardar.ejecutar(h),
  });

  const valor = useMemo<ValorHechizos>(
    () => ({
      hechizos: items,
      cargando,
      estadoGuardado,
      fx,
      actualizar,
      recargar,
      async crear() {
        await guardarPendientes();
        const h = await intentar(() => c.crear.ejecutar());
        if (h) poner(h);
        return h;
      },
      async duplicar(h) {
        await guardarPendientes();
        const d = await intentar(() => c.duplicar.ejecutar(h));
        if (d) poner(d);
        return d;
      },
      async eliminar(clave) {
        cancelarPendiente(clave);
        const ok = await intentar(async () => (await c.eliminar.ejecutar(clave), true));
        if (ok) quitar(clave);
        return !!ok;
      },
      async importar(texto) {
        await guardarPendientes();
        const r = await intentar(() => c.importar.ejecutar(texto));
        if (r) await recargar();
        return r;
      },
      async exportar() {
        await guardarPendientes();
        return intentar(() => c.exportar.ejecutar());
      },
    }),
    [items, cargando, estadoGuardado, fx, actualizar, poner, quitar, cancelarPendiente, guardarPendientes, recargar, c, intentar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useHechizos(): ValorHechizos {
  const v = useContext(Contexto);
  if (!v) throw new Error("useHechizos necesita <ProveedorDeHechizos>.");
  return v;
}
