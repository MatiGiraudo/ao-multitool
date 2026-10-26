import { describe, expect, it } from "vitest";
import { GeneradorDeIdsSecuencial } from "@/compartido/infraestructura/GeneradorDeIdsAleatorio";
import { Animacion } from "@/graficos/dominio/Animacion";
import { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import { ImportarObjetos, ExportarObjetos, CrearObjeto } from "./aplicacion/casosDeUso";
import { Objeto } from "./dominio/Objeto";
import { Referencia } from "@/compartido/dominio/ReferenciaGrafica";
import { Autovinculador } from "@/compartido/dominio/Autovinculador";
import { autovincularEquipado, ValidadorDeObjetos } from "./dominio/servicios";
import { CatalogoGraficoDesdeHojas } from "@/graficos/infraestructura/CatalogoGraficoDesdeHojas";
import { FormatoAoObjs } from "./infraestructura/FormatoAoObjs";
import { MemoriaObjetoRepositorio } from "./infraestructura/memoria";

function hojaCaminar() {
  let h = HojaDeSprites.crear("h1", "cuerpo.png", "x");
  h = h.sinAnimacion("x");
  for (const n of ["caminar_sur", "caminar_norte", "caminar_este", "caminar_oeste", "icono"]) h = h.conAnimacionAgregada(Animacion.crear(`a-${n}`, n));
  return h;
}

describe("Objeto", () => {
  it("cambiar a un tipo equipable lo deja como no apilable", () => {
    const o = Objeto.crear("k", 1).conTipo("arma");
    expect(o.apilable).toBe(false);
    expect(o.conTipo("pocion").apilable).toBe(true);
  });

  it("rechaza atributos que no son del tipo", () => {
    expect(() => Objeto.crear("k", 1).conTipo("pocion").conAtributo("minHit", 3)).toThrow();
    expect(Objeto.crear("k", 1).conTipo("arma").conAtributo("minHit", "3").atributos.minHit).toBe(3);
  });

  it("no acepta ID 0", () => {
    expect(() => Objeto.crear("k", 0)).toThrow(/mayor a 0/);
  });
});

describe("Servicios de dominio", () => {
  const catalogo = new CatalogoGraficoDesdeHojas([hojaCaminar()]);

  it("autovincula las 4 direcciones por sufijo", () => {
    const r = autovincularEquipado(Objeto.crear("k", 1).conTipo("armadura"), "h1", catalogo);
    expect(r.cantidad).toBe(4);
    expect(Autovinculador.hojaSugerida(catalogo)).toBe("h1");
  });

  it("detecta IDs repetidos, vínculos rotos y lo que falta", () => {
    const a = Objeto.crear("a", 7).conTipo("casco").conIcono(Referencia.vinculada("h1", "no-existe"));
    const b = Objeto.crear("b", 7);
    const msgs = ValidadorDeObjetos.problemas(a, [a, b], catalogo).map((p) => p.mensaje);
    expect(msgs).toEqual(["ID repetido", "Vínculo roto", "Sin equipado"]);
  });
});

describe("Importar y exportar objetos (ao-objs)", () => {
  it("ida y vuelta: lo exportado se vuelve a importar igual, y lo que falta queda pendiente", async () => {
    const repo = new MemoriaObjetoRepositorio();
    const ids = new GeneradorDeIdsSecuencial();
    const formato = new FormatoAoObjs();
    const catalogo = new CatalogoGraficoDesdeHojas([hojaCaminar()]);

    let o = await new CrearObjeto(repo, ids).ejecutar();
    o = o.renombrado("Túnica").conTipo("armadura").conIcono(Referencia.vinculada("h1", "a-icono"));
    o = autovincularEquipado(o, "h1", catalogo).objeto;
    await repo.guardar(o);

    const { contenido } = await new ExportarObjetos(repo, formato).ejecutar(catalogo);
    expect(contenido).toContain('"icon": { "sheet": "cuerpo.png", "anim": "icono", "frame": 0 }');

    const repo2 = new MemoriaObjetoRepositorio();
    const sinHojas = new CatalogoGraficoDesdeHojas([]);
    const r = await new ImportarObjetos(repo2, formato, ids).ejecutar(contenido, sinHojas);
    expect(r).toEqual({ agregados: 1, reemplazados: 0, pendientes: 1 });
    const [importado] = await repo2.listar();
    expect(importado!.graficos.icono).toMatchObject({ tipo: "pendiente", nombreHoja: "cuerpo.png", nombreAnimacion: "icono" });
    // En cuanto la hoja existe, la referencia pendiente se resuelve sola:
    expect(catalogo.resolver(importado!.graficos.icono)?.animacionId).toBe("a-icono");
  });
});
