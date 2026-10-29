"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Cargando } from "@/compartido/ui/componentes";
import type { ImagenDibujable } from "@/compartido/ui/negroTransparente";
import { colorCss } from "@/compartido/ui/utilidades";
import type { Animacion } from "../dominio/Animacion";
import { Frame } from "../dominio/Frame";
import type { Celda } from "../dominio/Grilla";
import type { HojaDeSprites } from "../dominio/HojaDeSprites";
import { Rect } from "../dominio/Rect";

export type ModoDeLienzo = "grilla" | "recuadro" | "mover";

interface Props {
  hoja: HojaDeSprites;
  img: ImagenDibujable | null;
  animacion: Animacion | undefined;
  seleccion: ReadonlySet<number>;
  modo: ModoDeLienzo;
  zoom: number;
  mostrarGrilla: boolean;
  ajustarAGrilla: boolean;
  onAgregarFrames(frames: Frame[]): void;
  onSeleccion(seleccion: Set<number>, ultimo: number): void;
  onDesplazar(indices: number[], dx: number, dy: number, sinAjuste: boolean): void;
  onEstado(e: { posicion?: string; detalle?: string }): void;
  /** Un escalón de zoom; devuelve el que quedó (el mismo si ya estaba en el tope). */
  onZoom(direccion: 1 | -1): number;
  onSoltarArchivo(f: File): void;
}

type Arrastre =
  | { tipo: "crear"; x0: number; y0: number; x1: number; y1: number; movido: boolean }
  | { tipo: "seleccionar"; x0: number; y0: number; x1: number; y1: number; movido: boolean; base: Set<number> }
  | { tipo: "mover"; x0: number; y0: number; dx: number; dy: number; movido: boolean; indice: number; conModificador: boolean; yaSeleccionado: boolean };

/**
 * El lienzo donde se marcan los frames sobre la hoja.
 * No modifica la hoja: avisa al padre lo que el usuario quiere hacer (agregar, seleccionar, desplazar)
 * y el padre aplica el cambio con los métodos del dominio.
 */
export function LienzoDeHoja(p: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const foco = useRef<{ ix: number; iy: number; cx: number; cy: number } | null>(null);
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  const [hover, setHover] = useState<Celda | null>(null);
  const [soltando, setSoltando] = useState(false);
  const ultimaCelda = useRef<Celda | null>(null);
  const t = p.hoja.tamanio;

  useEffect(() => {
    ultimaCelda.current = null;
  }, [p.hoja.id, p.animacion?.id]);

  // ---------- dibujo ----------
  const dibujar = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    if (!t || !p.img) {
      c.width = c.height = 0;
      return;
    }
    const z = p.zoom;
    c.width = Math.max(1, Math.round(t.ancho * z));
    c.height = Math.max(1, Math.round(t.alto * z));
    ctx.imageSmoothingEnabled = z < 1;
    ctx.drawImage(p.img, 0, 0, c.width, c.height);

    const caja = (r: Rect, color: string, grosor: number, guiones?: number[], relleno?: string) => {
      ctx.save();
      ctx.lineWidth = grosor;
      ctx.strokeStyle = color;
      if (guiones) ctx.setLineDash(guiones);
      if (relleno) {
        ctx.fillStyle = relleno;
        ctx.fillRect(r.x * z, r.y * z, r.ancho * z, r.alto * z);
      }
      ctx.strokeRect(r.x * z + grosor / 2, r.y * z + grosor / 2, r.ancho * z - grosor, r.alto * z - grosor);
      ctx.restore();
    };

    const colGrilla = colorCss("--grilla"),
      colOtra = colorCss("--otra"),
      colAcento = colorCss("--acento"),
      colSel = colorCss("--sel"),
      colTinta = colorCss("--acento-tinta");

    if (p.modo !== "recuadro" && p.mostrarGrilla) {
      ctx.save();
      ctx.strokeStyle = colGrilla;
      ctx.lineWidth = 1;
      for (const celda of p.hoja.grilla.todasLasCeldas(t)) {
        const r = celda.rect;
        ctx.strokeRect(r.x * z + 0.5, r.y * z + 0.5, r.ancho * z - 1, r.alto * z - 1);
      }
      ctx.restore();
    }

    for (const a of p.hoja.animaciones) if (a.id !== p.animacion?.id) for (const f of a.frames) caja(f.rect, colOtra, 1, [3, 3]);

    if (p.animacion) {
      const desplazamiento = arrastre?.tipo === "mover" ? arrastre : null;
      const repetidos = new Map<string, number>();
      p.animacion.frames.forEach((f, i) => {
        const sel = p.seleccion.has(i);
        const r = desplazamiento && sel ? f.rect.desplazado(desplazamiento.dx, desplazamiento.dy) : f.rect;
        caja(r, sel ? colSel : colAcento, sel ? 3 : 2, undefined, sel ? "rgba(43,111,214,.15)" : undefined);
        const clave = `${r.x},${r.y}`,
          k = (repetidos.get(clave) ?? 0) + 1;
        repetidos.set(clave, k);
        const etiqueta = String(i + 1),
          fs = Math.max(10, Math.min(14, z * 4));
        ctx.font = `600 ${fs}px "JetBrains Mono", ui-monospace, monospace`;
        const tw = ctx.measureText(etiqueta).width + 6,
          lx = r.x * z + 2 + (k - 1) * (tw + 2),
          ly = r.y * z + 2;
        ctx.fillStyle = sel ? colSel : colAcento;
        ctx.fillRect(lx, ly, tw, fs + 4);
        ctx.fillStyle = sel ? "#fff" : colTinta;
        ctx.textBaseline = "top";
        ctx.fillText(etiqueta, lx + 3, ly + 2);
      });
    }

    if (hover && p.modo === "grilla" && !arrastre) caja(hover.rect, colSel, 2, [4, 3]);
    if (arrastre && arrastre.tipo !== "mover" && arrastre.movido) {
      caja(Rect.entrePuntos(arrastre.x0, arrastre.y0, arrastre.x1, arrastre.y1), colSel, 2, [4, 3], "rgba(43,111,214,.12)");
    }
  }, [p.hoja, p.img, p.animacion, p.seleccion, p.modo, p.zoom, p.mostrarGrilla, t, arrastre, hover]);

  useEffect(() => {
    dibujar();
  }, [dibujar]);

  // Redibujar si cambia el tema (los colores salen del CSS).
  useEffect(() => {
    const m = matchMedia("(prefers-color-scheme: dark)");
    const obs = new MutationObserver(dibujar);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    m.addEventListener("change", dibujar);
    return () => {
      obs.disconnect();
      m.removeEventListener("change", dibujar);
    };
  }, [dibujar]);

  // ---------- interacción ----------
  const punto = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(t!.ancho, Math.floor((e.clientX - r.left) / p.zoom))),
      y: Math.max(0, Math.min(t!.alto, Math.floor((e.clientY - r.top) / p.zoom))),
    };
  };

  const frameBajo = (x: number, y: number): number => {
    const fr = p.animacion?.frames ?? [];
    for (let i = fr.length - 1; i >= 0; i--) if (fr[i]!.rect.contiene(x, y)) return i;
    return -1;
  };

  const desplazamientoPermitido = (dx: number, dy: number, sinAjuste: boolean) => {
    if (!p.animacion || !t) return { dx: 0, dy: 0 };
    const g = p.hoja.grilla;
    const ajustar = p.ajustarAGrilla && !sinAjuste;
    const d = ajustar ? g.ajustarDesplazamiento(dx, dy) : { dx, dy };
    const r = p.animacion.conFramesDesplazados(p.seleccion, d.dx, d.dy, t, ajustar ? { x: g.pasoX, y: g.pasoY } : undefined);
    return { dx: r.dx, dy: r.dy };
  };

  // Sin animación elegida igual se marca: el padre crea una con el primer frame.
  const alBajar = (e: React.PointerEvent) => {
    if (!t || !p.img || e.button !== 0) return;
    const { x, y } = punto(e);
    if (p.modo === "grilla") {
      const celda = p.hoja.grilla.celdaEn(x, y, t);
      if (!celda) return;
      const celdas = e.shiftKey && ultimaCelda.current ? p.hoja.grilla.celdasEntre(ultimaCelda.current, celda, t) : [celda];
      ultimaCelda.current = celda;
      p.onAgregarFrames(celdas.map((c) => Frame.crear(c.rect)));
      return;
    }
    canvas.current!.setPointerCapture(e.pointerId);
    if (p.modo === "recuadro") {
      setArrastre({ tipo: "crear", x0: x, y0: y, x1: x, y1: y, movido: false });
      return;
    }
    const conModificador = e.ctrlKey || e.metaKey || e.shiftKey;
    const i = frameBajo(x, y);
    if (i >= 0) {
      const yaSeleccionado = p.seleccion.has(i);
      let sel = new Set(p.seleccion);
      if (conModificador) yaSeleccionado ? sel.delete(i) : sel.add(i);
      else if (!yaSeleccionado) sel = new Set([i]);
      p.onSeleccion(sel, i);
      if (sel.has(i)) setArrastre({ tipo: "mover", x0: x, y0: y, dx: 0, dy: 0, movido: false, indice: i, conModificador, yaSeleccionado });
    } else {
      const base = conModificador ? new Set(p.seleccion) : new Set<number>();
      if (!conModificador) p.onSeleccion(new Set(), -1);
      setArrastre({ tipo: "seleccionar", x0: x, y0: y, x1: x, y1: y, movido: false, base });
    }
  };

  const alMover = (e: React.PointerEvent) => {
    if (!t || !p.img) return;
    const { x, y } = punto(e);
    if (!arrastre) {
      p.onEstado({ posicion: `x ${x}  y ${y}` });
      if (p.modo === "grilla") {
        const c = p.hoja.grilla.celdaEn(x, y, t);
        setHover(c);
        p.onEstado({ posicion: `x ${x}  y ${y}`, detalle: c ? `celda ${c.columna},${c.fila}` : "" });
      } else if (p.modo === "mover" && canvas.current) canvas.current.style.cursor = frameBajo(x, y) >= 0 ? "move" : "default";
      return;
    }
    if (arrastre.tipo === "mover") {
      const movido = arrastre.movido || Math.abs(x - arrastre.x0) > 1 || Math.abs(y - arrastre.y0) > 1;
      const d = desplazamientoPermitido(x - arrastre.x0, y - arrastre.y0, e.altKey);
      setArrastre({ ...arrastre, ...d, movido });
      p.onEstado({ posicion: `x ${x}  y ${y}`, detalle: `Δ ${d.dx}, ${d.dy}` });
      return;
    }
    const movido = arrastre.movido || Math.abs(x - arrastre.x0) > 1 || Math.abs(y - arrastre.y0) > 1;
    const nuevo = { ...arrastre, x1: x, y1: y, movido };
    setArrastre(nuevo);
    if (nuevo.tipo === "seleccionar" && movido && p.animacion) {
      const r = Rect.entrePuntos(nuevo.x0, nuevo.y0, x, y);
      const sel = new Set(nuevo.base);
      p.animacion.frames.forEach((f, i) => f.rect.seCruzaCon(r) && sel.add(i));
      p.onSeleccion(sel, [...sel].pop() ?? -1);
    }
  };

  const alSoltar = (e: React.PointerEvent) => {
    const a = arrastre;
    setArrastre(null);
    if (!a) return;
    if (a.tipo === "crear") {
      if (a.movido) p.onAgregarFrames([Frame.crear(Rect.entrePuntos(a.x0, a.y0, a.x1, a.y1))]);
      else {
        const i = frameBajo(a.x0, a.y0);
        p.onSeleccion(i >= 0 ? new Set([i]) : new Set(), i);
      }
    } else if (a.tipo === "mover") {
      if (canvas.current) canvas.current.style.cursor = "move";
      p.onEstado({ detalle: "" });
      if (a.dx || a.dy) p.onDesplazar([...p.seleccion], a.dx, a.dy, e.altKey);
      else if (!a.conModificador && a.yaSeleccionado && p.seleccion.size > 1) p.onSeleccion(new Set([a.indice]), a.indice);
    }
  };

  /*
   * La rueda hace zoom sobre la hoja; con Shift sigue desplazando, que es para lo que sirven las
   * barras. Va como listener nativo y no como la prop onWheel de React, porque React la registra
   * como pasiva y ahí preventDefault no hace nada: la página se movería igual.
   */
  useEffect(() => {
    const d = caja.current;
    if (!d) return;
    const alRodar = (e: WheelEvent) => {
      if (e.shiftKey || e.deltaY === 0) return;
      e.preventDefault();
      const c = canvas.current;
      if (!c) return;
      const r = c.getBoundingClientRect();
      const ix = (e.clientX - r.left) / p.zoom,
        iy = (e.clientY - r.top) / p.zoom;
      if (p.onZoom(e.deltaY < 0 ? 1 : -1) !== p.zoom) foco.current = { ix, iy, cx: e.clientX, cy: e.clientY };
    };
    d.addEventListener("wheel", alRodar, { passive: false });
    return () => d.removeEventListener("wheel", alRodar);
  }, [p.zoom, p.onZoom]);

  // Al cambiar el zoom, el píxel que estaba bajo el cursor se queda bajo el cursor.
  useLayoutEffect(() => {
    const f = foco.current,
      d = caja.current;
    foco.current = null;
    if (!f || !d) return;
    const r = d.getBoundingClientRect();
    d.scrollLeft = f.ix * p.zoom - (f.cx - r.left - d.clientLeft);
    d.scrollTop = f.iy * p.zoom - (f.cy - r.top - d.clientTop);
  }, [p.zoom]);

  const cursor = p.modo === "mover" ? "default" : "crosshair";

  return (
    <div
      ref={caja}
      className={`lienzo checker${soltando ? " soltando" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setSoltando(true);
      }}
      onDragLeave={() => setSoltando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSoltando(false);
        const f = e.dataTransfer.files[0];
        if (f) p.onSoltarArchivo(f);
      }}
    >
      <canvas
        ref={canvas}
        style={{ cursor }}
        onPointerDown={alBajar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={() => setArrastre(null)}
        onPointerLeave={() => {
          if (!arrastre) {
            setHover(null);
            p.onEstado({ detalle: "" });
          }
        }}
      />
      {/* La hoja tiene imagen pero todavía no llegó: sin esto el lienzo queda en blanco y parece roto. */}
      {p.hoja.tieneImagen && !p.img && (
        <div className="sin-imagen">
          <Cargando>Cargando la imagen…</Cargando>
        </div>
      )}
      {!p.hoja.tieneImagen && (
        <div className="sin-imagen">
          Esta hoja todavía no tiene imagen.
          <br />
          Soltala acá o usá «Reemplazar imagen…».
        </div>
      )}
      {soltando && <div className="soltar">Soltá la imagen acá</div>}
    </div>
  );
}
