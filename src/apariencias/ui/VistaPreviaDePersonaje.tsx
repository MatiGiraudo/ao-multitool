"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { DIRECCIONES, type Direccion } from "@/compartido/dominio/Direccion";
import { useCadaFrame, useImagen, usePrefiereMenosMovimiento } from "@/compartido/ui/utilidades";
import { posicionEnCaja } from "@/graficos/dominio/Ancla";
import { useGraficos, type GraficoResuelto } from "@/graficos/ui/ProveedorDeGraficos";
import type { Cabeza } from "../dominio/Cabeza";
import type { Cuerpo } from "../dominio/Cuerpo";
import { useApariencias } from "./ProveedorDeApariencias";

/**
 * El personaje armado: el cuerpo caminando con la cabeza apoyada en su corrimiento.
 *
 * Es la razón por la que cuerpos y cabezas están en el mismo módulo. Edites lo que edites, de un
 * lado queda fijo lo que estás tocando y del otro elegís con qué mirarlo.
 */
export function VistaPreviaDePersonaje({ cuerpo, cabeza, onElegirCabeza, onElegirCuerpo }: {
  cuerpo: Cuerpo | undefined;
  cabeza: Cabeza | undefined;
  /** Se muestra el selector del que NO se está editando. */
  onElegirCabeza?: (clave: string) => void;
  onElegirCuerpo?: (clave: string) => void;
}) {
  const { cuerpos, cabezas, resolver } = useApariencias();
  const graficos = useGraficos();
  const menosMovimiento = usePrefiereMenosMovimiento();
  const [dir, setDir] = useState<Direccion>("sur");
  const [reproduciendo, setReproduciendo] = useState(true);
  const [escala, setEscala] = useState(3);
  const reloj = useRef(0);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => setReproduciendo(!menosMovimiento), [menosMovimiento]);

  const capaCuerpo = resolver(cuerpo?.direcciones[dir]);
  const capaCabeza = resolver(cabeza?.direcciones[dir]);
  const imgCuerpo = useImagen(graficos.urlImagen(capaCuerpo?.hoja));
  const imgCabeza = useImagen(graficos.urlImagen(capaCabeza?.hoja));
  const offX = cuerpo?.offsetCabezaX ?? 0;
  const offY = cuerpo?.offsetCabezaY ?? 0;

  const dibujar = useCallback(
    (dt: number) => {
      if (reproduciendo) reloj.current += dt;
      const c = canvas.current;
      if (!c) return;
      const x = c.getContext("2d")!;
      const cajaCuerpo = capaCuerpo?.animacion.cantidadDeFrames ? capaCuerpo.animacion.cajaMaxima() : null;
      const cajaCabeza = capaCabeza?.animacion.cantidadDeFrames ? capaCabeza.animacion.cajaMaxima() : null;
      const ancho = Math.max(48, cajaCuerpo?.ancho ?? 0, cajaCabeza?.ancho ?? 0) + 2 * Math.abs(offX);
      const alto = Math.max(64, (cajaCuerpo?.alto ?? 0) + (cajaCabeza?.alto ?? 0)) + Math.abs(offY);
      const W = Math.round(ancho * escala),
        H = Math.round(alto * escala);
      if (c.width !== W || c.height !== H) {
        c.width = W;
        c.height = H;
      }
      x.clearRect(0, 0, W, H);
      x.imageSmoothingEnabled = false;

      // El cuerpo se apoya según su ancla; la cabeza va sobre el borde de arriba del cuerpo.
      let apoyoX = W / 2,
        apoyoY = H;
      if (capaCuerpo && imgCuerpo && cajaCuerpo) {
        const f = capaCuerpo.animacion.frame(capaCuerpo.animacion.indiceEnTiempo(reloj.current))!;
        const w = f.rect.ancho * escala,
          h = f.rect.alto * escala;
        const p = posicionEnCaja(capaCuerpo.animacion.ancla, w, h, W, H);
        x.drawImage(imgCuerpo, f.rect.x, f.rect.y, f.rect.ancho, f.rect.alto, Math.round(p.x), Math.round(p.y), w, h);
        apoyoX = p.x + w / 2;
        apoyoY = p.y;
      }
      if (capaCabeza && imgCabeza) {
        const ref = cabeza?.direcciones[dir];
        const f = capaCabeza.animacion.frame(ref?.frame ?? 0) ?? capaCabeza.animacion.frames[0];
        if (f) {
          const w = f.rect.ancho * escala,
            h = f.rect.alto * escala;
          x.drawImage(
            imgCabeza,
            f.rect.x,
            f.rect.y,
            f.rect.ancho,
            f.rect.alto,
            Math.round(apoyoX - w / 2 + offX * escala),
            Math.round(apoyoY - h + offY * escala),
            w,
            h,
          );
        }
      }
    },
    [capaCuerpo, capaCabeza, imgCuerpo, imgCabeza, escala, reproduciendo, offX, offY, cabeza, dir],
  );
  useCadaFrame(dibujar);

  const falta = !capaCuerpo && !capaCabeza ? "Vinculá los gráficos para ver el personaje." : !capaCuerpo ? "Falta el cuerpo de esta dirección." : !capaCabeza ? "Falta la cabeza de esta dirección." : "";

  return (
    <section className="panel">
      <div className="row between">
        <h2>Vista previa</h2>
        <span className="status">{cuerpo ? `cabeza en ${offX}, ${offY}` : "sin cuerpo"}</span>
      </div>
      <div className="preview-wrap checker">
        <canvas ref={canvas} width={96} height={96} className="pixel" />
      </div>
      {falta && <p className="hint">{falta}</p>}
      <div className="row between">
        <div className="seg" role="group" aria-label="Dirección">
          {DIRECCIONES.map((d) => (
            <button key={d.valor} className={d.valor === dir ? "on" : ""} aria-pressed={d.valor === dir} title={d.etiqueta} aria-label={d.etiqueta} onClick={() => setDir(d.valor)}>
              {d.flecha}
            </button>
          ))}
        </div>
        <button className="primary" style={{ minWidth: 96 }} onClick={() => setReproduciendo((r) => !r)}>
          {reproduciendo ? "Pausa" : "Reproducir"}
        </button>
      </div>
      <div className="row">
        {onElegirCabeza && (
          <label className="f" style={{ flex: "1 1 150px" }}>
            Con la cabeza
            <select value={cabeza?.clave ?? ""} disabled={!cabezas.items.length} onChange={(e) => onElegirCabeza(e.target.value)}>
              <option value="">Ninguna (sólo el cuerpo)</option>
              {cabezas.items.map((c) => (
                <option key={c.clave} value={c.clave}>
                  #{c.numero} {c.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        {onElegirCuerpo && (
          <label className="f" style={{ flex: "1 1 150px" }}>
            Sobre el cuerpo
            <select value={cuerpo?.clave ?? ""} disabled={!cuerpos.items.length} onChange={(e) => onElegirCuerpo(e.target.value)}>
              <option value="">Ninguno (sólo la cabeza)</option>
              {cuerpos.items.map((c) => (
                <option key={c.clave} value={c.clave}>
                  #{c.numero} {c.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="row etiqueta-chica" style={{ alignSelf: "flex-end" }}>
          Escala <input type="range" min={1} max={6} value={escala} onChange={(e) => setEscala(+e.target.value)} />
        </label>
      </div>
    </section>
  );
}
