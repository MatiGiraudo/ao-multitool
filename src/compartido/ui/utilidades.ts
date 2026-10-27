"use client";
import { useEffect, useState } from "react";

/**
 * Carga una imagen y la devuelve lista para dibujar en canvas (o null mientras carga / si falla).
 *
 * Al cambiar de url devuelve null hasta que llegue la nueva, en vez de seguir con la anterior: el
 * que dibuja necesita distinguir «todavía no llegó» de «es esta», o pinta la hoja vieja como si
 * fuera la nueva. Las que ya están se devuelven en el primer render (`listas`), así cambiar entre
 * hojas vistas no parpadea.
 */
const pedidos = new Map<string, Promise<HTMLImageElement>>();
const listas = new Map<string, HTMLImageElement>();
export function useImagen(url: string | null): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(() => (url ? (listas.get(url) ?? null) : null));
  useEffect(() => {
    let vivo = true;
    const ya = url ? (listas.get(url) ?? null) : null;
    setImg(ya);
    if (!url || ya) return;
    let p = pedidos.get(url);
    if (!p) {
      p = new Promise((ok, mal) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = mal;
        i.src = url;
      });
      pedidos.set(url, p);
      p.catch(() => pedidos.delete(url));
    }
    p.then((i) => {
      listas.set(url, i);
      if (vivo) setImg(i);
    }).catch(() => vivo && setImg(null));
    return () => {
      vivo = false;
    };
  }, [url]);
  return img;
}

/** En la app local sí podemos descargar con un enlace normal. */
export function descargar(nombre: string, contenido: string | Blob, tipo = "application/json") {
  const blob = typeof contenido === "string" ? new Blob([contenido], { type: tipo }) : contenido;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

/** Lee el valor de un color definido en el CSS (para dibujar en canvas con los mismos colores del tema). */
export function colorCss(nombre: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}

export function usePrefiereMenosMovimiento(): boolean {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const f = () => setR(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return r;
}

/** Corre `fn` en cada frame de animación del navegador, con el tiempo transcurrido. */
export function useCadaFrame(fn: (dtMs: number) => void, activo = true) {
  useEffect(() => {
    if (!activo) return;
    let id = 0,
      ultimo = performance.now();
    const paso = (t: number) => {
      fn(t - ultimo);
      ultimo = t;
      id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [fn, activo]);
}
