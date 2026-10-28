import { describe, expect, it } from "vitest";
import { catalogoDe, CATALOGO_VACIO } from "@/compartido/dominio/CatalogoPorNumero";
import { ALTO, ANCHO, Mapa } from "./dominio/Mapa";
import { ValidadorDeMapas, type CatalogosDelMapa } from "./dominio/servicios";

/*
 * Lo que el diagnóstico encuentra en un mapa.
 *
 * Los chequeos están calibrados contra los 317 mapas de Alkon: lo que ahí aparece a montones
 * —celdas sin piso, objetos sobre celdas bloqueadas— no se marca, y lo que no aparece nunca sí.
 */

const CATALOGOS: CatalogosDelMapa = {
  npcs: catalogoDe([{ numero: 25, nombre: "Lobo" }]),
  objetos: catalogoDe([{ numero: 12, nombre: "Daga" }]),
  mapas: catalogoDe([
    { numero: 1, nombre: "Ullathorpe" },
    { numero: 9, nombre: "Nix" },
  ]),
  graficos: catalogoDe([{ numero: 1000, nombre: "grh 1000" }]),
};

function mapaSano(): Mapa {
  const mapa = Mapa.vacio(1, { nombre: "Ullathorpe" });
  for (let y = 1; y <= ALTO; y++) for (let x = 1; x <= ANCHO; x++) mapa.ponerGrafico(x, y, 1, 1000);
  mapa.ponerTraslado(5, 5, { mapa: 9, x: 50, y: 50 });
  mapa.ponerNpc(6, 6, 25);
  mapa.ponerObjeto(7, 7, { objeto: 12, cantidad: 3 });
  return mapa;
}

const mensajes = (mapa: Mapa, catalogos = CATALOGOS) => ValidadorDeMapas.problemas(mapa, catalogos).map((p) => `${p.gravedad}: ${p.mensaje}`);

describe("ValidadorDeMapas", () => {
  it("un mapa sano no tiene nada que decir", () => {
    expect(mensajes(mapaSano())).toEqual([]);
  });

  it("ve el traslado a un mapa que no está en el proyecto", () => {
    const mapa = mapaSano();
    mapa.ponerTraslado(8, 8, { mapa: 404, x: 10, y: 10 });
    mapa.ponerTraslado(9, 9, { mapa: 404, x: 20, y: 20 });
    // Un solo problema aunque sean dos celdas: lo que hay que arreglar es el mapa que falta.
    expect(mensajes(mapa)).toEqual(["error: Traslados a mapas que no están en el proyecto: 404"]);
  });

  it("ve el traslado que cae fuera del mapa de destino", () => {
    const mapa = mapaSano();
    mapa.ponerTraslado(8, 8, { mapa: 9, x: 0, y: 50 });
    mapa.ponerTraslado(9, 9, { mapa: 9, x: 50, y: 101 });
    expect(mensajes(mapa)).toEqual(["error: 2 traslados caen fuera del mapa de destino"]);
  });

  it("ve los NPCs y los objetos que no existen", () => {
    const mapa = mapaSano();
    mapa.ponerNpc(10, 10, 999);
    mapa.ponerObjeto(11, 11, { objeto: 888, cantidad: 1 });
    expect(mensajes(mapa)).toEqual(["error: NPCs que no existen: 999", "error: Objetos que no existen: 888"]);
  });

  it("ve el gráfico que la tabla de GRH no conoce", () => {
    const mapa = mapaSano();
    mapa.ponerGrafico(12, 12, 2, 54321);
    expect(mensajes(mapa)).toEqual(["error: 1 gráfico no está en la tabla de GRH: 54321"]);
  });

  it("sin tabla de GRH no se queja: el proyecto todavía no importó gráficos", () => {
    const mapa = mapaSano();
    mapa.ponerGrafico(12, 12, 2, 54321);
    expect(mensajes(mapa, { ...CATALOGOS, graficos: CATALOGO_VACIO })).toEqual([]);
  });

  it("avisa del NPC parado sobre una celda sin piso, que no pasa en ningún mapa del juego", () => {
    const mapa = mapaSano();
    mapa.ponerGrafico(6, 6, 1, 0);
    expect(mensajes(mapa)).toEqual(["aviso: 1 NPC está sobre una celda sin piso"]);
  });

  it("no marca lo que en los mapas del juego es lo normal", () => {
    const mapa = mapaSano();
    // Media mapa sin piso, como un dungeon: 45 de los 317 mapas de Alkon tienen celdas así.
    for (let y = 20; y <= 50; y++) for (let x = 1; x <= ANCHO; x++) mapa.ponerGrafico(x, y, 1, 0);
    // Y un objeto sobre una celda bloqueada: 18.032 de los 19.499 objetos del juego están así.
    mapa.bloquear(7, 7, true);
    expect(mensajes(mapa)).toEqual([]);
  });

  it("avisa si el mapa no tiene nombre", () => {
    expect(mensajes(mapaSano().conInfo({ nombre: "  " }))).toEqual(["aviso: Sin nombre"]);
  });
});
