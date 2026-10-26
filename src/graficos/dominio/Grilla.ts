import { asegurar } from "@/compartido/dominio/ErrorDeDominio";
import { Rect } from "./Rect";
import type { Tamanio } from "./Tamanio";

export interface DatosGrilla {
  anchoCelda: number;
  altoCelda: number;
  offsetX: number;
  offsetY: number;
  separacionX: number;
  separacionY: number;
}

export interface Celda {
  columna: number;
  fila: number;
  rect: Rect;
}

/**
 * Objeto de valor: cómo está cortada la hoja en celdas iguales.
 * Ancho/alto de celda, margen inicial (offset) y separación entre celdas.
 */
export class Grilla {
  private constructor(
    readonly anchoCelda: number,
    readonly altoCelda: number,
    readonly offsetX: number,
    readonly offsetY: number,
    readonly separacionX: number,
    readonly separacionY: number,
  ) {}

  static crear(d: Pick<DatosGrilla, "anchoCelda" | "altoCelda"> & Partial<DatosGrilla>): Grilla {
    const n = (v: number | undefined, min: number) => Math.max(min, Math.round(Number.isFinite(v) ? (v as number) : min));
    asegurar(Number.isFinite(d.anchoCelda) && Number.isFinite(d.altoCelda), "El tamaño de celda tiene que ser numérico.");
    return new Grilla(n(d.anchoCelda, 1), n(d.altoCelda, 1), n(d.offsetX, 0), n(d.offsetY, 0), n(d.separacionX, 0), n(d.separacionY, 0));
  }

  static porDefecto(): Grilla {
    return Grilla.crear({ anchoCelda: 32, altoCelda: 48 });
  }

  con(cambios: Partial<DatosGrilla>): Grilla {
    return Grilla.crear({
      anchoCelda: cambios.anchoCelda ?? this.anchoCelda,
      altoCelda: cambios.altoCelda ?? this.altoCelda,
      offsetX: cambios.offsetX ?? this.offsetX,
      offsetY: cambios.offsetY ?? this.offsetY,
      separacionX: cambios.separacionX ?? this.separacionX,
      separacionY: cambios.separacionY ?? this.separacionY,
    });
  }

  datos(): DatosGrilla {
    const { anchoCelda, altoCelda, offsetX, offsetY, separacionX, separacionY } = this;
    return { anchoCelda, altoCelda, offsetX, offsetY, separacionX, separacionY };
  }

  get pasoX(): number {
    return this.anchoCelda + this.separacionX;
  }
  get pasoY(): number {
    return this.altoCelda + this.separacionY;
  }

  columnas(t: Tamanio): number {
    return Math.max(0, Math.floor((t.ancho - this.offsetX + this.separacionX) / this.pasoX));
  }
  filas(t: Tamanio): number {
    return Math.max(0, Math.floor((t.alto - this.offsetY + this.separacionY) / this.pasoY));
  }

  rectDe(columna: number, fila: number): Rect {
    return Rect.crear(this.offsetX + columna * this.pasoX, this.offsetY + fila * this.pasoY, this.anchoCelda, this.altoCelda);
  }

  /** La celda que está bajo un punto, o null si el punto cae en una separación o fuera de la imagen. */
  celdaEn(px: number, py: number, t: Tamanio): Celda | null {
    const columna = Math.floor((px - this.offsetX) / this.pasoX);
    const fila = Math.floor((py - this.offsetY) / this.pasoY);
    if (columna < 0 || fila < 0 || columna >= this.columnas(t) || fila >= this.filas(t)) return null;
    const rect = this.rectDe(columna, fila);
    if (!rect.contiene(px, py)) return null;
    return { columna, fila, rect };
  }

  /** Celdas en orden de lectura desde `desde` (sin incluirla) hasta `hasta` (incluida). Sirve para Shift+clic. */
  celdasEntre(desde: Celda, hasta: Celda, t: Tamanio): Celda[] {
    const cols = this.columnas(t);
    if (!cols) return [];
    const i0 = desde.fila * cols + desde.columna,
      i1 = hasta.fila * cols + hasta.columna;
    const paso = i1 >= i0 ? 1 : -1,
      out: Celda[] = [];
    for (let i = i0 + paso; paso > 0 ? i <= i1 : i >= i1; i += paso) {
      const columna = i % cols,
        fila = Math.floor(i / cols);
      out.push({ columna, fila, rect: this.rectDe(columna, fila) });
    }
    return out;
  }

  *todasLasCeldas(t: Tamanio): Generator<Celda> {
    const cols = this.columnas(t),
      filas = this.filas(t);
    for (let fila = 0; fila < filas; fila++)
      for (let columna = 0; columna < cols; columna++) yield { columna, fila, rect: this.rectDe(columna, fila) };
  }

  /** Redondea un desplazamiento a celdas enteras (para "Ajustar a la grilla"). */
  ajustarDesplazamiento(dx: number, dy: number): { dx: number; dy: number } {
    return { dx: Math.round(dx / this.pasoX) * this.pasoX, dy: Math.round(dy / this.pasoY) * this.pasoY };
  }

  escalada(fx: number, fy: number): Grilla {
    return Grilla.crear({
      anchoCelda: this.anchoCelda * fx,
      altoCelda: this.altoCelda * fy,
      offsetX: this.offsetX * fx,
      offsetY: this.offsetY * fy,
      separacionX: this.separacionX * fx,
      separacionY: this.separacionY * fy,
    });
  }
}

/**
 * Limita un desplazamiento para que un grupo (su caja) no salga de la imagen.
 * Si hay paso de grilla, retrocede de a celdas enteras para no perder la alineación.
 */
export function limitarDesplazamiento(
  caja: Rect,
  dx: number,
  dy: number,
  limites: Tamanio,
  paso?: { x: number; y: number },
): { dx: number; dy: number } {
  const ajustar = (v: number, min: number, max: number, p?: number) => {
    if (p && p > 0) {
      while (v < min) v += p;
      while (v > max) v -= p;
    }
    return Math.max(min, Math.min(max, v)) || 0; // `|| 0` evita el -0
  };
  return {
    dx: ajustar(dx, -caja.x, limites.ancho - caja.derecha, paso?.x),
    dy: ajustar(dy, -caja.y, limites.alto - caja.abajo, paso?.y),
  };
}
