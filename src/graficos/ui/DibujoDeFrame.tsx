"use client";
import { useEffect, useRef } from "react";
import type { ImagenDibujable } from "@/compartido/ui/negroTransparente";
import type { Frame } from "../dominio/Frame";

/** Dibuja un frame de una imagen, centrado y escalado para entrar en `tamanio` px. Escala entera si se agranda. */
export function dibujarFrameAjustado(ctx: CanvasRenderingContext2D, img: CanvasImageSource | null, frame: Frame | undefined, maxEscala?: number) {
  const c = ctx.canvas;
  ctx.clearRect(0, 0, c.width, c.height);
  if (!img || !frame) return;
  const r = frame.rect;
  let k = Math.min(c.width / r.ancho, c.height / r.alto);
  if (k >= 1) k = Math.floor(k);
  if (maxEscala) k = Math.min(k, maxEscala);
  ctx.imageSmoothingEnabled = k < 1;
  const w = r.ancho * k,
    h = r.alto * k;
  ctx.drawImage(img, r.x, r.y, r.ancho, r.alto, Math.round((c.width - w) / 2), Math.round((c.height - h) / 2), w, h);
}

/** Miniatura de un frame como componente. */
export function DibujoDeFrame(props: { img: ImagenDibujable | null; frame: Frame | undefined; tamanio: number; maxEscala?: number; className?: string; title?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { img, frame, maxEscala } = props;
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) dibujarFrameAjustado(ctx, img, frame, maxEscala);
  }, [img, frame, maxEscala]);
  return <canvas ref={ref} width={props.tamanio} height={props.tamanio} className={props.className ?? "checker"} title={props.title} />;
}
