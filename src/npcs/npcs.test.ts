import { describe, expect, it } from "vitest";
import { catalogoDe, CATALOGO_VACIO } from "@/compartido/dominio/CatalogoPorNumero";
import { GeneradorDeIdsSecuencial } from "@/compartido/infraestructura/GeneradorDeIdsAleatorio";
import { CrearNpc, ExportarNpcs, ImportarNpcs } from "./aplicacion/casosDeUso";
import { Npc } from "./dominio/Npc";
import { ValidadorDeNpcs, type CatalogosDelNpc } from "./dominio/servicios";
import { FormatoAoNpcs } from "./infraestructura/FormatoAoNpcs";
import { MemoriaNpcRepositorio } from "./infraestructura/memoria";

const catalogos: CatalogosDelNpc = {
  cuerpos: catalogoDe([{ numero: 25, nombre: "Lobo" }]),
  cabezas: catalogoDe([{ numero: 3, nombre: "Humano rubio" }]),
  objetos: catalogoDe([{ numero: 12, nombre: "Daga" }]),
  hechizos: catalogoDe([{ numero: 5, nombre: "Dardo mágico" }]),
};

const lobo = () =>
  Npc.crear("k", 1)
    .renombrado("Lobo")
    .conCuerpo(25)
    .conAtributo("vida", 60)
    .conAtributo("golpeMax", 8)
    .conHechizos([5])
    .conDrops([{ objeto: 12, cantidad: 1, probabilidad: 30 }]);

describe("Npc", () => {
  it("es inmutable y valida lo que apunta", () => {
    const a = Npc.crear("k", 1);
    expect(a.conCuerpo(25).cuerpo).toBe(25);
    expect(a.cuerpo).toBe(0);
    expect(() => a.conCuerpo(-1)).toThrow();
    expect(() => a.conHechizos([0])).toThrow();
    expect(() => a.conDrops([{ objeto: 12, cantidad: 1, probabilidad: 101 }])).toThrow();
  });

  it("la cabeza en 0 es válida: los animales no tienen una aparte", () => {
    expect(Npc.crear("k", 1).conCabeza(0).cabeza).toBe(0);
  });

  it("no repite hechizos", () => {
    expect(Npc.crear("k", 1).conHechizos([5, 5, 8]).hechizos).toEqual([5, 8]);
  });

  it("lo que no corresponde al tipo se guarda, pero no cuenta", () => {
    const banquero = lobo().conTipo("banquero");
    expect(banquero.drops).toHaveLength(1);
    expect(banquero.dropsVigentes()).toEqual([]);
    expect(banquero.hechizosVigentes()).toEqual([]);
    expect(banquero.atributosVigentes()).toEqual({});
    // Y al volver al tipo de antes, sigue todo donde estaba.
    expect(banquero.conTipo("hostil").dropsVigentes()).toHaveLength(1);
  });

  it("sólo acepta atributos del tipo", () => {
    expect(() => Npc.crear("k", 1).conTipo("banquero").conAtributo("vida", 10)).toThrow();
  });
});

describe("ValidadorDeNpcs", () => {
  it("un NPC completo no tiene problemas", () => {
    const n = lobo();
    expect(ValidadorDeNpcs.problemas(n, [n], catalogos)).toEqual([]);
  });

  it("avisa de todo lo que apunta a algo que no existe", () => {
    const n = lobo().conCuerpo(99).conCabeza(77).conHechizos([404]).conDrops([{ objeto: 500, cantidad: 1, probabilidad: 10 }]);
    const mensajes = ValidadorDeNpcs.problemas(n, [n], catalogos).map((p) => p.mensaje);
    expect(mensajes).toContain("El cuerpo 99 no existe");
    expect(mensajes).toContain("La cabeza 77 no existe");
    expect(mensajes).toContain("Hechizos que no existen: 404");
    expect(mensajes).toContain("Objetos que no existen: 500");
  });

  it("no se queja de lo que el tipo no usa", () => {
    const comerciante = lobo().conTipo("comerciante").conEnVenta([{ objeto: 12, cantidad: 5 }]);
    const mensajes = ValidadorDeNpcs.problemas(comerciante, [comerciante], catalogos).map((p) => p.mensaje);
    // El drop al objeto 12 existe igual, pero los hechizos de un comerciante no se revisan.
    expect(mensajes).not.toContain("Hechizos que no existen: 5");
    expect(mensajes).toEqual([]);
  });

  it("marca ID repetido y lo que falta para pelear", () => {
    const a = Npc.crear("a", 7).renombrado("");
    const b = Npc.crear("b", 7);
    const mensajes = ValidadorDeNpcs.problemas(a, [a, b], CATALOGO_VACIO_TODO).map((p) => p.mensaje);
    expect(mensajes).toContain("ID repetido");
    expect(mensajes).toContain("Sin nombre");
    expect(mensajes).toContain("Sin cuerpo");
    expect(mensajes).toContain("Sin vida");
    expect(mensajes).toContain("Sin golpe");
  });
});

const CATALOGO_VACIO_TODO: CatalogosDelNpc = {
  cuerpos: CATALOGO_VACIO,
  cabezas: CATALOGO_VACIO,
  objetos: CATALOGO_VACIO,
  hechizos: CATALOGO_VACIO,
};

describe("exportar e importar", () => {
  it("ida y vuelta completa por el formato ao-npcs", async () => {
    const repo = new MemoriaNpcRepositorio();
    const ids = new GeneradorDeIdsSecuencial();
    const formato = new FormatoAoNpcs();

    let n = await new CrearNpc(repo, ids).ejecutar();
    n = lobo().conNumero(n.numero).conMovimiento("persigue").conDireccion("norte");
    await repo.guardar(Npc.reconstituir({ ...n.datos(), clave: (await repo.listar())[0]!.clave }));

    const { nombreArchivo, contenido } = await new ExportarNpcs(repo, formato).ejecutar();
    expect(nombreArchivo).toBe("npcs.json");
    expect(contenido).toContain('"appearance": { "body": 25, "head": 0, "heading": "norte" }');
    expect(contenido).toContain('{ "item": 12, "amount": 1, "chance": 30 }');

    const repo2 = new MemoriaNpcRepositorio();
    const r = await new ImportarNpcs(repo2, formato, new GeneradorDeIdsSecuencial()).ejecutar(contenido);
    expect(r).toEqual({ agregados: 1, reemplazados: 0 });
    const [copia] = await repo2.listar();
    expect(copia!.nombre).toBe("Lobo");
    expect(copia!.movimiento).toBe("persigue");
    expect(copia!.direccion).toBe("norte");
    expect(copia!.hechizos).toEqual([5]);
    expect(copia!.drops).toEqual([{ objeto: 12, cantidad: 1, probabilidad: 30 }]);
    expect(copia!.atributosVigentes()).toMatchObject({ vida: 60, golpeMax: 8 });
  });

  it("un tipo o un movimiento desconocidos no rompen la importación", async () => {
    const repo = new MemoriaNpcRepositorio();
    const texto = JSON.stringify({
      format: "ao-npcs",
      version: 1,
      npcs: [{ id: 1, name: "Raro", type: "dragón", movement: "vuela", appearance: { heading: "arriba" } }],
    });
    await new ImportarNpcs(repo, new FormatoAoNpcs(), new GeneradorDeIdsSecuencial()).ejecutar(texto);
    const [n] = await repo.listar();
    expect(n!.tipo.id).toBe("otro");
    expect(n!.movimiento).toBe("quieto");
    expect(n!.direccion).toBe("sur");
  });

  it("avisa cuando el JSON no tiene la forma esperada", () => {
    expect(() => new FormatoAoNpcs().leer('{"format":"ao-npcs"}')).toThrow();
  });
});
