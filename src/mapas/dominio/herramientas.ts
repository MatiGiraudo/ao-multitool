import type { Cambio, Trazo } from "./Historial";
import { ALTO, ANCHO, Mapa, type ObjetoEnElSuelo, type Traslado } from "./Mapa";

/*
 * Las herramientas de edición, como cuentas y no como botones.
 *
 * Ninguna toca el mapa: cada una calcula la lista de cambios que haría. Así el historial es el
 * único que escribe (y por lo tanto el único que sabe deshacer), y las herramientas se prueban
 * sin lienzo, sin mouse y sin React.
 */

export type Herramienta =
  | "pincel"
  | "goma"
  | "rectangulo"
  | "balde"
  | "bloquear"
  | "desbloquear"
  | "trigger"
  | "traslado"
  | "npc"
  | "objeto"
  | "cuentagotas";

export interface Punto {
  x: number;
  y: number;
}

export interface Ajustes {
  herramienta: Herramienta;
  capa: number;
  grh: number;
  /** Lado del pincel en celdas: 1, 3, 5… */
  tamanio: number;
  /** Lo que escribe la herramienta «trigger»; 0 saca el que hubiera. */
  trigger: number;
  /** Adónde manda la herramienta «traslado»; null saca el que hubiera. */
  traslado: Traslado | null;
  /** Qué NPC pone la herramienta «npc»; 0 saca el que hubiera. */
  npc: number;
  /** Qué objeto deja en el piso la herramienta «objeto»; null saca el que hubiera. */
  objeto: ObjetoEnElSuelo | null;
}

export const AJUSTES_POR_DEFECTO: Ajustes = {
  herramienta: "pincel",
  capa: 1,
  grh: 0,
  tamanio: 1,
  trigger: 1,
  traslado: { mapa: 1, x: 50, y: 50 },
  npc: 1,
  objeto: { objeto: 1, cantidad: 1 },
};

export const NOMBRES: Record<Herramienta, string> = {
  pincel: "Pincel",
  goma: "Goma",
  rectangulo: "Rectángulo",
  balde: "Balde",
  bloquear: "Bloquear",
  desbloquear: "Desbloquear",
  trigger: "Trigger",
  traslado: "Traslado",
  npc: "NPC",
  objeto: "Objeto",
  cuentagotas: "Cuentagotas",
};

/** Las herramientas que se arrastran celda por celda; el rectángulo, en cambio, se suelta. */
export function seArrastra(h: Herramienta): boolean {
  return h === "pincel" || h === "goma" || h === "bloquear" || h === "desbloquear" || h === "trigger";
}

/** Las que se resuelven con el clic y no esperan a que se suelte el botón. */
export function esDeUnClic(h: Herramienta): boolean {
  return h === "balde" || h === "traslado" || h === "npc" || h === "objeto";
}

/** Las que no tienen sentido con un pincel de más de una celda. */
export function usaTamanio(h: Herramienta): boolean {
  return seArrastra(h) || h === "goma";
}

/**
 * Lo que haría la herramienta con un gesto que va de `desde` hasta `hasta`.
 *
 * Para las que se arrastran, `desde` y `hasta` son dos celdas seguidas del arrastre; para el
 * rectángulo, las dos esquinas. Devuelve siempre un trazo, aunque sea vacío.
 */
export function calcular(mapa: Mapa, ajustes: Ajustes, desde: Punto, hasta: Punto = desde): Trazo {
  const { herramienta, capa, grh, tamanio } = ajustes;

  // Sin gráfico elegido, las herramientas que ponen gráficos no hacen nada: para vaciar celdas
  // está la goma, y un clic al aire no debería borrar el piso sin que nadie lo haya pedido.
  if (!grh && (herramienta === "pincel" || herramienta === "rectangulo" || herramienta === "balde")) {
    return trazo(NOMBRES[herramienta], []);
  }

  switch (herramienta) {
    case "pincel":
      return trazo(NOMBRES.pincel, graficos(mapa, pinceladas(desde, hasta, tamanio), capa, grh));
    case "goma":
      return trazo(NOMBRES.goma, graficos(mapa, pinceladas(desde, hasta, tamanio), capa, 0));
    case "rectangulo":
      return trazo(NOMBRES.rectangulo, graficos(mapa, rectangulo(desde, hasta), capa, grh));
    case "balde":
      return trazo(NOMBRES.balde, graficos(mapa, contiguas(mapa, desde, capa), capa, grh));
    case "bloquear":
    case "desbloquear":
      return trazo(NOMBRES[herramienta], bloqueos(mapa, pinceladas(desde, hasta, tamanio), herramienta === "bloquear"));
    case "trigger":
      return trazo(NOMBRES.trigger, triggers(mapa, pinceladas(desde, hasta, tamanio), ajustes.trigger));
    case "traslado":
      return trazo(NOMBRES.traslado, traslados(mapa, desde, ajustes.traslado));
    case "npc":
      return trazo(NOMBRES.npc, npcs(mapa, desde, ajustes.npc));
    case "objeto":
      return trazo(NOMBRES.objeto, objetos(mapa, desde, ajustes.objeto));
    case "cuentagotas":
      return trazo(NOMBRES.cuentagotas, []);
  }
}

function trazo(nombre: string, cambios: Cambio[]): Trazo {
  return { nombre, cambios };
}

// ---------- qué celdas ----------

/**
 * Las celdas que pisa el pincel al ir de una a otra.
 *
 * El mouse salta celdas cuando se mueve rápido, así que se rellena la línea entre las dos
 * posiciones (Bresenham) y recién después se le da el grosor del pincel. Sin esto, una pincelada
 * rápida deja la línea punteada.
 */
function pinceladas(desde: Punto, hasta: Punto, tamanio: number): number[] {
  const celdas = new Set<number>();
  for (const p of linea(desde, hasta)) for (const i of cuadro(p, tamanio)) celdas.add(i);
  return [...celdas];
}

function* linea(desde: Punto, hasta: Punto): Generator<Punto> {
  let { x, y } = desde;
  const dx = Math.abs(hasta.x - x);
  const dy = Math.abs(hasta.y - y);
  const pasoX = x < hasta.x ? 1 : -1;
  const pasoY = y < hasta.y ? 1 : -1;
  let error = dx - dy;
  for (;;) {
    yield { x, y };
    if (x === hasta.x && y === hasta.y) return;
    const doble = error * 2;
    if (doble > -dy) {
      error -= dy;
      x += pasoX;
    }
    if (doble < dx) {
      error += dx;
      y += pasoY;
    }
  }
}

/** El cuadrado del pincel, centrado en la celda, recortado contra los bordes del mapa. */
function cuadro(centro: Punto, tamanio: number): number[] {
  const radio = Math.floor(Math.max(1, tamanio) / 2);
  const celdas: number[] = [];
  for (let y = centro.y - radio; y <= centro.y + radio; y++) {
    for (let x = centro.x - radio; x <= centro.x + radio; x++) {
      if (Mapa.dentro(x, y)) celdas.push(Mapa.indice(x, y));
    }
  }
  return celdas;
}

function rectangulo(desde: Punto, hasta: Punto): number[] {
  const x1 = Math.max(1, Math.min(desde.x, hasta.x));
  const x2 = Math.min(ANCHO, Math.max(desde.x, hasta.x));
  const y1 = Math.max(1, Math.min(desde.y, hasta.y));
  const y2 = Math.min(ALTO, Math.max(desde.y, hasta.y));
  const celdas: number[] = [];
  for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) celdas.push(Mapa.indice(x, y));
  return celdas;
}

/**
 * Las celdas pegadas a la del clic que tienen el mismo gráfico en esa capa.
 *
 * Se camina en cuatro direcciones con una pila propia: en el peor caso son las 10.000 celdas del
 * mapa, y hacerlo con recursión reventaría la pila del navegador.
 */
function contiguas(mapa: Mapa, origen: Punto, capa: number): number[] {
  if (!Mapa.dentro(origen.x, origen.y)) return [];
  const buscado = mapa.grafico(origen.x, origen.y, capa);
  const vistas = new Uint8Array(ANCHO * ALTO);
  const pendientes = [origen];
  const celdas: number[] = [];
  vistas[Mapa.indice(origen.x, origen.y)] = 1;
  while (pendientes.length) {
    const { x, y } = pendientes.pop()!;
    celdas.push(Mapa.indice(x, y));
    for (const [vx, vy] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ] as const) {
      if (!Mapa.dentro(vx, vy)) continue;
      const i = Mapa.indice(vx, vy);
      if (vistas[i]) continue;
      if (mapa.grafico(vx, vy, capa) !== buscado) continue;
      vistas[i] = 1;
      pendientes.push({ x: vx, y: vy });
    }
  }
  return celdas;
}

// ---------- qué cambios ----------

/** Pone el gráfico, salteando las celdas que ya lo tenían: ésas no son un cambio. */
function graficos(mapa: Mapa, celdas: number[], capa: number, grh: number): Cambio[] {
  const cambios: Cambio[] = [];
  for (const indice of celdas) {
    const x = (indice % ANCHO) + 1;
    const y = Math.floor(indice / ANCHO) + 1;
    const antes = mapa.grafico(x, y, capa);
    if (antes === grh) continue;
    cambios.push({ tipo: "grafico", indice, capa, antes, despues: grh });
  }
  return cambios;
}

function triggers(mapa: Mapa, celdas: number[], valor: number): Cambio[] {
  const cambios: Cambio[] = [];
  for (const indice of celdas) {
    const x = (indice % ANCHO) + 1;
    const y = Math.floor(indice / ANCHO) + 1;
    const antes = mapa.trigger(x, y);
    if (antes === valor) continue;
    cambios.push({ tipo: "trigger", indice, antes, despues: valor });
  }
  return cambios;
}

/* Un traslado es de una celda sola: una puerta son una o dos, y pintarlos con pincel dejaría
 * decenas de salidas al mismo lugar sin que nadie las pidiera. */
function traslados(mapa: Mapa, donde: Punto, destino: Traslado | null): Cambio[] {
  if (!Mapa.dentro(donde.x, donde.y)) return [];
  const antes = mapa.traslado(donde.x, donde.y);
  if (mismoTraslado(antes, destino)) return [];
  return [{ tipo: "traslado", indice: Mapa.indice(donde.x, donde.y), antes, despues: destino ? { ...destino } : null }];
}

/* NPCs y objetos también son de a una celda: cada uno es una criatura o una pila puntual, no
 * una textura que se pinte por áreas. */
function npcs(mapa: Mapa, donde: Punto, numero: number): Cambio[] {
  if (!Mapa.dentro(donde.x, donde.y)) return [];
  const antes = mapa.npc(donde.x, donde.y);
  if (antes === numero) return [];
  return [{ tipo: "npc", indice: Mapa.indice(donde.x, donde.y), antes, despues: numero }];
}

function objetos(mapa: Mapa, donde: Punto, objeto: ObjetoEnElSuelo | null): Cambio[] {
  if (!Mapa.dentro(donde.x, donde.y)) return [];
  const antes = mapa.objeto(donde.x, donde.y);
  if (mismoObjeto(antes, objeto)) return [];
  return [{ tipo: "objeto", indice: Mapa.indice(donde.x, donde.y), antes, despues: objeto ? { ...objeto } : null }];
}

function mismoObjeto(a: ObjetoEnElSuelo | null, b: ObjetoEnElSuelo | null): boolean {
  if (!a || !b) return a === b;
  return a.objeto === b.objeto && a.cantidad === b.cantidad;
}

function mismoTraslado(a: Traslado | null, b: Traslado | null): boolean {
  if (!a || !b) return a === b;
  return a.mapa === b.mapa && a.x === b.x && a.y === b.y;
}

function bloqueos(mapa: Mapa, celdas: number[], valor: boolean): Cambio[] {
  const cambios: Cambio[] = [];
  for (const indice of celdas) {
    const x = (indice % ANCHO) + 1;
    const y = Math.floor(indice / ANCHO) + 1;
    const antes = mapa.bloqueada(x, y);
    if (antes === valor) continue;
    cambios.push({ tipo: "bloqueo", indice, antes, despues: valor });
  }
  return cambios;
}
