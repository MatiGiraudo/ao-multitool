import { describe, expect, it } from "vitest";
import { Referencia } from "@/compartido/dominio/ReferenciaGrafica";
import { GeneradorDeIdsSecuencial } from "@/compartido/infraestructura/GeneradorDeIdsAleatorio";
import { Animacion } from "@/graficos/dominio/Animacion";
import { Frame } from "@/graficos/dominio/Frame";
import { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import { CatalogoGraficoDesdeHojas } from "@/graficos/infraestructura/CatalogoGraficoDesdeHojas";
import { CrearApariencia, ExportarApariencias, ImportarApariencias } from "./aplicacion/casosDeUso";
import { ESPECIE_CABEZA, Cabeza } from "./dominio/Cabeza";
import { ESPECIE_CUERPO, Cuerpo } from "./dominio/Cuerpo";
import { autovincularDirecciones, ValidadorDeApariencias } from "./dominio/servicios";
import { FormatoAoBodies } from "./infraestructura/FormatoAoBodies";
import { FormatoAoHeads } from "./infraestructura/FormatoAoHeads";
import { MemoriaCabezaRepositorio, MemoriaCuerpoRepositorio } from "./infraestructura/memoria";

function hojas() {
  let cuerpo = HojaDeSprites.crear("h1", "cuerpos.png", "x").sinAnimacion("x");
  for (const n of ["caminar_sur", "caminar_norte", "caminar_este", "caminar_oeste"]) cuerpo = cuerpo.conAnimacionAgregada(Animacion.crear(`a-${n}`, n));
  // Las cuatro caras viven en una sola animación, como suele venir una hoja de cabezas.
  let cabeza = HojaDeSprites.crear("h2", "cabezas.png", "y").sinAnimacion("y");
  const caras = Animacion.crear("a-caras", "caras").conFramesAgregados([0, 1, 2, 3].map((i) => Frame.deCoordenadas(i * 16, 0, 16, 16, null)));
  cabeza = cabeza.conAnimacionAgregada(caras);
  return [cuerpo, cabeza];
}
const catalogo = new CatalogoGraficoDesdeHojas(hojas());

describe("Cuerpo", () => {
  it("es inmutable y guarda el corrimiento de la cabeza", () => {
    const a = Cuerpo.crear("k", 1);
    const b = a.conOffsetCabeza(0, -28);
    expect(a.offsetCabezaY).toBe(0);
    expect(b.offsetCabezaY).toBe(-28);
    expect(() => a.conOffsetCabeza(0, 9999)).toThrow();
  });

  it("ignora el frame: el cuerpo reproduce la animación entera", () => {
    const c = Cuerpo.crear("k", 1).conDireccion("sur", Referencia.vinculada("h1", "a-caminar_sur", 3));
    expect(c.direcciones.sur?.frame).toBe(0);
  });

  it("sacar una dirección la deja vacía", () => {
    const c = Cuerpo.crear("k", 1).conDireccion("sur", Referencia.vinculada("h1", "a-caminar_sur"));
    expect(c.conDireccion("sur", null).direcciones.sur).toBeUndefined();
  });
});

describe("Cabeza", () => {
  it("respeta el frame, porque cada cara es un cuadro fijo", () => {
    const c = Cabeza.crear("k", 1).conDireccion("norte", Referencia.vinculada("h2", "a-caras", 2));
    expect(c.direcciones.norte?.frame).toBe(2);
  });
});

describe("autovincularDirecciones", () => {
  it("llena las cuatro direcciones por el sufijo del nombre, para cualquier apariencia", () => {
    expect(autovincularDirecciones(Cuerpo.crear("k", 1), "h1", catalogo).cantidad).toBe(4);
    expect(autovincularDirecciones(Cabeza.crear("k", 1), "h1", catalogo).cantidad).toBe(4);
    expect(autovincularDirecciones(Cuerpo.crear("k", 1), "h2", catalogo).cantidad).toBe(0);
  });
});

describe("ValidadorDeApariencias", () => {
  it("vale igual para cuerpos y cabezas", () => {
    const a = Cuerpo.crear("a", 7).renombrado("").conDireccion("sur", Referencia.vinculada("h1", "no-existe"));
    const b = Cuerpo.crear("b", 7);
    const msgs = ValidadorDeApariencias.problemas(a, [a, b], catalogo).map((p) => p.mensaje);
    expect(msgs).toContain("ID repetido");
    expect(msgs).toContain("Vínculo roto");
    expect(msgs).toContain("Sin nombre");
    expect(msgs).toContain("Faltan 3 dir.");
    expect(ValidadorDeApariencias.problemas(Cabeza.crear("c", 1), [], catalogo).map((p) => p.mensaje)).toContain("Sin gráficos");
  });

  it("una apariencia completa no tiene problemas", () => {
    const c = autovincularDirecciones(Cuerpo.crear("a", 1).renombrado("Humano"), "h1", catalogo).apariencia;
    expect(ValidadorDeApariencias.problemas(c, [c], catalogo)).toEqual([]);
  });
});

describe("exportar e importar cuerpos", () => {
  it("ida y vuelta completa por el formato ao-bodies", async () => {
    const repo = new MemoriaCuerpoRepositorio();
    const formato = new FormatoAoBodies();
    const ids = new GeneradorDeIdsSecuencial();

    let c = await new CrearApariencia(repo, ids, ESPECIE_CUERPO).ejecutar();
    c = autovincularDirecciones(c.renombrado("Humano"), "h1", catalogo).apariencia.conOffsetCabeza(0, -28);
    await repo.guardar(c);

    const { nombreArchivo, contenido } = await new ExportarApariencias(repo, formato).ejecutar(catalogo);
    expect(nombreArchivo).toBe("cuerpos.json");
    expect(contenido).toContain('"sur": { "sheet": "cuerpos.png", "anim": "caminar_sur" }');
    expect(contenido).toContain('"headOffset": { "x": 0, "y": -28 }');

    const repo2 = new MemoriaCuerpoRepositorio();
    const r = await new ImportarApariencias(repo2, formato, new GeneradorDeIdsSecuencial(), ESPECIE_CUERPO).ejecutar(contenido, catalogo);
    expect(r).toEqual({ agregados: 1, reemplazados: 0, pendientes: 0 });
    const [copia] = await repo2.listar();
    expect(copia!.nombre).toBe("Humano");
    expect(copia!.offsetCabezaY).toBe(-28);
    expect(copia!.referenciasVigentes()).toHaveLength(4);
  });
});

describe("exportar e importar cabezas", () => {
  it("ida y vuelta completa por el formato ao-heads, con el frame de cada cara", async () => {
    const repo = new MemoriaCabezaRepositorio();
    const formato = new FormatoAoHeads();
    const ids = new GeneradorDeIdsSecuencial();

    let c = await new CrearApariencia(repo, ids, ESPECIE_CABEZA).ejecutar();
    c = c.renombrada("Rubio").conDireccion("sur", Referencia.vinculada("h2", "a-caras", 0)).conDireccion("norte", Referencia.vinculada("h2", "a-caras", 1));
    await repo.guardar(c);

    const { contenido } = await new ExportarApariencias(repo, formato).ejecutar(catalogo);
    expect(contenido).toContain('"norte": { "sheet": "cabezas.png", "anim": "caras", "frame": 1 }');
    expect(contenido).toContain('"este": null');

    const repo2 = new MemoriaCabezaRepositorio();
    await new ImportarApariencias(repo2, formato, new GeneradorDeIdsSecuencial(), ESPECIE_CABEZA).ejecutar(contenido, catalogo);
    const [copia] = await repo2.listar();
    expect(copia!.direcciones.norte?.frame).toBe(1);
    expect(copia!.direcciones.este).toBeUndefined();
  });

  it("sin la hoja, la referencia queda pendiente y el mismo ID se reemplaza", async () => {
    const repo = new MemoriaCuerpoRepositorio();
    const formato = new FormatoAoBodies();
    const texto = JSON.stringify({
      format: "ao-bodies",
      version: 1,
      bodies: [{ id: 1, name: "Enano", headOffset: { x: 0, y: -20 }, graphics: { sur: { sheet: "otra.png", anim: "andar" } } }],
    });
    const importar = new ImportarApariencias(repo, formato, new GeneradorDeIdsSecuencial(), ESPECIE_CUERPO);

    expect(await importar.ejecutar(texto, catalogo)).toEqual({ agregados: 1, reemplazados: 0, pendientes: 1 });
    expect(await importar.ejecutar(texto, catalogo)).toEqual({ agregados: 0, reemplazados: 1, pendientes: 1 });
    const [c] = await repo.listar();
    expect(c!.direcciones.sur).toEqual(Referencia.pendiente("otra.png", "andar"));
  });

  it("avisan cuando el JSON no tiene la forma esperada", () => {
    expect(() => new FormatoAoBodies().leer('{"format":"ao-bodies"}')).toThrow();
    expect(() => new FormatoAoHeads().leer("{")).toThrow();
  });
});
