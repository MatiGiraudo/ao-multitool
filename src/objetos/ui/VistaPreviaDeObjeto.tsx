"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCadaFrame, useImagen, usePrefiereMenosMovimiento } from "@/compartido/ui/utilidades";
import { posicionEnCaja } from "@/graficos/dominio/Ancla";
import { dibujarFrameAjustado } from "@/graficos/ui/DibujoDeFrame";
import { useGraficos } from "@/graficos/ui/ProveedorDeGraficos";
import { DIRECCIONES, type Direccion } from "@/compartido/dominio/Direccion";
import type { Objeto } from "../dominio/Objeto";
import type { GraficoResuelto } from "@/graficos/ui/ProveedorDeGraficos";
import { useObjetos } from "./ProveedorDeObjetos";

/** Cómo se ve el objeto en el inventario, tirado en el suelo y equipado. */
export function VistaPreviaDeObjeto({ objeto }: { objeto: Objeto }) {
  const { objetos, resolver } = useObjetos();
  const graficos = useGraficos();
  const icono = resolver(objeto.graficos.icono);
  const suelo = resolver(objeto.graficoEnSuelo());
  const imgIcono = useImagen(graficos.urlImagen(icono?.hoja));
  const imgSuelo = useImagen(graficos.urlImagen(suelo?.hoja));
  const inv = useRef<HTMLCanvasElement>(null);
  const pasto = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = inv.current?.getContext("2d");
    if (ctx) dibujarFrameAjustado(ctx, imgIcono, icono?.animacion.frame(objeto.graficos.icono?.frame ?? 0) ?? icono?.animacion.frames[0], 1);
  }, [imgIcono, icono, objeto.graficos.icono]);

  useEffect(() => {
    const c = pasto.current;
    if (!c) return;
    const x = c.getContext("2d")!;
    dibujarPasto(x);
    const ref = objeto.graficoEnSuelo();
    const f = suelo?.animacion.frame(ref?.frame ?? 0) ?? suelo?.animacion.frames[0];
    if (!imgSuelo || !f) return;
    const k = Math.min(2, (c.height - 8) / f.rect.alto, (c.width - 8) / f.rect.ancho);
    x.imageSmoothingEnabled = k < 1;
    x.drawImage(imgSuelo, f.rect.x, f.rect.y, f.rect.ancho, f.rect.alto, Math.round(c.width / 2 - (f.rect.ancho * k) / 2), Math.round(c.height / 2 - (f.rect.alto * k) / 2), f.rect.ancho * k, f.rect.alto * k);
  }, [imgSuelo, suelo, objeto]);

  const bases = objetos.filter((o) => o.clave !== objeto.clave && o.tipo.id === "armadura" && DIRECCIONES.some((d) => o.graficos.equipado[d.valor]));

  return (
    <section className="panel">
      <h2>Vista previa</h2>
      <div className="pv-grid">
        <figure className="pvf">
          <figcaption>Inventario</figcaption>
          <div className="inv">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="cell">
                {i === 0 && (
                  <>
                    <canvas ref={inv} width={52} height={52} />
                    {objeto.graficos.icono && objeto.apilable && <span className="qty">100</span>}
                  </>
                )}
              </div>
            ))}
          </div>
        </figure>
        <figure className="pvf">
          <figcaption>En el suelo</figcaption>
          <canvas ref={pasto} width={192} height={128} className="suelo" />
        </figure>
      </div>
      {objeto.tipo.equipable && <Equipado objeto={objeto} bases={bases} resolver={resolver} />}
    </section>
  );
}

function Equipado({ objeto, bases, resolver }: { objeto: Objeto; bases: Objeto[]; resolver: (r: Objeto["graficos"]["icono"]) => GraficoResuelto | null }) {
  const graficos = useGraficos();
  const menosMovimiento = usePrefiereMenosMovimiento();
  const [dir, setDir] = useState<Direccion>("sur");
  const [baseClave, setBaseClave] = useState("");
  const [reproduciendo, setReproduciendo] = useState(true);
  const [escala, setEscala] = useState(3);
  const reloj = useRef(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => setReproduciendo(!menosMovimiento), [menosMovimiento]);

  const base = objeto.tipo.id === "armadura" ? undefined : bases.find((b) => b.clave === baseClave);
  const capaBase = base ? resolver(base.graficos.equipado[dir] ?? null) : null;
  const capaObjeto = resolver(objeto.graficos.equipado[dir] ?? null);
  const imgBase = useImagen(graficos.urlImagen(capaBase?.hoja));
  const imgObjeto = useImagen(graficos.urlImagen(capaObjeto?.hoja));

  const dibujar = useCallback(
    (dt: number) => {
      if (reproduciendo) reloj.current += dt;
      const c = canvas.current;
      if (!c) return;
      const x = c.getContext("2d")!;
      const candidatas: [GraficoResuelto | null, HTMLImageElement | null][] = [
        [capaBase, imgBase],
        [capaObjeto, imgObjeto],
      ];
      const capas = candidatas.filter((p): p is [GraficoResuelto, HTMLImageElement] => !!p[0] && !!p[1] && p[0].animacion.cantidadDeFrames > 0);
      if (!capas.length) {
        if (c.width !== 96) c.width = c.height = 96;
        x.clearRect(0, 0, c.width, c.height);
        return;
      }
      let mw = 0,
        mh = 0;
      for (const [g] of capas) {
        const caja = g.animacion.cajaMaxima();
        mw = Math.max(mw, caja.ancho);
        mh = Math.max(mh, caja.alto);
      }
      const W = mw * escala,
        H = mh * escala;
      if (c.width !== W || c.height !== H) {
        c.width = W;
        c.height = H;
      }
      x.clearRect(0, 0, W, H);
      x.imageSmoothingEnabled = false;
      for (const [g, img] of capas) {
        const f = g.animacion.frame(g.animacion.indiceEnTiempo(reloj.current))!;
        const fw = f.rect.ancho * escala,
          fh = f.rect.alto * escala;
        const p = posicionEnCaja(g.animacion.ancla, fw, fh, W, H);
        x.drawImage(img, f.rect.x, f.rect.y, f.rect.ancho, f.rect.alto, Math.round(p.x), Math.round(p.y), fw, fh);
      }
    },
    [capaBase, capaObjeto, imgBase, imgObjeto, escala, reproduciendo],
  );
  useCadaFrame(dibujar);

  const ref = objeto.graficos.equipado[dir];
  const mensaje = !ref ? "No hay animación vinculada para esta dirección." : !capaObjeto ? "El vínculo de esta dirección está roto." : "";

  return (
    <figure className="pvf">
      <figcaption>Equipado</figcaption>
      <div className="preview-wrap checker">
        <canvas ref={canvas} width={96} height={96} className="pixel" />
      </div>
      {mensaje && <p className="hint">{mensaje}</p>}
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
        <label className="f" style={{ flex: "1 1 150px" }}>
          Ver sobre
          <select id="verSobre" value={base ? baseClave : ""} disabled={objeto.tipo.id === "armadura" || !bases.length} onChange={(e) => setBaseClave(e.target.value)}>
            <option value="">Nada (solo el objeto)</option>
            {bases.map((b) => (
              <option key={b.clave} value={b.clave}>
                #{b.numero} {b.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="row etiqueta-chica" style={{ alignSelf: "flex-end" }}>
          Escala <input type="range" min={1} max={6} value={escala} onChange={(e) => setEscala(+e.target.value)} />
        </label>
      </div>
    </figure>
  );
}

/** Pasto de fondo, determinístico (siempre igual) para que no "titile". */
function dibujarPasto(x: CanvasRenderingContext2D) {
  const c = x.canvas,
    T = 64;
  for (let ty = 0; ty < c.height; ty += T)
    for (let tx = 0; tx < c.width; tx += T) {
      x.fillStyle = "#4f7a3a";
      x.fillRect(tx, ty, T, T);
      let s = (tx * 7 + ty * 13 + 1) | 0;
      for (let k = 0; k < 22; k++) {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        const px = s % T;
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        const py = s % T;
        x.fillStyle = k % 3 ? "#5f8c45" : "#3f6630";
        x.fillRect(tx + px - (px % 2), ty + py - (py % 2), 4, 2);
      }
    }
}
