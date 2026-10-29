"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReferenciaGrafica } from "@/compartido/dominio/ReferenciaGrafica";
import type { ImagenDibujable } from "@/compartido/ui/negroTransparente";
import { colorCss, useCadaFrame, useImagen, usePrefiereMenosMovimiento } from "@/compartido/ui/utilidades";
import { posicionEnCaja } from "@/graficos/dominio/Ancla";
import { useGraficos } from "@/graficos/ui/ProveedorDeGraficos";
import { RanuraGrafica } from "@/graficos/ui/RanuraGrafica";
import type { Efecto } from "../dominio/Efecto";
import { useEfectos } from "./ProveedorDeEfectos";

/**
 * El efecto en movimiento, y —lo importante— encima de otro gráfico.
 *
 * Un offset sólo se puede juzgar contra algo: por eso se puede elegir un gráfico de muestra
 * (hoy, cualquier animación; cuando exista el módulo Apariencias, va a venir preseleccionado un
 * cuerpo). El gráfico de muestra es sólo de la pantalla: no se guarda con el efecto.
 */
export function VistaPreviaDeEfecto({ efecto }: { efecto: Efecto }) {
  const { resolver } = useEfectos();
  const graficos = useGraficos();
  const menosMovimiento = usePrefiereMenosMovimiento();
  const [base, setBase] = useState<ReferenciaGrafica | null>(null);
  const [reproduciendo, setReproduciendo] = useState(true);
  const [escala, setEscala] = useState(3);
  const reloj = useRef(0);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => setReproduciendo(!menosMovimiento), [menosMovimiento]);
  useEffect(() => {
    reloj.current = 0;
  }, [efecto.clave]);

  const capaFx = resolver(efecto.animacion);
  const capaBase = resolver(base);
  const imgFx = useImagen(graficos.urlImagen(capaFx?.hoja));
  const imgBase = useImagen(graficos.urlImagen(capaBase?.hoja));

  const dibujar = useCallback(
    (dt: number) => {
      if (reproduciendo) reloj.current += dt;
      const c = canvas.current;
      if (!c) return;
      const x = c.getContext("2d")!;

      const cajaFx = capaFx?.animacion.cantidadDeFrames ? capaFx.animacion.cajaMaxima() : null;
      const cajaBase = capaBase?.animacion.cantidadDeFrames ? capaBase.animacion.cajaMaxima() : null;
      // La caja se calcula con los tamaños de las animaciones (no con el frame actual) para que no salte.
      const lado = Math.max(64, cajaFx?.ancho ?? 0, cajaFx?.alto ?? 0, cajaBase?.ancho ?? 0, cajaBase?.alto ?? 0) + 2 * Math.max(Math.abs(efecto.offsetX), Math.abs(efecto.offsetY), 8);
      const L = Math.round(lado * escala);
      if (c.width !== L || c.height !== L) c.width = c.height = L;
      x.clearRect(0, 0, L, L);
      x.imageSmoothingEnabled = false;

      const capa = (g: typeof capaFx, img: ImagenDibujable | null, dx: number, dy: number) => {
        if (!g || !img || !g.animacion.cantidadDeFrames) return;
        const f = g.animacion.frame(g.animacion.indiceEnTiempo(reloj.current))!;
        const w = f.rect.ancho * escala,
          h = f.rect.alto * escala;
        const p = posicionEnCaja(g.animacion.ancla, w, h, L, L);
        x.drawImage(img, f.rect.x, f.rect.y, f.rect.ancho, f.rect.alto, Math.round(p.x + dx * escala), Math.round(p.y + dy * escala), w, h);
      };

      capa(capaBase, imgBase, 0, 0);
      capa(capaFx, imgFx, efecto.offsetX, efecto.offsetY);

      // Marca del punto de apoyo (abajo al centro), que es desde donde se mide el corrimiento.
      x.fillStyle = colorCss("--apagado") || "#888";
      x.globalAlpha = 0.5;
      x.fillRect(Math.round(L / 2) - 4, L - 1 - escala, 9, 1);
      x.fillRect(Math.round(L / 2), L - 1 - escala - 4, 1, 9);
      x.globalAlpha = 1;
    },
    [capaFx, capaBase, imgFx, imgBase, escala, reproduciendo, efecto.offsetX, efecto.offsetY],
  );
  useCadaFrame(dibujar);

  const mensaje = !efecto.animacion ? "Todavía no elegiste la animación del efecto." : !capaFx ? "El vínculo con la animación está roto." : "";

  return (
    <section className="panel">
      <div className="row between">
        <h2>Vista previa</h2>
        <span className="status">
          {efecto.offsetX || efecto.offsetY ? `corrido ${efecto.offsetX}, ${efecto.offsetY} px` : "sin corrimiento"} · {efecto.enBucle ? "en bucle" : `${efecto.repeticiones}×`}
        </span>
      </div>
      <div className="preview-wrap checker">
        <canvas ref={canvas} width={96} height={96} className="pixel" />
      </div>
      {mensaje && <p className="hint">{mensaje}</p>}
      <div className="row between">
        <button className="primary" style={{ minWidth: 96 }} onClick={() => setReproduciendo((r) => !r)}>
          {reproduciendo ? "Pausa" : "Reproducir"}
        </button>
        <label className="row etiqueta-chica">
          Escala <input type="range" min={1} max={6} value={escala} onChange={(e) => setEscala(+e.target.value)} />
        </label>
      </div>
      <RanuraGrafica
        id="fx_base"
        etiqueta="Ver sobre"
        tituloSelector="Gráfico de muestra"
        vacio="Nada (sólo el efecto)"
        referencia={base}
        conFrame={false}
        onCambiar={setBase}
      />
      <p className="hint">El gráfico de muestra es sólo para mirar: no se guarda con el efecto.</p>
    </section>
  );
}
