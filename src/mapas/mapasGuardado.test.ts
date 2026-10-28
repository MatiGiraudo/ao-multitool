import { describe, expect, it } from "vitest";
import { ExportarMapasAlJuego, LeerTodosLosMapas } from "./aplicacion/casosDeUso";
import { ALTO, ANCHO, Mapa } from "./dominio/Mapa";
import type { MapaGuardado } from "./dominio/MapaRepositorio";
import { FormatoMapaClasico } from "./infraestructura/FormatoMapaClasico";
import { MemoriaMapaRepositorio } from "./infraestructura/memoria";
import { comprimir, descomprimir, MapaMapper } from "./infraestructura/MapaDto";

/** Un mapa con una celda de cada cosa, igual que el del formato clásico. */
function guardado(): MapaGuardado {
  const mapa = Mapa.vacio(120, { nombre: "Pueblo nuevo", zona: "CIUDAD", terreno: "NIEVE", seCombate: false, musicaMp3: 7 });
  for (let y = 1; y <= ALTO; y++) for (let x = 1; x <= ANCHO; x++) mapa.ponerGrafico(x, y, 1, 1000);
  mapa.ponerGrafico(5, 5, 2, 2500);
  mapa.ponerGrafico(5, 5, 4, 4500);
  mapa.bloquear(5, 6, true);
  mapa.ponerTrigger(5, 7, 4);
  mapa.ponerParticula(5, 8, 12);
  mapa.ponerTraslado(5, 9, { mapa: 9, x: 60, y: 61 });
  mapa.ponerNpc(5, 10, 25);
  mapa.ponerObjeto(5, 11, { objeto: 12, cantidad: 100 });
  return { mapa, anchoDeGrafico: 4, nombreArchivo: "Mapa120" };
}

describe("comprimir por repetición", () => {
  it("va y vuelve", () => {
    const valores = [1, 1, 1, 0, 0, 7];
    expect(comprimir(valores)).toEqual([1, 3, 0, 2, 7, 1]);
    expect(descomprimir(comprimir(valores), valores.length)).toEqual(valores);
  });

  it("una tirada pareja queda en dos números", () => {
    const piso = new Int32Array(10_000).fill(1000);
    expect(comprimir(piso)).toEqual([1000, 10_000]);
  });

  it("completa con ceros si el archivo viene corto", () => {
    expect(descomprimir([5, 2], 5)).toEqual([5, 5, 0, 0, 0]);
  });
});

describe("MapaDto", () => {
  it("guardar y volver a leer deja el mapa igual", () => {
    const original = guardado();

    const vuelta = MapaMapper.aDominio(JSON.parse(JSON.stringify(MapaMapper.aDto(original))));
    const m = vuelta.mapa;

    expect(vuelta.nombreArchivo).toBe("Mapa120");
    expect(vuelta.anchoDeGrafico).toBe(4);
    expect(m.numero).toBe(120);
    expect(m.info).toMatchObject({ nombre: "Pueblo nuevo", zona: "CIUDAD", terreno: "NIEVE", seCombate: false, musicaMp3: 7 });
    expect(m.grafico(50, 50, 1)).toBe(1000);
    expect(m.grafico(5, 5, 2)).toBe(2500);
    expect(m.grafico(5, 5, 4)).toBe(4500);
    expect(m.bloqueada(5, 6)).toBe(true);
    expect(m.trigger(5, 7)).toBe(4);
    expect(m.particula(5, 8)).toBe(12);
    expect(m.traslado(5, 9)).toEqual({ mapa: 9, x: 60, y: 61 });
    expect(m.npc(5, 10)).toBe(25);
    expect(m.objeto(5, 11)).toEqual({ objeto: 12, cantidad: 100 });
    expect(m.contar()).toMatchObject(original.mapa.contar());
  });

  it("el archivo de un mapa con el piso parejo es chico", () => {
    // Lo que justifica comprimir: sin esto son 40.000 números sueltos y varios megas.
    const json = JSON.stringify(MapaMapper.aDto(guardado()));
    expect(json.length).toBeLessThan(2_000);
  });

  it("el resumen no necesita leer las celdas", () => {
    expect(MapaMapper.resumen(MapaMapper.aDto(guardado()))).toEqual({ numero: 120, nombre: "Pueblo nuevo", nombreArchivo: "Mapa120" });
  });

  it("una capa que nadie usó no ocupa casi nada", () => {
    const dto = MapaMapper.aDto(guardado());
    expect(dto.capas[2]).toEqual([0, 10_000]);
  });
});

describe("ExportarMapasAlJuego", () => {
  async function conDosMapas() {
    const repo = new MemoriaMapaRepositorio();
    await repo.guardar(guardado());
    const otro = guardado();
    await repo.guardar({ ...otro, mapa: otro.mapa.conNumero(7), nombreArchivo: "Mapa7" });
    return repo;
  }

  it("da los tres archivos de cada mapa, en la carpeta que espera el juego", async () => {
    const archivos = await new ExportarMapasAlJuego(new LeerTodosLosMapas(await conDosMapas())).ejecutar();

    expect(archivos.map((a) => `${a.carpeta}/${a.nombreArchivo}`)).toEqual([
      "Mundos/Mapa7.map",
      "Mundos/Mapa7.inf",
      "Mundos/Mapa7.dat",
      "Mundos/Mapa120.map",
      "Mundos/Mapa120.inf",
      "Mundos/Mapa120.dat",
    ]);
    // Los binarios salen como bytes: escribirlos como texto los rompería.
    expect(archivos[0]!.contenido).toBeInstanceOf(Uint8Array);
    expect(typeof archivos[2]!.contenido).toBe("string");
  });

  it("lo que exporta es un mapa que se puede volver a leer", async () => {
    const repo = new MemoriaMapaRepositorio();
    await repo.guardar(guardado());

    const archivos = await new ExportarMapasAlJuego(new LeerTodosLosMapas(repo)).ejecutar();
    const map = archivos.find((a) => a.nombreArchivo.endsWith(".map"))!.contenido as Uint8Array;
    const inf = archivos.find((a) => a.nombreArchivo.endsWith(".inf"))!.contenido as Uint8Array;
    const dat = archivos.find((a) => a.nombreArchivo.endsWith(".dat"))!.contenido as string;

    const { mapa } = new FormatoMapaClasico().leer(120, aBuffer(map), aBuffer(inf), dat);
    expect(mapa.grafico(5, 5, 2)).toBe(2500);
    expect(mapa.bloqueada(5, 6)).toBe(true);
    expect(mapa.traslado(5, 9)).toEqual({ mapa: 9, x: 60, y: 61 });
    expect(mapa.npc(5, 10)).toBe(25);
    expect(mapa.objeto(5, 11)).toEqual({ objeto: 12, cantidad: 100 });
    expect(mapa.info.nombre).toBe("Pueblo nuevo");
    expect(mapa.info.seCombate).toBe(false);
  });

  it("sin mapas guardados no exporta nada, y eso no es un error", async () => {
    expect(await new ExportarMapasAlJuego(new LeerTodosLosMapas(new MemoriaMapaRepositorio())).ejecutar()).toEqual([]);
  });
});

/** El `.map` sale como `Uint8Array` y el lector pide un `ArrayBuffer` del tamaño justo. */
function aBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
