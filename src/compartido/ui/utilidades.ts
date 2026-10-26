"use client";
import { useEffect, useState } from "react";

/** Carga una imagen y la devuelve lista para dibujar en canvas (o null mientras carga / si falla). */
const cache = new Map<string, Promise<HTMLImageElement>>();
export function useImagen(url: string | null): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let vivo = true;
    if (!url) {
      setImg(null);
      return;
    }
    let p = cache.get(url);
    if (!p) {
      p = new Promise((ok, mal) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = mal;
        i.src = url;
      });
      cache.set(url, p);
      p.catch(() => cache.delete(url));
    }
    p.then((i) => vivo && setImg(i)).catch(() => vivo && setImg(null));
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
