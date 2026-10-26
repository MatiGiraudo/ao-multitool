"use client";
import { useEffect, useState } from "react";
import { useAplicacion } from "@/compartido/ui/Aplicacion";
import type { CalidadDeEscalado } from "../aplicacion/puertos";
import type { HojaDeSprites } from "../dominio/HojaDeSprites";
import { Tamanio } from "../dominio/Tamanio";
import { useGraficos } from "./ProveedorDeGraficos";

export function PanelRedimensionar({ hoja }: { hoja: HojaDeSprites }) {
  const { avisar } = useAplicacion();
  const graficos = useGraficos();
  const t = hoja.tamanio;
  const [abierto, setAbierto] = useState(false);
  const [ancho, setAncho] = useState(t?.ancho ?? 0);
  const [alto, setAlto] = useState(t?.alto ?? 0);
  const [candado, setCandado] = useState(true);
  const [calidad, setCalidad] = useState<CalidadDeEscalado>("pixel");
  const [escalarContenido, setEscalarContenido] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    setAncho(t?.ancho ?? 0);
    setAlto(t?.alto ?? 0);
    if (t && (t.ancho > 1024 || t.alto > 1024)) setAbierto(true);
  }, [t]);

  if (!t) return null;
  const pct = Math.round((ancho / t.ancho) * 100);
  const porPorcentaje = (p: number) => {
    if (!(p > 0)) return;
    setAncho(Math.max(1, Math.round((t.ancho * p) / 100)));
    setAlto(Math.max(1, Math.round((t.alto * p) / 100)));
  };

  const aplicar = async () => {
    let nuevo: Tamanio;
    try {
      nuevo = Tamanio.crear(ancho, alto);
    } catch (e) {
      avisar((e as Error).message);
      return;
    }
    setOcupado(true);
    const h = await graficos.redimensionar(hoja.id, nuevo, calidad, escalarContenido);
    setOcupado(false);
    if (h) avisar(`Imagen redimensionada a ${nuevo}.`);
  };

  return (
    <details className="resize" open={abierto} onToggle={(e) => setAbierto((e.target as HTMLDetailsElement).open)}>
      <summary>
        Redimensionar imagen{" "}
        <span className="status">
          actual {t.toString()}
          {hoja.fueRedimensionada && hoja.tamanioOriginal ? ` · original ${hoja.tamanioOriginal}` : ""}
        </span>
      </summary>
      <div className="resize-body">
        <div className="row">
          <label className="f">
            Ancho px
            <input
              id="rzAncho"
              type="number"
              min={1}
              value={ancho}
              onChange={(e) => {
                const w = +e.target.value;
                setAncho(w);
                if (candado && w > 0) setAlto(Math.max(1, Math.round((w * t.alto) / t.ancho)));
              }}
            />
          </label>
          <button className={candado ? "on" : ""} aria-pressed={candado} title="Mantener proporción" onClick={() => setCandado(!candado)} style={{ alignSelf: "flex-end" }}>
            🔗
          </button>
          <label className="f">
            Alto px
            <input
              id="rzAlto"
              type="number"
              min={1}
              value={alto}
              onChange={(e) => {
                const h = +e.target.value;
                setAlto(h);
                if (candado && h > 0) setAncho(Math.max(1, Math.round((h * t.ancho) / t.alto)));
              }}
            />
          </label>
          <label className="f">
            Escala %
            <input id="rzPct" type="number" min={1} max={800} value={Number.isFinite(pct) ? pct : 100} onChange={(e) => porPorcentaje(+e.target.value)} />
          </label>
          <div className="row" style={{ gap: 4, alignSelf: "flex-end" }}>
            {[25, 50, 75, 200].map((p) => (
              <button key={p} onClick={() => porPorcentaje(p)}>
                {p}%
              </button>
            ))}
          </div>
        </div>
        <div className="row">
          <label className="f">
            Calidad
            <select id="rzCalidad" value={calidad} onChange={(e) => setCalidad(e.target.value as CalidadDeEscalado)}>
              <option value="pixel">Píxel exacto (pixel art)</option>
              <option value="suave">Suavizado (ilustraciones, fotos)</option>
            </select>
          </label>
          <label className="row chk">
            <input id="rzContenido" type="checkbox" checked={escalarContenido} onChange={(e) => setEscalarContenido(e.target.checked)} /> Escalar
            también frames y grilla
          </label>
        </div>
        <div className="row">
          <button className="primary" disabled={ocupado} onClick={aplicar}>
            {ocupado ? "Procesando…" : "Aplicar"}
          </button>
          {hoja.fueRedimensionada && (
            <button
              disabled={ocupado}
              onClick={async () => {
                setOcupado(true);
                const h = await graficos.restaurarOriginal(hoja.id, escalarContenido);
                setOcupado(false);
                if (h) avisar(`Se restauró la imagen original (${h.tamanio}).`);
              }}
            >
              Volver al original
            </button>
          )}
        </div>
        <p className="hint">
          El original se guarda aparte en la carpeta de datos, así que siempre podés volver atrás. Usá «Píxel exacto» con escalas enteras (50%,
          200%) para que el pixel art no se deforme.
        </p>
      </div>
    </details>
  );
}
