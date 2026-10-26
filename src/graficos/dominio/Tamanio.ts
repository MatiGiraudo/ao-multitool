import { asegurar } from "@/compartido/dominio/ErrorDeDominio";

/** Objeto de valor: el tamaño en píxeles de una imagen. Inmutable y comparable por valor. */
export class Tamanio {
  private constructor(
    readonly ancho: number,
    readonly alto: number,
  ) {}

  static crear(ancho: number, alto: number): Tamanio {
    asegurar(Number.isFinite(ancho) && Number.isFinite(alto), "El tamaño tiene que ser numérico.");
    const a = Math.round(ancho),
      h = Math.round(alto);
    asegurar(a >= 1 && h >= 1, "El ancho y el alto tienen que ser de al menos 1 px.");
    asegurar(a <= 8192 && h <= 8192, "Máximo 8192 px por lado.");
    return new Tamanio(a, h);
  }

  igualA(otro: Tamanio | null | undefined): boolean {
    return !!otro && otro.ancho === this.ancho && otro.alto === this.alto;
  }

  toString(): string {
    return `${this.ancho}×${this.alto}`;
  }
}
