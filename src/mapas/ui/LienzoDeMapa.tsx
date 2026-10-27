"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCadaFrame } from "@/compartido/ui/utilidades";
import type { RecorteDeGrh } from "../aplicacion/casosDeUso";
import { ALTO, ANCHO, Mapa } from "../dominio/Mapa";

/*
 * El mapa dibujado.
 *
 * Dos decisiones hacen que esto ande fluido con 40.000 celdas, y las dos salen de mirar los datos
 * reales en vez de suponer:
 *
 * - **La capa 1 se hornea en bloques.** Es el piso: está en las 10.000 celdas y nunca se sale de
 *   su cuadrado. Se dibuja una vez por bloque de 16×16 celdas en un canvas aparte y después cada
 *   cuadro se pegan sólo los bloques visibles: de ~8.000 dibujos por cuadro a menos de 20.
 * - **Las capas 2, 3 y 4 se dibujan en vivo.** En un mapa de verdad son 26, 284 y 264 celdas
 *   contra las 10.000 del piso, y sus gráficos son más altos que una celda (árboles, techos), así
 *   que hornearlos los cortaría en el borde del bloque. Dibujarlos sueltos es barato y sale bien.
 */

const CELDA = 32;
const CELDAS_POR_BLOQUE = 16;
const PX_POR_BLOQUE = CELDA * CELDAS_POR_BLOQUE;
const BLOQUES = Math.ceil(ANCHO / CELDAS_POR_BLOQUE);

export interface CapasVisibles {
  piso: boolean;
  superiores: boolean;
  bloqueos: boolean;
  triggers: boolean;
  traslados: boolean;
  npcs: boolean;
  objetos: boolean;
  grilla: boolean;
}

export const CAPAS_POR_DEFECTO: CapasVisibles = {
  piso: true,
  superiores: true,
  bloqueos: false,
  triggers: false,
  traslados: true,
  npcs: true,
  objetos: true,
  grilla: false,
};

export function LienzoDeMapa({
  mapa,
  graficos,
  imagenes,
  capas,
  onCelda,
}: {
  mapa: Mapa;
  graficos: Map<number, RecorteDeGrh>;
  /** Las hojas ya decodificadas, por id. */
  imagenes: Map<string, CanvasImageSource>;
  capas: CapasVisibles;
  /** Para mostrar qué hay en la celda donde está el mouse. */
  onCelda?: (x: number, y: number) => void;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const camara = useRef({ x: 0, y: 0 });
  const arrastre = useRef<{ x: number; y: number } | null>(null);
  const reloj = useRef(0);
  const bloques = useRef(new Map<string, HTMLCanvasElement>());

  // Si cambia el mapa o lo que se ve, los bloques horneados ya no sirven.
  useEffect(() => {
    bloques.current.clear();
    camara.current = { x: 0, y: 0 };
  }, [mapa, imagenes, capas.piso]);

  const crudo = useMemo(() => mapa.datosCrudos(), [mapa]);

  const dibujarGrh = useCallback(
    (ctx: CanvasRenderingContext2D, grh: number, x: number, y: number, cuadro: number) => {
      const r = graficos.get(grh);
      if (!r) {
        // Sin la hoja cargada igual se ve la forma del mapa: un color estable por gráfico.
        ctx.fillStyle = colorDeGrh(grh);
        ctx.fillRect(x, y, CELDA, CELDA);
        return;
      }
      const img = imagenes.get(r.hojaId);
      const c = r.cuadros[cuadro % r.cuadros.length] ?? r.cuadros[0];
      if (!img || !c) return;
      // Los gráficos más altos que una celda se apoyan abajo y se centran, como en el juego.
      ctx.drawImage(img, c.x, c.y, c.ancho, c.alto, x + (CELDA - c.ancho) / 2, y + CELDA - c.alto, c.ancho, c.alto);
    },
    [graficos, imagenes],
  );

  const bloque = useCallback(
    (bx: number, by: number): HTMLCanvasElement => {
      const clave = `${bx},${by}`;
      const guardado = bloques.current.get(clave);
      if (guardado) return guardado;

      const c = document.createElement("canvas");
      c.width = c.height = PX_POR_BLOQUE;
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      if (capas.piso) {
        for (let fila = 0; fila < CELDAS_POR_BLOQUE; fila++) {
          for (let col = 0; col < CELDAS_POR_BLOQUE; col++) {
            const x = bx * CELDAS_POR_BLOQUE + col + 1;
            const y = by * CELDAS_POR_BLOQUE + fila + 1;
            if (x > ANCHO || y > ALTO) continue;
            const grh = crudo.capas[0]![Mapa.indice(x, y)]!;
            if (grh) dibujarGrh(ctx, grh, col * CELDA, fila * CELDA, 0);
          }
        }
      }
      bloques.current.set(clave, c);
      return c;
    },
    [capas.piso, crudo, dibujarGrh],
  );

  const dibujar = useCallback(
    (dt: number) => {
      reloj.current += dt;
      const lienzo = canvas.current;
      const caja = contenedor.current;
      if (!lienzo || !caja) return;

      const ancho = caja.clientWidth;
      const alto = caja.clientHeight;
      if (lienzo.width !== ancho || lienzo.height !== alto) {
        lienzo.width = ancho;
        lienzo.height = alto;
      }

      const ctx = lienzo.getContext("2d")!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#0b0d12";
      ctx.fillRect(0, 0, ancho, alto);
      ctx.imageSmoothingEnabled = false;

      // La cámara se limita para que el mapa no se escape de la ventana.
      const mapaPx = ANCHO * CELDA * zoom;
      camara.current.x = Math.min(0, Math.max(camara.current.x, ancho - mapaPx));
      camara.current.y = Math.min(0, Math.max(camara.current.y, alto - mapaPx));
      if (mapaPx < ancho) camara.current.x = (ancho - mapaPx) / 2;
      if (mapaPx < alto) camara.current.y = (alto - mapaPx) / 2;
      ctx.setTransform(zoom, 0, 0, zoom, camara.current.x, camara.current.y);

      // Qué celdas entran en pantalla: todo lo demás ni se mira.
      const desdeX = Math.max(1, Math.floor(-camara.current.x / zoom / CELDA) + 1);
      const desdeY = Math.max(1, Math.floor(-camara.current.y / zoom / CELDA) + 1);
      const hastaX = Math.min(ANCHO, desdeX + Math.ceil(ancho / zoom / CELDA) + 1);
      const hastaY = Math.min(ALTO, desdeY + Math.ceil(alto / zoom / CELDA) + 1);

      if (capas.piso) {
        for (let by = Math.floor((desdeY - 1) / CELDAS_POR_BLOQUE); by <= Math.floor((hastaY - 1) / CELDAS_POR_BLOQUE); by++) {
          for (let bx = Math.floor((desdeX - 1) / CELDAS_POR_BLOQUE); bx <= Math.floor((hastaX - 1) / CELDAS_POR_BLOQUE); bx++) {
            if (bx < 0 || by < 0 || bx >= BLOQUES || by >= BLOQUES) continue;
            ctx.drawImage(bloque(bx, by), bx * PX_POR_BLOQUE, by * PX_POR_BLOQUE);
          }
        }
      }

      if (capas.superiores) {
        // De arriba hacia abajo: lo que está más al sur tapa a lo que está más al norte.
        for (let y = desdeY; y <= hastaY; y++) {
          for (let x = desdeX; x <= hastaX; x++) {
            const i = Mapa.indice(x, y);
            for (let capa = 1; capa < 4; capa++) {
              const grh = crudo.capas[capa]![i]!;
              if (!grh) continue;
              const r = graficos.get(grh);
              const cuadro = r && r.cuadros.length > 1 ? Math.floor(reloj.current / Math.max(10, r.msPorFrame)) : 0;
              dibujarGrh(ctx, grh, (x - 1) * CELDA, (y - 1) * CELDA, cuadro);
            }
          }
        }
      }

      for (let y = desdeY; y <= hastaY; y++) {
        for (let x = desdeX; x <= hastaX; x++) {
          const i = Mapa.indice(x, y);
          const px = (x - 1) * CELDA;
          const py = (y - 1) * CELDA;
          if (capas.bloqueos && crudo.bloqueos[i]) marcar(ctx, px, py, "rgba(220,70,70,.45)");
          if (capas.triggers && crudo.triggers[i]) marcar(ctx, px, py, "rgba(240,190,60,.40)");
          if (capas.traslados && crudo.traslados.has(i)) marcar(ctx, px, py, "rgba(90,170,255,.55)");
          if (capas.npcs && crudo.npcs.has(i)) punto(ctx, px, py, "#7ee081");
          if (capas.objetos && crudo.objetos.has(i)) punto(ctx, px, py, "#e8c15a");
        }
      }

      if (capas.grilla && zoom >= 0.5) {
        ctx.strokeStyle = "rgba(255,255,255,.07)";
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        for (let x = desdeX; x <= hastaX + 1; x++) {
          ctx.moveTo((x - 1) * CELDA, (desdeY - 1) * CELDA);
          ctx.lineTo((x - 1) * CELDA, hastaY * CELDA);
        }
        for (let y = desdeY; y <= hastaY + 1; y++) {
          ctx.moveTo((desdeX - 1) * CELDA, (y - 1) * CELDA);
          ctx.lineTo(hastaX * CELDA, (y - 1) * CELDA);
        }
        ctx.stroke();
      }
    },
    [bloque, capas, crudo, dibujarGrh, graficos, zoom],
  );
  useCadaFrame(dibujar);

  const celdaDelEvento = (e: { clientX: number; clientY: number }) => {
    const caja = contenedor.current?.getBoundingClientRect();
    if (!caja) return null;
    const x = Math.floor((e.clientX - caja.left - camara.current.x) / zoom / CELDA) + 1;
    const y = Math.floor((e.clientY - caja.top - camara.current.y) / zoom / CELDA) + 1;
    return Mapa.dentro(x, y) ? { x, y } : null;
  };

  return (
    <div className="mapa-lienzo" ref={contenedor}>
      <canvas
        ref={canvas}
        onPointerDown={(e) => {
          arrastre.current = { x: e.clientX - camara.current.x, y: e.clientY - camara.current.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (arrastre.current) {
            camara.current.x = e.clientX - arrastre.current.x;
            camara.current.y = e.clientY - arrastre.current.y;
          }
          const celda = celdaDelEvento(e);
          if (celda && onCelda) onCelda(celda.x, celda.y);
        }}
        onPointerUp={(e) => {
          arrastre.current = null;
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onWheel={(e) => {
          const paso = e.deltaY < 0 ? 1.25 : 0.8;
          setZoom((z) => Math.min(4, Math.max(0.25, z * paso)));
        }}
      />
      <div className="mapa-zoom">
        <button onClick={() => setZoom((z) => Math.max(0.25, z * 0.8))} aria-label="Alejar">
          −
        </button>
        <span className="status">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(4, z * 1.25))} aria-label="Acercar">
          +
        </button>
      </div>
    </div>
  );
}

function marcar(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, CELDA, CELDA);
}

function punto(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + CELDA / 2, y + CELDA / 2, 5, 0, Math.PI * 2);
  ctx.fill();
}

/** Un color estable por número de gráfico, para ver la forma del mapa sin las hojas cargadas. */
function colorDeGrh(grh: number): string {
  const h = (grh * 2654435761) % 360;
  return `hsl(${h} 35% ${28 + ((grh * 7) % 18)}%)`;
}
