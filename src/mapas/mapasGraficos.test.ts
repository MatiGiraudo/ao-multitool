import { describe, expect, it } from "vitest";
import { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import { MemoriaHojaRepositorio } from "@/graficos/infraestructura/memoria";
import { TablaDeGrh } from "@/importacion/dominio/TablaDeGrh";
import { MemoriaTablaDeGrh } from "@/importacion/infraestructura/memoria";
import { ResolverGraficosDelMapa } from "./aplicacion/casosDeUso";
import { Mapa } from "./dominio/Mapa";

/** La tabla con dos gráficos de la hoja 12 y uno de la 777, que no vamos a cargar. */
async function escenario() {
  const tablas = new MemoriaTablaDeGrh();
  await tablas.guardar(
    TablaDeGrh.desde([
      { numero: 100, archivo: "12", x: 0, y: 0, ancho: 32, alto: 32, cuadros: [], msDelCiclo: 0 },
      { numero: 101, archivo: "12", x: 32, y: 0, ancho: 32, alto: 64, cuadros: [], msDelCiclo: 0 },
      { numero: 200, archivo: "777", x: 0, y: 0, ancho: 32, alto: 32, cuadros: [], msDelCiclo: 0 },
      { numero: 300, archivo: "", x: 0, y: 0, ancho: 0, alto: 0, cuadros: [100, 101], msDelCiclo: 240 },
    ]),
  );
  const hojas = new MemoriaHojaRepositorio();
  await hojas.guardar(HojaDeSprites.crear("h12", "12.png", "a").sinAnimacion("a"));
  return new ResolverGraficosDelMapa(tablas, hojas);
}

describe("ResolverGraficosDelMapa", () => {
  it("trae sólo los gráficos que el mapa usa, y de las hojas que están", async () => {
    const resolver = await escenario();
    const mapa = Mapa.vacio(1);
    mapa.ponerGrafico(1, 1, 1, 100);
    mapa.ponerGrafico(2, 1, 1, 100); // repetido: no cuenta dos veces
    mapa.ponerGrafico(3, 1, 2, 101);

    const r = await resolver.ejecutar(mapa);
    expect([...r.porGrh.keys()]).toEqual([100, 101]);
    expect(r.porGrh.get(101)).toMatchObject({ hojaId: "h12", nombreHoja: "12.png", cuadros: [{ x: 32, y: 0, ancho: 32, alto: 64 }] });
    expect(r.hojas).toEqual(["h12"]);
    expect(r.hojasFaltantes).toEqual([]);
  });

  it("dice qué imagen falta cargar en vez de fallar", async () => {
    const resolver = await escenario();
    const mapa = Mapa.vacio(1);
    mapa.ponerGrafico(1, 1, 1, 100);
    mapa.ponerGrafico(1, 2, 1, 200); // vive en la hoja 777, que no está cargada

    const r = await resolver.ejecutar(mapa);
    expect(r.hojasFaltantes).toEqual(["777"]);
    expect(r.porGrh.has(200)).toBe(false);
    // Lo que sí está se resuelve igual: el mapa se abre a medias, no se cae.
    expect(r.porGrh.has(100)).toBe(true);
  });

  it("un gráfico animado trae todos sus cuadros y su velocidad", async () => {
    const resolver = await escenario();
    const mapa = Mapa.vacio(1);
    mapa.ponerGrafico(1, 1, 2, 300);

    const r = await resolver.ejecutar(mapa);
    const animado = r.porGrh.get(300)!;
    expect(animado.cuadros).toHaveLength(2);
    expect(animado.msPorFrame).toBe(120);
  });

  it("avisa de los GRH que la tabla no conoce", async () => {
    const resolver = await escenario();
    const mapa = Mapa.vacio(1);
    mapa.ponerGrafico(1, 1, 1, 99999);

    const r = await resolver.ejecutar(mapa);
    expect(r.sinResolver).toEqual([99999]);
  });

  it("sin tabla de GRH no resuelve nada, pero tampoco rompe", async () => {
    const resolver = new ResolverGraficosDelMapa(new MemoriaTablaDeGrh(), new MemoriaHojaRepositorio());
    const mapa = Mapa.vacio(1);
    mapa.ponerGrafico(1, 1, 1, 100);

    const r = await resolver.ejecutar(mapa);
    expect(r.porGrh.size).toBe(0);
    expect(r.sinResolver).toEqual([100]);
  });
});
