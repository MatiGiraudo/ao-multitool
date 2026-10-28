import { describe, expect, it } from "vitest";
import { Referencia } from "@/compartido/dominio/ReferenciaGrafica";
import { Cabeza } from "@/apariencias/dominio/Cabeza";
import { Cuerpo } from "@/apariencias/dominio/Cuerpo";
import { Efecto } from "@/fx/dominio/Efecto";
import { Animacion } from "@/graficos/dominio/Animacion";
import { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import { Tamanio } from "@/graficos/dominio/Tamanio";
import { FormatoAoAnim } from "@/graficos/infraestructura/FormatoAoAnim";
import { CatalogoGraficoDesdeHojas } from "@/graficos/infraestructura/CatalogoGraficoDesdeHojas";
import { MemoriaHojaRepositorio } from "@/graficos/infraestructura/memoria";
import { Hechizo } from "@/hechizos/dominio/Hechizo";
import { Mapa } from "@/mapas/dominio/Mapa";
import { Npc } from "@/npcs/dominio/Npc";
import { Objeto } from "@/objetos/dominio/Objeto";
import { ExportarTodo, type ArchivoExportado } from "./aplicacion/ExportarTodo";
import { RevisarMundo, type MundoParaRevisar } from "./aplicacion/RevisarMundo";
import { ArchivoExportadoMapper } from "./infraestructura/ArchivoExportadoDto";

const fabricaDeCatalogo = (hojas: readonly HojaDeSprites[]) => new CatalogoGraficoDesdeHojas(hojas);

/** Una hoja con imagen y una animación llamada como se pida. */
function hojaCon(id: string, nombreArchivo: string, ...animaciones: string[]) {
  let h = HojaDeSprites.crear(id, nombreArchivo, `${id}-a`).conImagenNueva(Tamanio.crear(64, 64));
  h = h.sinAnimacion(`${id}-a`);
  animaciones.forEach((nombre, i) => (h = h.conAnimacionAgregada(Animacion.crear(`${id}-${i}`, nombre))));
  return h;
}

describe("ExportarTodo", () => {
  async function exportar(hojas: HojaDeSprites[], varios: (() => Promise<ArchivoExportado[]>)[] = []) {
    const repo = new MemoriaHojaRepositorio();
    for (const h of hojas) await repo.guardar(h);
    const catalogos = ["objetos.json", "fx.json", "cuerpos.json", "cabezas.json", "hechizos.json"].map(
      (nombreArchivo) => async (): Promise<ArchivoExportado> => ({ nombreArchivo, contenido: "{}" }),
    );
    return new ExportarTodo(repo, new FormatoAoAnim(), fabricaDeCatalogo, catalogos, varios).ejecutar();
  }

  it("junta los cinco catálogos y un .anim.json por hoja con animaciones", async () => {
    const archivos = await exportar([hojaCon("h1", "cuerpo.png", "caminar_sur"), hojaCon("h2", "iconos.png", "icono_daga")]);
    expect(archivos.map((a) => a.nombreArchivo)).toEqual([
      "cabezas.json",
      "cuerpo.anim.json",
      "cuerpos.json",
      "fx.json",
      "hechizos.json",
      "iconos.anim.json",
      "objetos.json",
    ]);
  });

  it("saltea las hojas sin animaciones, que después de importar los gráficos son miles", async () => {
    const vacia = HojaDeSprites.crear("h3", "905.png", "x").sinAnimacion("x");
    const archivos = await exportar([hojaCon("h1", "cuerpo.png", "caminar_sur"), vacia]);
    expect(archivos.some((a) => a.nombreArchivo === "905.anim.json")).toBe(false);
    expect(archivos).toHaveLength(6);
  });

  it("suma el mundo: los archivos de cada mapa y el Graficos.ini", async () => {
    const mundo = async (): Promise<ArchivoExportado[]> => [
      { nombreArchivo: "Mapa1.map", contenido: new Uint8Array([1, 2, 3]), carpeta: "Mundos" },
      { nombreArchivo: "Mapa1.dat", contenido: "[MAPA1]", carpeta: "Mundos" },
    ];
    const graficos = async (): Promise<ArchivoExportado[]> => [{ nombreArchivo: "Graficos.ini", contenido: "[Graphics]" }];

    const archivos = await exportar([hojaCon("h1", "cuerpo.png", "caminar_sur")], [mundo, graficos]);

    // Primero lo que va suelto, por nombre, y después cada subcarpeta junta.
    expect(archivos.map((a) => `${a.carpeta ?? ""}/${a.nombreArchivo}`)).toEqual([
      "/cabezas.json",
      "/cuerpo.anim.json",
      "/cuerpos.json",
      "/fx.json",
      "/Graficos.ini",
      "/hechizos.json",
      "/objetos.json",
      "Mundos/Mapa1.dat",
      "Mundos/Mapa1.map",
    ]);
  });

  it("un mundo sin mapas exporta los catálogos igual", async () => {
    const archivos = await exportar([], [async () => [], async () => []]);
    expect(archivos).toHaveLength(5);
  });
});

describe("ArchivoExportado por HTTP", () => {
  it("los bytes de un mapa cruzan enteros", () => {
    // Todos los valores de un byte, que es donde se nota si la codificación rompe algo.
    const bytes = new Uint8Array(256).map((_, i) => i);
    const archivo: ArchivoExportado = { nombreArchivo: "Mapa1.map", contenido: bytes, carpeta: "Mundos" };

    const dto = ArchivoExportadoMapper.aDto(archivo);
    expect(dto.binario).toBe(true);
    const vuelta = ArchivoExportadoMapper.aDominio(dto);

    expect(vuelta.contenido).toBeInstanceOf(Uint8Array);
    expect([...(vuelta.contenido as Uint8Array)]).toEqual([...bytes]);
    expect(vuelta.carpeta).toBe("Mundos");
  });

  it("el texto no se codifica, para que el JSON se siga leyendo", () => {
    const dto = ArchivoExportadoMapper.aDto({ nombreArchivo: "objetos.json", contenido: '{"a":1}' });
    expect(dto).toEqual({ nombreArchivo: "objetos.json", contenido: '{"a":1}' });
    expect(ArchivoExportadoMapper.aDominio(dto).contenido).toBe('{"a":1}');
  });

  it("rechaza lo que no tiene nombre y contenido", () => {
    expect(ArchivoExportadoMapper.esValido({ nombreArchivo: "a", contenido: "b" })).toBe(true);
    expect(ArchivoExportadoMapper.esValido({ nombreArchivo: "a" })).toBe(false);
    expect(ArchivoExportadoMapper.esValido(null)).toBe(false);
  });
});

describe("RevisarMundo", () => {
  const hoja = hojaCon("h1", "cuerpo.png", "caminar_sur");
  const revisor = new RevisarMundo(new MemoriaHojaRepositorio(), {} as never, fabricaDeCatalogo);
  const vacio: MundoParaRevisar = { hojas: [hoja], objetos: [], efectos: [], cuerpos: [], cabezas: [], hechizos: [], npcs: [], mapas: [], grhConocidos: [] };

  const pergamino = (numero: number, hechizo: number | null) => {
    let o = Objeto.crear(`p${numero}`, numero).renombrado("Pergamino").conTipo("pergamino");
    o = o.conIcono(Referencia.vinculada("h1", "h1-0"));
    return hechizo === null ? o : o.conAtributo("hechizo", hechizo);
  };

  it("un mundo sano no tiene nada que decir", () => {
    const r = revisor.revisar(vacio);
    expect(r.errores).toBe(0);
    expect(r.avisos).toBe(0);
    expect(r.items).toEqual([]);
    expect(r.revisadas).toBe(1);
  });

  it("ve el pergamino que apunta a un hechizo que no existe: el cruce que ningún módulo puede hacer", () => {
    const r = revisor.revisar({ ...vacio, objetos: [pergamino(1, 77)], hechizos: [Hechizo.crear("h", 5).renombrado("Dardo")] });
    const mensajes = r.items.flatMap((i) => i.problemas.map((p) => p.mensaje));
    expect(mensajes).toContain("Apunta al hechizo 77, que no existe");
    expect(r.errores).toBe(1);
    expect(r.items[0]!.familia).toBe("Objetos");
    expect(r.items[0]!.href).toBe("/objetos");
  });

  it("si el hechizo existe, no se queja; si no hay ninguno, avisa", () => {
    const conHechizo = Hechizo.crear("h", 77).renombrado("Dardo").conPalabrasMagicas("OHL").conMana(5).conTipo("resucitar");
    expect(revisor.revisar({ ...vacio, objetos: [pergamino(1, 77)], hechizos: [conHechizo] }).errores).toBe(0);
    const sinNumero = revisor.revisar({ ...vacio, objetos: [pergamino(1, null)] });
    expect(sinNumero.items.flatMap((i) => i.problemas.map((p) => p.mensaje))).toContain("Pergamino sin hechizo");
    expect(sinNumero.errores).toBe(0);
  });

  it("ve el mapa que pone un NPC que no existe: el otro gran cruce", () => {
    const mapa = Mapa.vacio(1, { nombre: "Ullathorpe" });
    mapa.ponerGrafico(10, 10, 1, 1000);
    mapa.ponerNpc(10, 10, 999);
    mapa.ponerTraslado(5, 5, { mapa: 77, x: 50, y: 50 });

    const r = revisor.revisar({ ...vacio, mapas: [{ mapa, anchoDeGrafico: 4, nombreArchivo: "Mapa1" }] });

    const mapas = r.items.find((i) => i.familia === "Mapas")!;
    expect(mapas.etiqueta).toBe("#1 Ullathorpe");
    expect(mapas.href).toBe("/mapas");
    expect(mapas.problemas.map((p) => p.mensaje)).toEqual([
      "Traslados a mapas que no están en el proyecto: 77",
      "NPCs que no existen: 999",
    ]);
    expect(r.familias.find((f) => f.familia === "Mapas")).toMatchObject({ revisadas: 1, errores: 2, avisos: 0 });
  });

  it("un mapa que apunta a lo que sí existe no molesta", () => {
    const mapa = Mapa.vacio(1, { nombre: "Ullathorpe" });
    mapa.ponerGrafico(10, 10, 1, 1000);
    mapa.ponerNpc(10, 10, 25);
    const npc = Npc.crear("n1", 25).renombrado("Lobo");
    const r = revisor.revisar({ ...vacio, npcs: [npc], mapas: [{ mapa, anchoDeGrafico: 4, nombreArchivo: "Mapa1" }] });
    expect(r.items.some((i) => i.familia === "Mapas")).toBe(false);
  });

  it("marca como error los nombres de animación repetidos, porque el JSON los referencia por nombre", () => {
    const repetida = hojaCon("h9", "doble.png", "caminar_sur", "caminar_sur");
    const r = revisor.revisar({ ...vacio, hojas: [repetida] });
    expect(r.items[0]!.problemas[0]).toEqual({ gravedad: "error", mensaje: "Animaciones con el mismo nombre: caminar_sur" });
  });

  it("avisa de la hoja sin imagen", () => {
    const sinImagen = HojaDeSprites.crear("h8", "falta.png", "x").sinAnimacion("x");
    const r = revisor.revisar({ ...vacio, hojas: [sinImagen] });
    expect(r.items[0]!.problemas).toEqual([{ gravedad: "aviso", mensaje: "Sin imagen cargada" }]);
    expect(r.avisos).toBe(1);
  });

  it("junta lo de cada módulo y cuenta por familia", () => {
    const r = revisor.revisar({
      ...vacio,
      objetos: [pergamino(1, 77)],
      efectos: [Efecto.crear("e", 1).conAnimacion(Referencia.vinculada("h1", "no-existe"))],
      cuerpos: [Cuerpo.crear("c", 1)],
      cabezas: [Cabeza.crear("k", 1)],
      hechizos: [Hechizo.crear("h", 1).conFx(99)],
      npcs: [Npc.crear("n", 1).conCuerpo(404)],
    });
    const familias = Object.fromEntries(r.familias.map((f) => [f.familia, { errores: f.errores, revisadas: f.revisadas }]));
    expect(familias).toMatchObject({
      Gráficos: { errores: 0, revisadas: 1 },
      Objetos: { errores: 1, revisadas: 1 },
      Apariencias: { errores: 0, revisadas: 2 },
      FX: { errores: 1, revisadas: 1 },
      Hechizos: { errores: 1, revisadas: 1 },
      // El NPC apunta a un cuerpo que no está: el cruce que más se va a usar.
      NPCs: { errores: 1, revisadas: 1 },
    });
    // Los errores van primero, para que lo que rompe la exportación se vea sin buscar.
    expect(r.items[0]!.problemas.some((p) => p.gravedad === "error")).toBe(true);
    expect(r.items.at(-1)!.problemas.every((p) => p.gravedad === "aviso")).toBe(true);
  });
});
