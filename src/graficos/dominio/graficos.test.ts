import { describe, expect, it } from "vitest";
import { Animacion } from "./Animacion";
import { Frame } from "./Frame";
import { Grilla } from "./Grilla";
import { HojaDeSprites } from "./HojaDeSprites";
import { Tamanio } from "./Tamanio";

const f = (x: number, y: number, w = 32, h = 48, ms: number | null = null) => Frame.deCoordenadas(x, y, w, h, ms);

describe("Animacion", () => {
  it("es inmutable: cada cambio devuelve una animación nueva", () => {
    const a = Animacion.crear("a1", "caminar sur");
    const b = a.conFramesAgregados([f(0, 0)]);
    expect(a.cantidadDeFrames).toBe(0);
    expect(b.cantidadDeFrames).toBe(1);
    expect(a.nombre).toBe("caminar_sur");
  });

  it("arma ida y vuelta sin repetir los extremos", () => {
    const a = Animacion.crear("a", "x").conFramesAgregados([f(0, 0), f(32, 0), f(64, 0), f(96, 0)]).conIdaYVuelta();
    expect(a.frames.map((x) => x.rect.x)).toEqual([0, 32, 64, 96, 64, 32]);
  });

  it("calcula qué frame se ve en cada momento, con duraciones propias", () => {
    const a = Animacion.crear("a", "x").conMsPorFrame(100).conFramesAgregados([f(0, 0), f(32, 0, 32, 48, 300), f(64, 0)]);
    expect(a.duracionDelCiclo()).toBe(500);
    expect(a.indiceEnTiempo(50)).toBe(0);
    expect(a.indiceEnTiempo(150)).toBe(1);
    expect(a.indiceEnTiempo(399)).toBe(1);
    expect(a.indiceEnTiempo(450)).toBe(2);
    expect(a.indiceEnTiempo(550)).toBe(0); // en bucle
    expect(a.conBucle(false).indiceEnTiempo(9999)).toBe(2);
  });

  it("mueve un grupo de frames sin sacarlo de la imagen", () => {
    const a = Animacion.crear("a", "x").conFramesAgregados([f(0, 0), f(32, 0), f(160, 0)]);
    const r = a.conFramesDesplazados([0, 1], -50, 10, Tamanio.crear(192, 192));
    expect(r.dx).toBe(0); // ya estaban pegados al borde izquierdo
    expect(r.animacion.frames.map((x) => [x.rect.x, x.rect.y])).toEqual([
      [0, 10],
      [32, 10],
      [160, 0],
    ]);
  });
});

describe("Grilla", () => {
  const g = Grilla.crear({ anchoCelda: 32, altoCelda: 48, offsetX: 2, separacionX: 1 });
  const t = Tamanio.crear(200, 100);
  it("encuentra la celda bajo un punto y respeta separaciones", () => {
    expect(g.celdaEn(3, 5, t)?.columna).toBe(0);
    expect(g.celdaEn(2 + 32, 5, t)).toBeNull(); // cae en la separación
    expect(g.celdaEn(2 + 33, 5, t)?.columna).toBe(1);
  });
  it("lista las celdas entre dos (Shift+clic)", () => {
    const a = g.celdaEn(3, 3, t)!,
      b = g.celdaEn(2 + 33 * 3 + 1, 3, t)!;
    expect(g.celdasEntre(a, b, t).map((c) => c.columna)).toEqual([1, 2, 3]);
  });
});

describe("HojaDeSprites", () => {
  it("al redimensionar con contenido, escala frames y grilla", () => {
    let h = HojaDeSprites.crear("h", "cuerpo.png", "a").conImagenNueva(Tamanio.crear(192, 192));
    const a = h.animaciones[0]!.conFramesAgregados([f(32, 48)]);
    h = h.conAnimacion(a).redimensionada(Tamanio.crear(96, 96), true);
    expect(h.animaciones[0]!.frames[0]!.rect).toMatchObject({ x: 16, y: 24, ancho: 16, alto: 24 });
    expect(h.grilla.anchoCelda).toBe(16);
    expect(h.fueRedimensionada).toBe(true);
  });

  it("al importar, actualiza por nombre conservando el id (los vínculos no se rompen)", () => {
    const h = HojaDeSprites.crear("h", "x.png", "a1");
    const original = h.animaciones[0]!;
    const importada = Animacion.crear("otro-id", "animacion_1").conFramesAgregados([f(0, 0)]);
    const r = h.conAnimacionesImportadas([importada, Animacion.crear("a2", "nueva")]);
    expect(r.animaciones.map((a) => a.id)).toEqual([original.id, "a2"]);
    expect(r.animaciones[0]!.cantidadDeFrames).toBe(1);
  });
});
