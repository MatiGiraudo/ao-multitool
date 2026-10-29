"use client";
import { useEffect, useRef, useState } from "react";
import { useImagen } from "@/compartido/ui/utilidades";
import type { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import { useGraficos } from "@/graficos/ui/ProveedorDeGraficos";

/*
 * Elegir con qué pintar desde las hojas del proyecto.
 *
 * Hasta acá el pincel sólo entendía números de GRH, así que para poner un tile había que haber
 * importado el `Graficos.ini` del clásico y saberse el número. Esto da el otro camino: elegís la
 * hoja, hacés clic en una celda de su grilla, y el número lo busca (o lo inventa) el editor.
 *
 * La grilla es la de la hoja, la misma que se usa en «Animaciones»: si una hoja tiene celdas de
 * 32×32, sus tiles son de 32×32.
 */

/** Cuántas hojas se listan sin filtrar. Son miles después de importar un cliente. */
const TOPE = 40;
const ANCHO_VISTA = 320;

export interface Recorte {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export function CatalogoDeTiles({ onElegir }: { onElegir: (hoja: HojaDeSprites, recorte: Recorte) => void }) {
  const graficos = useGraficos();
  const [filtro, setFiltro] = useState("");
  const [hojaId, setHojaId] = useState<string | null>(null);

  const buscado = filtro.trim().toLowerCase();
  const conImagen = graficos.hojas.filter((h) => h.tieneImagen);
  const coinciden = buscado ? conImagen.filter((h) => h.nombreArchivo.toLowerCase().includes(buscado)) : conImagen;
  const hoja = graficos.hoja(hojaId);

  if (graficos.cargando) return <p className="hint">Buscando las hojas del proyecto…</p>;
  if (!conImagen.length) return <p className="hint">Todavía no hay hojas cargadas. Traelas desde «Animaciones» o «Importar».</p>;

  return (
    <>
      <div className="row">
        <input type="search" placeholder="Filtrar hojas…" value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ flex: "1 1 120px" }} />
      </div>
      <div className="mapa-paleta">
        {coinciden.slice(0, TOPE).map((h) => (
          <button key={h.id} className={h.id === hojaId ? "on" : ""} onClick={() => setHojaId(h.id)} title={h.nombreArchivo}>
            <span className="pn">{h.nombreArchivo}</span>
          </button>
        ))}
      </div>
      {coinciden.length > TOPE && (
        <p className="hint">
          {TOPE} de {coinciden.length.toLocaleString("es-AR")} hojas; filtrá para ver otras.
        </p>
      )}
      {hoja && <GrillaDeLaHoja hoja={hoja} onElegir={(recorte) => onElegir(hoja, recorte)} />}
    </>
  );
}

/** La hoja con su grilla encima; cada celda es un tile. */
function GrillaDeLaHoja({ hoja, onElegir }: { hoja: HojaDeSprites; onElegir: (recorte: Recorte) => void }) {
  const graficos = useGraficos();
  const img = useImagen(graficos.urlImagen(hoja));
  const canvas = useRef<HTMLCanvasElement>(null);
  const [encima, setEncima] = useState<Recorte | null>(null);
  const t = hoja.tamanio;
  const escala = t ? Math.min(1, ANCHO_VISTA / t.ancho) : 1;

  useEffect(() => {
    const c = canvas.current;
    if (!c || !t) return;
    c.width = Math.max(1, Math.round(t.ancho * escala));
    c.height = Math.max(1, Math.round(t.alto * escala));
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = false;
    if (img) ctx.drawImage(img, 0, 0, c.width, c.height);
    ctx.strokeStyle = "rgba(255,255,255,.25)";
    ctx.lineWidth = 1;
    for (const celda of hoja.grilla.todasLasCeldas(t)) {
      const r = celda.rect;
      ctx.strokeRect(r.x * escala + 0.5, r.y * escala + 0.5, r.ancho * escala - 1, r.alto * escala - 1);
    }
    if (encima) {
      ctx.strokeStyle = "#e2a43a";
      ctx.lineWidth = 2;
      ctx.strokeRect(encima.x * escala + 1, encima.y * escala + 1, encima.ancho * escala - 2, encima.alto * escala - 2);
    }
  }, [hoja, img, t, escala, encima]);

  const celdaDelEvento = (e: React.MouseEvent): Recorte | null => {
    const c = canvas.current;
    if (!c || !t) return null;
    const caja = c.getBoundingClientRect();
    const x = Math.floor((e.clientX - caja.left) / escala);
    const y = Math.floor((e.clientY - caja.top) / escala);
    const celda = hoja.grilla.celdaEn(x, y, t);
    return celda ? { x: celda.rect.x, y: celda.rect.y, ancho: celda.rect.ancho, alto: celda.rect.alto } : null;
  };

  return (
    <>
      <div className="checker" style={{ display: "inline-block", maxWidth: "100%", overflow: "auto" }}>
        <canvas
          ref={canvas}
          className="pixel"
          style={{ cursor: "crosshair", display: "block" }}
          onMouseMove={(e) => setEncima(celdaDelEvento(e))}
          onMouseLeave={() => setEncima(null)}
          onClick={(e) => {
            const r = celdaDelEvento(e);
            if (r) onElegir(r);
          }}
        />
      </div>
      <p className="hint">
        {hoja.nombreArchivo} · celdas de {hoja.grilla.anchoCelda}×{hoja.grilla.altoCelda}. Se cambian en «Animaciones».
        {hoja.numeroDeArchivo !== null && ` Se exporta como ${hoja.numeroDeArchivo}.png.`}
      </p>
    </>
  );
}
