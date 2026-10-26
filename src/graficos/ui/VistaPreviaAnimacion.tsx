"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCadaFrame, usePrefiereMenosMovimiento } from "@/compartido/ui/utilidades";
import type { Animacion } from "../dominio/Animacion";
import { posicionEnCaja } from "../dominio/Ancla";

/** Reproduce la animación respetando ms por frame, duraciones propias, bucle y ancla. */
export function VistaPreviaAnimacion(p: {
  animacion: Animacion | undefined;
  img: HTMLImageElement | null;
  /** Si cambia, la vista salta a ese frame y se pausa (por ejemplo, al hacer clic en la lista). */
  irA: { indice: number; n: number } | null;
  onFrameActual(i: number): void;
}) {
  const menosMovimiento = usePrefiereMenosMovimiento();
  const [reproduciendo, setReproduciendo] = useState(true);
  const [escala, setEscala] = useState(3);
  const [indice, setIndice] = useState(0);
  const tiempo = useRef(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { animacion: a, img, onFrameActual } = p;

  useEffect(() => setReproduciendo(!menosMovimiento), [menosMovimiento]);
  useEffect(() => {
    tiempo.current = 0;
    setIndice(0);
  }, [a?.id]);
  useEffect(() => {
    if (!p.irA) return;
    setReproduciendo(false);
    setIndice(p.irA.indice);
  }, [p.irA]);

  const avanzar = useCallback(
    (dt: number) => {
      if (!a || !a.cantidadDeFrames) return;
      tiempo.current += dt;
      // En lugar de acumular índices, calculamos el frame a partir del tiempo: el dominio sabe hacerlo.
      const i = a.indiceEnTiempo(tiempo.current);
      setIndice((prev) => (prev === i ? prev : i));
      if (!a.enBucle && tiempo.current >= a.duracionDelCiclo()) setReproduciendo(false);
    },
    [a],
  );
  useCadaFrame(avanzar, reproduciendo);

  const n = a?.cantidadDeFrames ?? 0;
  const i = n ? Math.min(indice, n - 1) : 0;
  useEffect(() => onFrameActual(n ? i : -1), [i, n, onFrameActual]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const f = a?.frame(i);
    if (!a || !f || !img) {
      c.width = c.height = 96;
      ctx.clearRect(0, 0, 96, 96);
      return;
    }
    const caja = a.cajaMaxima();
    const W = caja.ancho * escala,
      H = caja.alto * escala;
    if (c.width !== W || c.height !== H) {
      c.width = W;
      c.height = H;
    }
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
    const fw = f.rect.ancho * escala,
      fh = f.rect.alto * escala;
    const pos = posicionEnCaja(a.ancla, fw, fh, W, H);
    ctx.drawImage(img, f.rect.x, f.rect.y, f.rect.ancho, f.rect.alto, Math.round(pos.x), Math.round(pos.y), fw, fh);
  }, [a, img, i, escala]);

  const paso = (d: number) => {
    if (!n) return;
    setReproduciendo(false);
    setIndice((x) => (((x + d) % n) + n) % n);
  };

  return (
    <section className="panel">
      <div className="row between">
        <h2>Vista previa</h2>
        <span className="status">{n ? `frame ${i + 1}/${n} · ciclo ${a!.duracionDelCiclo()} ms` : "sin frames"}</span>
      </div>
      <div className="preview-wrap checker">
        <canvas ref={canvas} width={96} height={96} className="pixel" />
      </div>
      <div className="row between">
        <div className="row">
          <button aria-label="Frame anterior" onClick={() => paso(-1)}>
            ◀
          </button>
          <button
            className="primary"
            style={{ minWidth: 96 }}
            onClick={() => {
              if (a && !a.enBucle && !reproduciendo) tiempo.current = 0;
              else if (!reproduciendo && a) {
                // seguir desde el frame que se ve
                let t = 0;
                for (let k = 0; k < i; k++) t += a.duracionDe(k);
                tiempo.current = t;
              }
              setReproduciendo((r) => !r);
            }}
          >
            {reproduciendo ? "Pausa" : "Reproducir"}
          </button>
          <button aria-label="Frame siguiente" onClick={() => paso(1)}>
            ▶
          </button>
        </div>
        <label className="row etiqueta-chica">
          Escala <input type="range" min={1} max={8} value={escala} onChange={(e) => setEscala(+e.target.value)} />
        </label>
      </div>
    </section>
  );
}
