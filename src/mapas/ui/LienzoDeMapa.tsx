"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCadaFrame } from "@/compartido/ui/utilidades";
import type { RecorteDeGrh } from "../aplicacion/casosDeUso";
import { celdasDelTrazo, type Historial, type Trazo } from "../dominio/Historial";
import { calcular, esDeUnClic, seArrastra, type Ajustes, type Punto } from "../dominio/herramientas";
import { ALTO, ANCHO, Mapa } from "../dominio/Mapa";
import { CELDA, dibujarGrh as pegarGrh } from "./dibujo";

/*
 * El mapa dibujado, y editable.
 *
 * Dos decisiones hacen que esto ande fluido con 40.000 celdas, y las dos salen de mirar los datos
 * reales en vez de suponer:
 *
 * - **La capa 1 se hornea en bloques.** Es el piso: está en las 10.000 celdas y nunca se sale de
 *   su cuadrado. Se dibuja una vez por bloque de 16×16 celdas en un canvas aparte y después cada
 *   cuadro se pegan sólo los bloques visibles: de ~8.000 dibujos por cuadro a menos de 20. Al
 *   pintar se tiran sólo los bloques que tocó la pincelada, no los 49.
 * - **Las capas 2, 3 y 4 se dibujan en vivo.** En un mapa de verdad son 26, 284 y 264 celdas
 *   contra las 10.000 del piso, y sus gráficos son más altos que una celda (árboles, techos), así
 *   que hornearlos los cortaría en el borde del bloque. Dibujarlos sueltos es barato y sale bien.
 */

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

/**
 * Lo que hace falta para editar. Si no viene, el lienzo es sólo un visor y el botón izquierdo
 * arrastra el mapa, como antes.
 */
export interface EdicionDelLienzo {
  ajustes: Ajustes;
  historial: Historial;
  /** Una vez por pincelada terminada, no por tramo: es para marcar que hay cambios sin guardar. */
  onCambio: () => void;
  /** El cuentagotas no edita: devuelve el gráfico de la celda para seguir pintando con ése. */
  onCuentagotas: (grh: number) => void;
}

export function LienzoDeMapa({
  mapa,
  graficos,
  imagenes,
  capas,
  onCelda,
  edicion,
  revision = 0,
}: {
  mapa: Mapa;
  graficos: Map<number, RecorteDeGrh>;
  /** Las hojas ya decodificadas, por id. */
  imagenes: Map<string, CanvasImageSource>;
  capas: CapasVisibles;
  /** Para mostrar qué hay en la celda donde está el mouse. */
  onCelda?: (x: number, y: number) => void;
  edicion?: EdicionDelLienzo;
  /** Súbila cuando el mapa cambió por fuera del lienzo (deshacer, rehacer): se rehornea todo. */
  revision?: number;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const camara = useRef({ x: 0, y: 0 });
  const arrastre = useRef<{ x: number; y: number } | null>(null);
  const reloj = useRef(0);
  const bloques = useRef(new Map<string, HTMLCanvasElement>());

  /* La edición llega en un objeto nuevo en cada render; guardarla acá evita reiniciar el bucle de
   * dibujo y los manejadores por algo que cambia sesenta veces por segundo. */
  const ed = useRef(edicion);
  ed.current = edicion;
  const pintando = useRef<{ primera: Punto; ultima: Punto } | null>(null);
  const puntero = useRef<Punto | null>(null);
  const huboCambio = useRef(false);

  // Si cambia el mapa, lo que se ve, o alguien lo editó por afuera, los bloques ya no sirven.
  useEffect(() => {
    bloques.current.clear();
  }, [mapa, imagenes, capas.piso, revision]);

  useEffect(() => {
    camara.current = { x: 0, y: 0 };
  }, [mapa]);

  const crudo = useMemo(() => mapa.datosCrudos(), [mapa]);

  const dibujarGrh = useCallback(
    (ctx: CanvasRenderingContext2D, grh: number, x: number, y: number, cuadro: number) => {
      pegarGrh(ctx, grh, x, y, cuadro, graficos, imagenes);
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

      dibujarCursor(ctx, ed.current, pintando.current, puntero.current, zoom);
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

  /** Tira los bloques horneados que tocó el trazo: sólo ésos hay que volver a dibujar. */
  const invalidar = (celdas: number[]) => {
    for (const i of celdas) {
      const bx = Math.floor((i % ANCHO) / CELDAS_POR_BLOQUE);
      const by = Math.floor(Math.floor(i / ANCHO) / CELDAS_POR_BLOQUE);
      bloques.current.delete(`${bx},${by}`);
    }
  };

  const aplicarTramo = (trazo: Trazo, fundir: boolean) => {
    const e = ed.current;
    if (!e || !e.historial.aplicar(mapa, trazo, fundir)) return;
    huboCambio.current = true;
    if (trazo.cambios.some((c) => c.tipo === "grafico" && c.capa === 1)) invalidar(celdasDelTrazo(trazo));
  };

  /** Con el lienzo en modo editor, arrastrar el mapa pasa a ser con el botón del medio o shift. */
  const vaAPanear = (e: { button: number; shiftKey: boolean }) => !ed.current || e.button !== 0 || e.shiftKey;

  return (
    <div className={`mapa-lienzo${edicion ? " editando" : ""}`} ref={contenedor}>
      <canvas
        ref={canvas}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          if (vaAPanear(e)) {
            arrastre.current = { x: e.clientX - camara.current.x, y: e.clientY - camara.current.y };
            return;
          }
          const celda = celdaDelEvento(e);
          const activa = ed.current;
          if (!celda || !activa) return;
          const { herramienta } = activa.ajustes;
          if (herramienta === "cuentagotas") {
            activa.onCuentagotas(mapa.grafico(celda.x, celda.y, activa.ajustes.capa));
            return;
          }
          huboCambio.current = false;
          if (esDeUnClic(herramienta)) {
            aplicarTramo(calcular(mapa, activa.ajustes, celda), false);
            terminarGesto(activa);
            return;
          }
          pintando.current = { primera: celda, ultima: celda };
          if (seArrastra(herramienta)) aplicarTramo(calcular(mapa, activa.ajustes, celda), false);
        }}
        onPointerMove={(e) => {
          if (arrastre.current) {
            camara.current.x = e.clientX - arrastre.current.x;
            camara.current.y = e.clientY - arrastre.current.y;
          }
          const celda = celdaDelEvento(e);
          puntero.current = celda;
          const activa = ed.current;
          if (celda && activa && pintando.current) {
            if (seArrastra(activa.ajustes.herramienta)) {
              aplicarTramo(calcular(mapa, activa.ajustes, pintando.current.ultima, celda), true);
            }
            pintando.current.ultima = celda;
          }
          if (celda && onCelda) onCelda(celda.x, celda.y);
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          arrastre.current = null;
          const gesto = pintando.current;
          pintando.current = null;
          const activa = ed.current;
          if (!gesto || !activa) return;
          if (activa.ajustes.herramienta === "rectangulo") {
            aplicarTramo(calcular(mapa, activa.ajustes, gesto.primera, gesto.ultima), false);
          }
          terminarGesto(activa);
        }}
        onPointerLeave={() => {
          puntero.current = null;
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

  /** Un solo aviso por gesto, y sólo si de verdad cambió algo. */
  function terminarGesto(activa: EdicionDelLienzo) {
    if (!huboCambio.current) return;
    huboCambio.current = false;
    activa.onCambio();
  }
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

/**
 * El contorno de lo que va a pasar si hacés clic ahora.
 *
 * Sin esto el pincel es a ciegas: no se ve dónde cae ni de qué tamaño es, y el rectángulo habría
 * que imaginárselo mientras se arrastra.
 */
function dibujarCursor(
  ctx: CanvasRenderingContext2D,
  edicion: EdicionDelLienzo | undefined,
  gesto: { primera: Punto; ultima: Punto } | null,
  puntero: Punto | null,
  zoom: number,
): void {
  if (!edicion) return;
  const { herramienta, tamanio } = edicion.ajustes;
  ctx.lineWidth = 2 / zoom;
  ctx.strokeStyle = "rgba(255,255,255,.85)";

  if (herramienta === "rectangulo" && gesto) {
    const x1 = Math.min(gesto.primera.x, gesto.ultima.x);
    const y1 = Math.min(gesto.primera.y, gesto.ultima.y);
    const x2 = Math.max(gesto.primera.x, gesto.ultima.x);
    const y2 = Math.max(gesto.primera.y, gesto.ultima.y);
    ctx.strokeRect((x1 - 1) * CELDA, (y1 - 1) * CELDA, (x2 - x1 + 1) * CELDA, (y2 - y1 + 1) * CELDA);
    return;
  }
  if (!puntero) return;
  const lado = herramienta === "rectangulo" || herramienta === "balde" || herramienta === "cuentagotas" ? 1 : Math.max(1, tamanio);
  const radio = Math.floor(lado / 2);
  ctx.strokeRect((puntero.x - 1 - radio) * CELDA, (puntero.y - 1 - radio) * CELDA, lado * CELDA, lado * CELDA);
}
