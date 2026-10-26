import { asegurar } from "@/compartido/dominio/ErrorDeDominio";
import { Rect } from "./Rect";

/**
 * Objeto de valor: un cuadro de la animación. Es un recorte de la hoja
 * y, opcionalmente, una duración propia que pisa la de la animación.
 */
export class Frame {
  private constructor(
    readonly rect: Rect,
    readonly duracionMs: number | null,
  ) {}

  static crear(rect: Rect, duracionMs: number | null = null): Frame {
    if (duracionMs !== null) {
      asegurar(Number.isFinite(duracionMs), "La duración tiene que ser numérica.");
      asegurar(duracionMs >= 1, "La duración de un frame tiene que ser de al menos 1 ms.");
    }
    return new Frame(rect, duracionMs === null ? null : Math.round(duracionMs));
  }

  static deCoordenadas(x: number, y: number, ancho: number, alto: number, duracionMs: number | null = null): Frame {
    return Frame.crear(Rect.crear(x, y, ancho, alto), duracionMs);
  }

  conRect(rect: Rect): Frame {
    return new Frame(rect, this.duracionMs);
  }

  conDuracion(ms: number | null): Frame {
    return Frame.crear(this.rect, ms);
  }

  desplazado(dx: number, dy: number): Frame {
    return this.conRect(this.rect.desplazado(dx, dy));
  }

  escalado(fx: number, fy: number): Frame {
    return this.conRect(this.rect.escalado(fx, fy));
  }
}
