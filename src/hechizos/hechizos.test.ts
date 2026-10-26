import { describe, expect, it } from "vitest";
import { catalogoDe, CATALOGO_VACIO } from "@/compartido/dominio/CatalogoPorNumero";
import { GeneradorDeIdsSecuencial } from "@/compartido/infraestructura/GeneradorDeIdsAleatorio";
import { CrearHechizo, ExportarHechizos, ImportarHechizos } from "./aplicacion/casosDeUso";
import { Hechizo } from "./dominio/Hechizo";
import { ValidadorDeHechizos } from "./dominio/servicios";
import { FormatoAoSpells } from "./infraestructura/FormatoAoSpells";
import { MemoriaHechizoRepositorio } from "./infraestructura/memoria";

const fx = catalogoDe([{ numero: 5, nombre: "Destello" }]);

describe("Hechizo", () => {
  it("es inmutable y valida lo que se le pone", () => {
    const a = Hechizo.crear("k", 1);
    const b = a.conMana(30);
    expect(a.mana).toBe(0);
    expect(b.mana).toBe(30);
    expect(() => a.conMana(-1)).toThrow();
    expect(() => a.conNumero(0)).toThrow();
  });

  it("los datos del efecto dependen del tipo", () => {
    const dano = Hechizo.crear("k", 1).conTipo("dano").conAtributo("min", "5").conAtributo("max", 10);
    expect(dano.atributosVigentes()).toEqual({ min: 5, max: 10 });
    expect(() => dano.conAtributo("npc", 3)).toThrow();
    expect(() => Hechizo.crear("k", 1).conTipo("modificar_stat").conAtributo("stat", "inventado")).toThrow();
    expect(Hechizo.crear("k", 1).conTipo("modificar_stat").conAtributo("stat", "fuerza").atributos.stat).toBe("fuerza");
  });

  it("cambiar de efecto no borra lo cargado antes, pero deja de contar", () => {
    const h = Hechizo.crear("k", 1).conTipo("dano").conAtributo("min", 5).conTipo("resucitar");
    expect(h.atributos.min).toBe(5);
    expect(h.atributosVigentes()).toEqual({});
  });

  it("sólo acepta banderas que existen", () => {
    expect(Hechizo.crear("k", 1).conBandera("baculo", true).tieneBandera("baculo")).toBe(true);
    expect(() => Hechizo.crear("k", 1).conBandera("inventada", true)).toThrow();
  });

  it("el duplicado es otro hechizo", () => {
    const d = Hechizo.crear("k", 1).renombrado("Dardo").duplicado("k2", 7);
    expect(d.clave).toBe("k2");
    expect(d.numero).toBe(7);
    expect(d.nombre).toBe("Dardo (copia)");
  });
});

describe("ValidadorDeHechizos", () => {
  it("avisa del FX que no existe, y de lo que falta", () => {
    const a = Hechizo.crear("a", 3).renombrado("").conFx(99);
    const b = Hechizo.crear("b", 3);
    const msgs = ValidadorDeHechizos.problemas(a, [a, b], fx).map((p) => p.mensaje);
    expect(msgs).toContain("ID repetido");
    expect(msgs).toContain("FX inexistente");
    expect(msgs).toContain("Sin nombre");
    expect(msgs).toContain("Sin palabras mágicas");
    expect(msgs).toContain("Sin maná");
  });

  it("un hechizo completo no tiene problemas", () => {
    const h = Hechizo.crear("a", 1)
      .renombrado("Dardo mágico")
      .conPalabrasMagicas("OHL VOR PEK")
      .conTipo("dano")
      .conAtributo("min", 5)
      .conAtributo("max", 10)
      .conMana(10)
      .conFx(5);
    expect(ValidadorDeHechizos.problemas(h, [h], fx)).toEqual([]);
  });

  it("sin FX elegido no se queja del FX", () => {
    const h = Hechizo.crear("a", 1).renombrado("X").conPalabrasMagicas("Y").conMana(5).conTipo("resucitar");
    expect(ValidadorDeHechizos.problemas(h, [h], CATALOGO_VACIO).map((p) => p.mensaje)).toEqual([]);
  });
});

describe("exportar e importar", () => {
  it("ida y vuelta completa por el formato ao-spells", async () => {
    const repo = new MemoriaHechizoRepositorio();
    const ids = new GeneradorDeIdsSecuencial();
    const formato = new FormatoAoSpells();

    let h = await new CrearHechizo(repo, ids).ejecutar();
    h = h
      .renombrado("Dardo mágico")
      .conPalabrasMagicas("OHL VOR PEK")
      .conObjetivo("npc")
      .conTipo("dano")
      .conAtributo("min", 5)
      .conAtributo("max", 10)
      .conMana(10)
      .conEnergia(2)
      .conFx(5)
      .conSonido("61")
      .conBandera("baculo", true);
    await repo.guardar(h);

    const { nombreArchivo, contenido } = await new ExportarHechizos(repo, formato).ejecutar();
    expect(nombreArchivo).toBe("hechizos.json");
    expect(contenido).toContain('"words": "OHL VOR PEK"');
    expect(contenido).toContain('"baculo": true');

    const repo2 = new MemoriaHechizoRepositorio();
    const r = await new ImportarHechizos(repo2, formato, new GeneradorDeIdsSecuencial()).ejecutar(contenido);
    expect(r).toEqual({ agregados: 1, reemplazados: 0 });
    const [copia] = await repo2.listar();
    expect(copia!.nombre).toBe("Dardo mágico");
    expect(copia!.objetivo).toBe("npc");
    expect(copia!.atributosVigentes()).toEqual({ min: 5, max: 10 });
    expect(copia!.tieneBandera("baculo")).toBe(true);
    expect(copia!.fx).toBe(5);
  });

  it("un tipo o un objetivo desconocidos no rompen la importación", async () => {
    const repo = new MemoriaHechizoRepositorio();
    const texto = JSON.stringify({
      format: "ao-spells",
      version: 1,
      spells: [{ id: 1, name: "Raro", type: "teletransportar", target: "vecinos", mana: 5 }],
    });
    await new ImportarHechizos(repo, new FormatoAoSpells(), new GeneradorDeIdsSecuencial()).ejecutar(texto);
    const [h] = await repo.listar();
    expect(h!.tipo.id).toBe("dano");
    expect(h!.objetivo).toBe("ambos");
  });

  it("el mismo ID se reemplaza y conserva la clave", async () => {
    const repo = new MemoriaHechizoRepositorio();
    const formato = new FormatoAoSpells();
    const importar = new ImportarHechizos(repo, formato, new GeneradorDeIdsSecuencial());
    const texto = JSON.stringify({ format: "ao-spells", version: 1, spells: [{ id: 1, name: "Uno", mana: 1 }] });

    await importar.ejecutar(texto);
    const clave = (await repo.listar())[0]!.clave;
    expect(await importar.ejecutar(texto)).toEqual({ agregados: 0, reemplazados: 1 });
    expect(await repo.listar()).toHaveLength(1);
    expect((await repo.listar())[0]!.clave).toBe(clave);
  });

  it("avisa cuando el JSON no tiene la forma esperada", () => {
    expect(() => new FormatoAoSpells().leer('{"format":"ao-spells"}')).toThrow();
  });
});
