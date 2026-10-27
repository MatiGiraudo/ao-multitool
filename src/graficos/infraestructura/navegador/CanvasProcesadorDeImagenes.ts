import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import { Tamanio } from "../../dominio/Tamanio";
import type { CalidadDeEscalado, ImagenDecodificada, ProcesadorDeImagenes } from "../../aplicacion/puertos";

/** Procesa imágenes con el canvas del navegador. */
export class CanvasProcesadorDeImagenes implements ProcesadorDeImagenes {
  async decodificar(archivo: Blob): Promise<ImagenDecodificada> {
    const img = await cargar(archivo);
    const tamanio = Tamanio.crear(img.width, img.height);
    // Si ya es PNG no hay nada que convertir: pasarlo por el canvas sólo lo volvería a comprimir, y en
    // un lote de miles de imágenes eso es la mitad del trabajo.
    if (archivo.type === "image/png") return { png: archivo, tamanio };
    const c = lienzo(img.width, img.height);
    c.getContext("2d")!.drawImage(img, 0, 0);
    return { png: await aPng(c), tamanio };
  }

  async redimensionar(png: Blob, t: Tamanio, calidad: CalidadDeEscalado): Promise<Blob> {
    const img = await cargar(png);
    const suave = calidad === "suave";
    let actual: CanvasImageSource = img,
      w = img.width,
      h = img.height;
    // Suavizado: reducimos a la mitad por pasos; de una sola pasada quedan bordes serruchados.
    if (suave) {
      while (w / 2 >= t.ancho && h / 2 >= t.alto) {
        const c = lienzo(Math.round(w / 2), Math.round(h / 2));
        const x = c.getContext("2d")!;
        x.imageSmoothingEnabled = true;
        x.imageSmoothingQuality = "high";
        x.drawImage(actual, 0, 0, c.width, c.height);
        actual = c;
        w = c.width;
        h = c.height;
      }
    }
    const out = lienzo(t.ancho, t.alto);
    const x = out.getContext("2d")!;
    x.imageSmoothingEnabled = suave;
    if (suave) x.imageSmoothingQuality = "high";
    x.drawImage(actual, 0, 0, t.ancho, t.alto);
    return aPng(out);
  }
}

function lienzo(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function cargar(b: Blob): Promise<HTMLImageElement> {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(b);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      ok(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      mal(new ErrorDeDominio("No se pudo leer la imagen. Probá con PNG o BMP."));
    };
    img.src = url;
  });
}

function aPng(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo generar el PNG."))), "image/png"));
}
