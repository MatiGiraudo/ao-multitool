"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { CATALOGO_VACIO } from "@/compartido/dominio/CatalogoPorNumero";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import { useColeccionEditable, type EstadoGuardado } from "@/compartido/ui/useColeccionEditable";
import type { ResultadoDeImportacionDeNpcs } from "../aplicacion/casosDeUso";
import type { Npc } from "../dominio/Npc";
import type { CatalogosDelNpc } from "../dominio/servicios";

/*
 * Estado de NPCs en la interfaz.
 *
 * Los cuatro catálogos que necesita —cuerpos, cabezas, objetos y hechizos— llegan de afuera, como
 * propiedad: la página es la que junta los módulos (ver `app/npcs/PantallaNpcs.tsx`). Así este
 * módulo no importa a ninguno de los otros ni en la interfaz.
 */

const CATALOGOS_VACIOS: CatalogosDelNpc = {
  cuerpos: CATALOGO_VACIO,
  cabezas: CATALOGO_VACIO,
  objetos: CATALOGO_VACIO,
  hechizos: CATALOGO_VACIO,
};

interface ValorNpcs {
  npcs: readonly Npc[];
  cargando: boolean;
  estadoGuardado: EstadoGuardado;
  catalogos: CatalogosDelNpc;
  actualizar(n: Npc): void;
  crear(): Promise<Npc | undefined>;
  duplicar(n: Npc): Promise<Npc | undefined>;
  eliminar(clave: string): Promise<boolean>;
  importar(texto: string): Promise<ResultadoDeImportacionDeNpcs | undefined>;
  exportar(): Promise<{ nombreArchivo: string; contenido: string } | undefined>;
  recargar(): Promise<void>;
}

const Contexto = createContext<ValorNpcs | null>(null);

export function ProveedorDeNpcs({ children, catalogos = CATALOGOS_VACIOS }: { children: ReactNode; catalogos?: CatalogosDelNpc }) {
  const { casos, intentar } = useAplicacion();
  const c = casos.npcs;
  const { items, cargando, estadoGuardado, actualizar, poner, quitar, cancelarPendiente, guardarPendientes, recargar } = useColeccionEditable<Npc>({
    claveDe: (n) => n.clave,
    listar: () => c.listar.ejecutar(),
    guardar: (n) => c.guardar.ejecutar(n),
  });

  const valor = useMemo<ValorNpcs>(
    () => ({
      npcs: items,
      cargando,
      estadoGuardado,
      catalogos,
      actualizar,
      recargar,
      async crear() {
        await guardarPendientes();
        const n = await intentar(() => c.crear.ejecutar());
        if (n) poner(n);
        return n;
      },
      async duplicar(n) {
        await guardarPendientes();
        const d = await intentar(() => c.duplicar.ejecutar(n));
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
    [items, cargando, estadoGuardado, catalogos, actualizar, poner, quitar, cancelarPendiente, guardarPendientes, recargar, c, intentar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useNpcs(): ValorNpcs {
  const v = useContext(Contexto);
  if (!v) throw new Error("useNpcs necesita <ProveedorDeNpcs>.");
  return v;
}
