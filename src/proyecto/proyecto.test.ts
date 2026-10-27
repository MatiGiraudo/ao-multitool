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
import { Objeto } from "@/objetos/dominio/Objeto";
import { ExportarTodo, type ArchivoExportado } from "./aplicacion/ExportarTodo";
import { RevisarMundo, type MundoParaRevisar } from "./aplicacion/RevisarMundo";

const fabricaDeCatalogo = (hojas: readonly HojaDeSprites[]) => new CatalogoGraficoDesdeHojas(hojas);

/** Una hoja con imagen y una animación llamada como se pida. */
function hojaCon(id: string, nombreArchivo: string, ...animaciones: string[]) {
  let h = HojaDeSprites.crear(id, nombreArchivo, `${id}-a`).conImagenNueva(Tamanio.crear(64, 64));
  h = h.sinAnimacion(`${id}-a`);
  animaciones.forEach((nombre, i) => (h = h.conAnimacionAgregada(Animacion.crear(`${id}-${i}`, nombre))));
  return h;
}

describe("ExportarTodo", () => {
  async function exportar(hojas: HojaDeSprites[]) {
    const repo = new MemoriaHojaRepositorio();
    for (const h of hojas) await repo.guardar(h);
    const catalogos = ["objetos.json", "fx.json", "cuerpos.json", "cabezas.json", "hechizos.json"].map(
      (nombreArchivo) => async (): Promise<ArchivoExportado> => ({ nombreArchivo, contenido: "{}" }),
    );
    return new ExportarTodo(repo, new FormatoAoAnim(), fabricaDeCatalogo, catalogos).ejecutar();
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
});

describe("RevisarMundo", () => {
  const hoja = hojaCon("h1", "cuerpo.png", "caminar_sur");
  const revisor = new RevisarMundo(new MemoriaHojaRepositorio(), {} as never, fabricaDeCatalogo);
  const vacio: MundoParaRevisar = { hojas: [hoja], objetos: [], efectos: [], cuerpos: [], cabezas: [], hechizos: [] };

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
    });
    const familias = Object.fromEntries(r.familias.map((f) => [f.familia, { errores: f.errores, revisadas: f.revisadas }]));
    expect(familias).toMatchObject({
      Gráficos: { errores: 0, revisadas: 1 },
      Objetos: { errores: 1, revisadas: 1 },
      Apariencias: { errores: 0, revisadas: 2 },
      FX: { errores: 1, revisadas: 1 },
      Hechizos: { errores: 1, revisadas: 1 },
    });
    // Los errores van primero, para que lo que rompe la exportación se vea sin buscar.
    expect(r.items[0]!.problemas.some((p) => p.gravedad === "error")).toBe(true);
    expect(r.items.at(-1)!.problemas.every((p) => p.gravedad === "aviso")).toBe(true);
  });
});
