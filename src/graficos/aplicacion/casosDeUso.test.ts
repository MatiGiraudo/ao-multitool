import { describe, expect, it } from "vitest";
import { GeneradorDeIdsSecuencial } from "@/compartido/infraestructura/GeneradorDeIdsAleatorio";
import { Tamanio } from "../dominio/Tamanio";
import { FormatoAoAnim } from "../infraestructura/FormatoAoAnim";
import { MemoriaAlmacenDeImagenes, MemoriaHojaRepositorio } from "../infraestructura/memoria";
import { CrearHojaDesdeImagen, ExportarAnimaciones, ImportarAnimaciones, RedimensionarHoja, RestaurarImagenOriginal } from "./casosDeUso";
import type { ProcesadorDeImagenes } from "./puertos";

/** Un procesador falso: no toca píxeles, sólo "dice" el tamaño. Así testeamos la lógica sin navegador. */
class ProcesadorFalso implements ProcesadorDeImagenes {
  constructor(private tamanio = Tamanio.crear(192, 192)) {}
  async decodificar(archivo: Blob) {
    return { png: archivo, tamanio: this.tamanio };
  }
  async redimensionar(_png: Blob, t: Tamanio) {
    return new Blob([`png ${t}`], { type: "image/png" });
  }
}

function armar() {
  const repo = new MemoriaHojaRepositorio();
  const imagenes = new MemoriaAlmacenDeImagenes();
  const ids = new GeneradorDeIdsSecuencial();
  const proc = new ProcesadorFalso();
  return { repo, imagenes, ids, proc, crear: new CrearHojaDesdeImagen(repo, imagenes, proc, ids) };
}

describe("Casos de uso de Gráficos", () => {
  it("crear una hoja guarda la imagen actual y la original", async () => {
    const { crear, imagenes } = armar();
    const h = await crear.ejecutar({ archivo: new Blob(["x"]), nombreArchivo: "cuerpo.png" });
    expect(h.tamanio?.toString()).toBe("192×192");
    expect(await imagenes.leer(h.id, "actual")).not.toBeNull();
    expect(await imagenes.leer(h.id, "original")).not.toBeNull();
  });

  it("redimensionar y restaurar vuelve al tamaño original", async () => {
    const { crear, repo, imagenes, proc } = armar();
    const h = await crear.ejecutar({ archivo: new Blob(["x"]), nombreArchivo: "cuerpo.png" });
    const chica = await new RedimensionarHoja(repo, imagenes, proc).ejecutar({
      hojaId: h.id,
      tamanio: Tamanio.crear(96, 96),
      calidad: "pixel",
      escalarContenido: true,
    });
    expect(chica.fueRedimensionada).toBe(true);
    const vuelta = await new RestaurarImagenOriginal(repo, imagenes).ejecutar({ hojaId: h.id, escalarContenido: true });
    expect(vuelta.tamanio?.toString()).toBe("192×192");
    expect(vuelta.grilla.anchoCelda).toBe(32);
  });

  it("exportar e importar ao-anim mezcla por nombre en la misma hoja", async () => {
    const { crear, repo, ids } = armar();
    const formato = new FormatoAoAnim();
    const h = await crear.ejecutar({ archivo: new Blob(["x"]), nombreArchivo: "cuerpo.png" });
    const { nombreArchivo, contenido } = await new ExportarAnimaciones(repo, formato).ejecutar(h.id);
    expect(nombreArchivo).toBe("cuerpo.anim.json");
    const r = await new ImportarAnimaciones(repo, formato, ids).ejecutar(contenido);
    expect(r.creada).toBe(false);
    expect(r.hoja.animaciones.map((a) => a.id)).toEqual(h.animaciones.map((a) => a.id));
  });
});
