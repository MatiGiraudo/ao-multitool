import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Mapa } from "./dominio/Mapa";
import { FormatoMapaClasico } from "./infraestructura/FormatoMapaClasico";

/**
 * La prueba que de verdad dice si el formato se entendió: tomar los mapas del juego, leerlos,
 * volver a escribirlos y comparar **byte a byte**. Un campo de más, uno de menos o uno con el
 * tamaño equivocado y el archivo sale distinto.
 *
 * No se puede correr siempre porque esos archivos no son del proyecto. Apuntá `AO_MAPAS_DIR` a
 * una carpeta de mapas y el test se enciende solo:
 *
 *     AO_MAPAS_DIR="C:/.../Mundos/Alkon" npm test
 */
const CARPETA = process.env.AO_MAPAS_DIR;

describe.skipIf(!CARPETA)("mapas reales del juego", () => {
  const formato = new FormatoMapaClasico();
  // `skipIf` saltea los tests, pero el cuerpo del describe se ejecuta igual: sin carpeta, vacío.
  const carpeta = CARPETA ?? "";
  const nombres = carpeta ? readdirSync(carpeta).filter((n) => n.toLowerCase().endsWith(".map")) : [];

  it("hay mapas para revisar", () => {
    expect(nombres.length).toBeGreaterThan(0);
  });

  it("todos se leen y se vuelven a escribir idénticos", () => {
    const distintos: string[] = [];
    const anchos = new Map<number, number>();
    let celdas = 0;

    for (const nombre of nombres) {
      const base = join(carpeta, nombre.slice(0, -4));
      const numero = Number(nombre.replace(/[^0-9]/g, "")) || 1;
      const map = aBuffer(readFileSync(`${base}.map`));
      const inf = aBuffer(readFileSync(`${base}.inf`));

      const { mapa, ancho } = formato.leer(numero, map, inf);
      anchos.set(ancho, (anchos.get(ancho) ?? 0) + 1);
      celdas += mapa.contar().graficos;

      const escrito = formato.escribir(mapa, ancho);
      if (Buffer.compare(Buffer.from(escrito.map), Buffer.from(new Uint8Array(map))) !== 0) distintos.push(`${nombre} (.map)`);
      if (Buffer.compare(Buffer.from(escrito.inf), Buffer.from(new Uint8Array(inf))) !== 0) distintos.push(`${nombre} (.inf)`);
    }

    expect({ distintos: distintos.slice(0, 10), cuantos: distintos.length }).toEqual({ distintos: [], cuantos: 0 });
    expect(celdas).toBeGreaterThan(0);
    console.log(`  ${nombres.length} mapas · anchos de gráfico usados: ${[...anchos].map(([a, n]) => `${a} bytes ×${n}`).join(", ")}`);
    // Son 317 mapas leídos y reescritos: con el disco frío no entra en los 5 segundos de siempre.
  }, 120_000);

  it("el .dat se lee cuando está al lado", () => {
    const conDat = nombres.find((n) => {
      try {
        readFileSync(join(carpeta, n.slice(0, -4) + ".dat"));
        return true;
      } catch {
        return false;
      }
    });
    if (!conDat) return;
    const numero = Number(conDat.replace(/[^0-9]/g, "")) || 1;
    const info = formato.leerDat(numero, readFileSync(join(carpeta, conDat.slice(0, -4) + ".dat"), "latin1"));
    expect(info.nombre).toBeTruthy();
    expect(typeof info.seCombate).toBe("boolean");
  });

  it("las coordenadas del juego arrancan en 1 y llegan a 100", () => {
    const base = join(carpeta, nombres[0]!.slice(0, -4));
    const { mapa } = formato.leer(1, aBuffer(readFileSync(`${base}.map`)), aBuffer(readFileSync(`${base}.inf`)));
    expect(() => mapa.grafico(1, 1, 1)).not.toThrow();
    expect(() => mapa.grafico(100, 100, 1)).not.toThrow();
    expect(() => mapa.grafico(101, 1, 1)).toThrow();
    expect(Mapa.indice(100, 100)).toBe(9999);
  });
});

/** `readFileSync` devuelve un Buffer que puede compartir memoria con otros: hay que recortarlo. */
function aBuffer(b: Buffer): ArrayBuffer {
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}
