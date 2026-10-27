"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import type { ReferenciaGrafica } from "@/compartido/dominio/ReferenciaGrafica";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import { useColeccionEditable, type EstadoGuardado } from "@/compartido/ui/useColeccionEditable";
import type { CalidadDeEscalado } from "../aplicacion/puertos";
import type { Animacion } from "../dominio/Animacion";
import type { HojaDeSprites } from "../dominio/HojaDeSprites";
import type { Tamanio } from "../dominio/Tamanio";

/*
 * Estado de Gráficos para toda la app (lo usan la pestaña Animaciones y todas las que vinculan gráficos).
 *
 * La edición optimista con guardado diferido la aporta `useColeccionEditable`: el cambio se ve al
 * instante y se guarda 400 ms después del último. Acá quedan sólo las operaciones propias de las
 * hojas (imágenes, redimensionar, importar) y el catálogo.
 *
 * Este es además el único lugar que arma el `CatalogoGrafico`: el puerto compartido con el que los
 * demás módulos (objetos, y más adelante apariencias, FX, NPCs) miran los gráficos sin conocer a
 * este módulo.
 */

/** Una referencia ya traducida a las piezas reales, listas para dibujar. */
export interface GraficoResuelto {
  hoja: HojaDeSprites;
  animacion: Animacion;
}

interface ValorGraficos {
  hojas: readonly HojaDeSprites[];
  cargando: boolean;
  estadoGuardado: EstadoGuardado;
  /** El catálogo de animaciones en los términos del puerto compartido. */
  catalogo: CatalogoGrafico;
  /** De una referencia gráfica a la hoja y la animación reales, para dibujarlas. */
  resolver(ref: ReferenciaGrafica | null | undefined): GraficoResuelto | null;
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

  const coleccion = useColeccionEditable<HojaDeSprites>({
    claveDe: (h) => h.id,
    listar: () => g.listar.ejecutar(),
    guardar: (h) => g.guardar.ejecutar(h),
  });
  const { items: hojas, cargando, estadoGuardado, actualizar, poner, quitar, cancelarPendiente, guardarPendientes, recargar } = coleccion;

  const catalogo = useMemo(() => casos.crearCatalogo(hojas), [casos, hojas]);

  const valor = useMemo<ValorGraficos>(
    () => ({
      hojas,
      cargando,
      estadoGuardado,
      catalogo,
      resolver(ref) {
        const a = catalogo.resolver(ref);
        if (!a) return null;
        const hoja = hojas.find((h) => h.id === a.hojaId);
        const animacion = hoja?.animacion(a.animacionId);
        return hoja && animacion ? { hoja, animacion } : null;
      },
      hoja: (id) => hojas.find((h) => h.id === id),
      actualizar,
      recargar,
      urlImagen: (h) => (h && h.tieneImagen ? casos.ubicadorDeImagenes.urlDe(h.id, h.versionImagen) : null),
      async crearDesdeImagen(archivo) {
        const h = await intentar(() => g.crearDesdeImagen.ejecutar({ archivo, nombreArchivo: archivo.name }), "Cargando la imagen…");
        if (h) poner(h);
        return h;
      },
      async reemplazarImagen(hojaId, archivo) {
        await guardarPendientes(hojaId);
        const h = await intentar(() => g.reemplazarImagen.ejecutar({ hojaId, archivo, nombreArchivo: archivo.name }), "Reemplazando la imagen…");
        if (h) poner(h);
        return h;
      },
      async eliminar(hojaId) {
        cancelarPendiente(hojaId);
        const ok = await intentar(async () => (await g.eliminar.ejecutar(hojaId), true), "Borrando la hoja…");
        if (ok) quitar(hojaId);
        return !!ok;
      },
      async redimensionar(hojaId, tamanio, calidad, escalarContenido) {
        await guardarPendientes(hojaId);
        const h = await intentar(() => g.redimensionar.ejecutar({ hojaId, tamanio, calidad, escalarContenido }), "Redimensionando…");
        if (h) poner(h);
        return h;
      },
      async restaurarOriginal(hojaId, escalarContenido) {
        await guardarPendientes(hojaId);
        const h = await intentar(() => g.restaurarOriginal.ejecutar({ hojaId, escalarContenido }), "Restaurando el original…");
        if (h) poner(h);
        return h;
      },
      async importar(texto) {
        await guardarPendientes();
        const r = await intentar(() => g.importar.ejecutar(texto), "Importando la hoja…");
        if (r) poner(r.hoja);
        return r;
      },
    }),
    [hojas, cargando, estadoGuardado, catalogo, actualizar, poner, quitar, cancelarPendiente, guardarPendientes, recargar, casos, g, intentar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useGraficos(): ValorGraficos {
  const v = useContext(Contexto);
  if (!v) throw new Error("useGraficos necesita <ProveedorDeGraficos>.");
  return v;
}
