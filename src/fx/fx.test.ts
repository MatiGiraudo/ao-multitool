import { describe, expect, it } from "vitest";
import { GeneradorDeIdsSecuencial } from "@/compartido/infraestructura/GeneradorDeIdsAleatorio";
import { Referencia } from "@/compartido/dominio/ReferenciaGrafica";
import { Animacion } from "@/graficos/dominio/Animacion";
import { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import { CatalogoGraficoDesdeHojas } from "@/graficos/infraestructura/CatalogoGraficoDesdeHojas";
import { CrearEfecto, ExportarEfectos, ImportarEfectos } from "./aplicacion/casosDeUso";
import { Efecto } from "./dominio/Efecto";
import { ValidadorDeEfectos } from "./dominio/servicios";
import { FormatoAoFx } from "./infraestructura/FormatoAoFx";
import { MemoriaEfectoRepositorio } from "./infraestructura/memoria";

function hojaDeFx() {
  let h = HojaDeSprites.crear("h1", "fx.png", "x");
  h = h.sinAnimacion("x");
  for (const n of ["explosion", "humo"]) h = h.conAnimacionAgregada(Animacion.crear(`a-${n}`, n));
  return h;
}
const catalogo = new CatalogoGraficoDesdeHojas([hojaDeFx()]);

describe("Efecto", () => {
  it("es inmutable: cada cambio devuelve un efecto nuevo", () => {
    const a = Efecto.crear("k", 1);
    const b = a.conOffset(0, -16);
    expect(a.offsetY).toBe(0);
    expect(b.offsetY).toBe(-16);
    expect(b.offsetX).toBe(0);
  });

  it("acepta corrimientos negativos pero no cualquier cosa", () => {
    expect(Efecto.crear("k", 1).conOffset(-8, -32).offsetX).toBe(-8);
    expect(() => Efecto.crear("k", 1).conOffset(99999, 0)).toThrow();
    expect(() => Efecto.crear("k", 1).conOffset(Number.NaN, 0)).toThrow();
  });

  it("0 repeticiones significa en bucle", () => {
    expect(Efecto.crear("k", 1).conRepeticiones(0).enBucle).toBe(true);
    expect(Efecto.crear("k", 1).conRepeticiones(3).enBucle).toBe(false);
    expect(() => Efecto.crear("k", 1).conRepeticiones(-1)).toThrow();
  });

  it("rechaza un ID que no sea un entero positivo", () => {
    expect(() => Efecto.crear("k", 0)).toThrow();
    expect(() => Efecto.crear("k", 1.5)).toThrow();
  });

  it("el duplicado es otro efecto, con otro ID y sin la marca de ejemplo", () => {
    const a = Efecto.reconstituir({ ...Efecto.crear("k", 1).datos(), nombre: "Explosión", esEjemplo: true });
    const b = a.duplicado("k2", 2);
    expect(b.clave).toBe("k2");
    expect(b.numero).toBe(2);
    expect(b.nombre).toBe("Explosión (copia)");
    expect(b.esEjemplo).toBe(false);
  });
});

describe("ValidadorDeEfectos", () => {
  it("detecta IDs repetidos, vínculos rotos y lo que falta", () => {
    const a = Efecto.crear("a", 7).renombrado("").conAnimacion(Referencia.vinculada("h1", "no-existe"));
    const b = Efecto.crear("b", 7);
    const msgs = ValidadorDeEfectos.problemas(a, [a, b], catalogo).map((p) => p.mensaje);
    expect(msgs).toContain("ID repetido");
    expect(msgs).toContain("Vínculo roto");
    expect(msgs).toContain("Sin nombre");
    expect(ValidadorDeEfectos.problemas(b, [a, b], catalogo).map((p) => p.mensaje)).toContain("Sin animación");
  });

  it("un efecto bien armado no tiene problemas", () => {
    const e = Efecto.crear("a", 1).renombrado("Explosión").conAnimacion(Referencia.vinculada("h1", "a-explosion"));
    expect(ValidadorDeEfectos.problemas(e, [e], catalogo)).toEqual([]);
  });
});

describe("exportar e importar", () => {
  it("ida y vuelta completa por el formato ao-fx", async () => {
    const repo = new MemoriaEfectoRepositorio();
    const ids = new GeneradorDeIdsSecuencial();
    const formato = new FormatoAoFx();

    let e = await new CrearEfecto(repo, ids).ejecutar();
    e = e.renombrado("Explosión").conAnimacion(Referencia.vinculada("h1", "a-explosion")).conOffset(0, -16).conRepeticiones(2);
    await repo.guardar(e);

    const { nombreArchivo, contenido } = await new ExportarEfectos(repo, formato).ejecutar(catalogo);
    expect(nombreArchivo).toBe("fx.json");
    expect(contenido).toContain('"anim": { "sheet": "fx.png", "anim": "explosion" }');
    expect(contenido).toContain('"offset": { "x": 0, "y": -16 }');

    const repo2 = new MemoriaEfectoRepositorio();
    const r = await new ImportarEfectos(repo2, formato, new GeneradorDeIdsSecuencial()).ejecutar(contenido, catalogo);
    expect(r).toEqual({ agregados: 1, reemplazados: 0, pendientes: 0 });
    const [copia] = await repo2.listar();
    expect(copia!.nombre).toBe("Explosión");
    expect(copia!.offsetY).toBe(-16);
    expect(copia!.repeticiones).toBe(2);
    expect(copia!.animacion).toEqual(Referencia.vinculada("h1", "a-explosion"));
  });

  it("si la hoja todavía no está, la animación queda pendiente y el ID se reemplaza", async () => {
    const repo = new MemoriaEfectoRepositorio();
    const formato = new FormatoAoFx();
    const texto = JSON.stringify({
      format: "ao-fx",
      version: 1,
      effects: [{ id: 1, name: "Humo", anim: { sheet: "otra.png", anim: "humo" }, offset: { x: 2, y: 3 }, loops: 0 }],
    });
    const importar = new ImportarEfectos(repo, formato, new GeneradorDeIdsSecuencial());

    expect(await importar.ejecutar(texto, catalogo)).toEqual({ agregados: 1, reemplazados: 0, pendientes: 1 });
    expect(await importar.ejecutar(texto, catalogo)).toEqual({ agregados: 0, reemplazados: 1, pendientes: 1 });
    const [e] = await repo.listar();
    expect(e!.animacion).toEqual(Referencia.pendiente("otra.png", "humo"));
  });

  it("avisa cuando el JSON no tiene la forma esperada", () => {
    const formato = new FormatoAoFx();
    expect(() => formato.leer("{")).toThrow();
    expect(() => formato.leer('{"format":"ao-fx"}')).toThrow();
  });
});
