import { asegurar } from "@/compartido/dominio/ErrorDeDominio";

/**
 * Objeto de valor: un rectángulo dentro de una imagen, con origen arriba a la izquierda.
 * Siempre en píxeles enteros, nunca negativo, nunca de tamaño 0.
 */
export class Rect {
  private constructor(
    readonly x: number,
    readonly y: number,
    readonly ancho: number,
    readonly alto: number,
  ) {}

  static crear(x: number, y: number, ancho: number, alto: number): Rect {
    asegurar([x, y, ancho, alto].every(Number.isFinite), "Las coordenadas del recuadro tienen que ser numéricas.");
    return new Rect(
      Math.max(0, Math.round(x)),
      Math.max(0, Math.round(y)),
      Math.max(1, Math.round(ancho)),
      Math.max(1, Math.round(alto)),
    );
  }

  /** Rectángulo que va de un punto a otro, sin importar en qué dirección se arrastró. */
  static entrePuntos(x0: number, y0: number, x1: number, y1: number): Rect {
    return Rect.crear(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
  }

  con(cambios: Partial<{ x: number; y: number; ancho: number; alto: number }>): Rect {
    return Rect.crear(cambios.x ?? this.x, cambios.y ?? this.y, cambios.ancho ?? this.ancho, cambios.alto ?? this.alto);
  }

  desplazado(dx: number, dy: number): Rect {
    return Rect.crear(this.x + dx, this.y + dy, this.ancho, this.alto);
  }

  escalado(fx: number, fy: number): Rect {
    asegurar(fx > 0 && fy > 0, "La escala tiene que ser positiva.");
    return Rect.crear(this.x * fx, this.y * fy, this.ancho * fx, this.alto * fy);
  }

  contiene(px: number, py: number): boolean {
    return px >= this.x && px < this.x + this.ancho && py >= this.y && py < this.y + this.alto;
  }

  seCruzaCon(o: Rect): boolean {
    return this.x < o.x + o.ancho && this.x + this.ancho > o.x && this.y < o.y + o.alto && this.y + this.alto > o.y;
  }

  get derecha(): number {
    return this.x + this.ancho;
  }
  get abajo(): number {
    return this.y + this.alto;
  }

  igualA(o: Rect): boolean {
    return this.x === o.x && this.y === o.y && this.ancho === o.ancho && this.alto === o.alto;
  }

  /** La caja mínima que encierra a todos los rectángulos. */
  static cajaDe(rects: readonly Rect[]): Rect | null {
    if (!rects.length) return null;
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (const r of rects) {
      x0 = Math.min(x0, r.x);
      y0 = Math.min(y0, r.y);
      x1 = Math.max(x1, r.derecha);
      y1 = Math.max(y1, r.abajo);
    }
    return Rect.crear(x0, y0, x1 - x0, y1 - y0);
  }
}
