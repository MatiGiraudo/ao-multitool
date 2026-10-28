import { describe, expect, it } from "vitest";
import { GeneradorDeIdsSecuencial } from "@/compartido/infraestructura/GeneradorDeIdsAleatorio";
import { ErrorDeDominio } from "@/compartido/dominio/ErrorDeDominio";
import { Tamanio } from "../dominio/Tamanio";
import { FormatoAoAnim } from "../infraestructura/FormatoAoAnim";
import { MemoriaAlmacenDeImagenes, MemoriaHojaRepositorio } from "../infraestructura/memoria";
import {
  CargarHojasEnLote,
  CrearHojaDesdeImagen,
  ExportarAnimaciones,
  ImportarAnimaciones,
  QuitarFondoDeHoja,
  QuitarFondoEnLote,
  RedimensionarHoja,
  RestaurarImagenOriginal,
} from "./casosDeUso";
import type { ColorRgb, ProcesadorDeImagenes } from "./puertos";

/** Un procesador falso: no toca píxeles, sólo "dice" el tamaño. Así testeamos la lógica sin navegador. */
class ProcesadorFalso implements ProcesadorDeImagenes {
  /** Cuántos píxeles de fondo va a decir que encontró. En 0 simula una hoja sin fondo que sacar. */
  pixelesDeFondo = 10;
  constructor(private tamanio = Tamanio.crear(192, 192)) {}
  async decodificar(archivo: Blob) {
    return { png: archivo, tamanio: this.tamanio };
  }
  async redimensionar(_png: Blob, t: Tamanio) {
    return new Blob([`png ${t}`], { type: "image/png" });
  }
  async quitarColor(png: Blob, color: ColorRgb) {
    if (!this.pixelesDeFondo) return { png, pixeles: 0 };
    return { png: new Blob([`sin ${color.r},${color.g},${color.b}`], { type: "image/png" }), pixeles: this.pixelesDeFondo };
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

describe("Cargar hojas en lote", () => {
  const imagen = (nombreArchivo: string) => ({ archivo: new Blob(["x"], { type: "image/png" }), nombreArchivo });

  function armarLote() {
    const { repo, imagenes, ids, proc, crear } = armar();
    return { repo, imagenes, crear, lote: new CargarHojasEnLote(repo, imagenes, proc, ids) };
  }

  it("crea una hoja por imagen, sin animaciones y sin copia original", async () => {
    const { lote, repo, imagenes } = armarLote();
    const r = await lote.ejecutar({ imagenes: [imagen("205.png"), imagen("12.png")] });

    expect(r.creadas.map((h) => h.nombreArchivo)).toEqual(["12.png", "205.png"]);
    expect(await repo.listar()).toHaveLength(2);
    const hoja = r.creadas[0]!;
    // Las animaciones las pone el importador del clásico; una vacía por hoja serían miles de ruido.
    expect(hoja.animaciones).toHaveLength(0);
    expect(hoja.tamanio?.toString()).toBe("192×192");
    expect(await imagenes.leer(hoja.id, "actual")).not.toBeNull();
    // La original la guarda el primer redimensionado: en un lote de miles duplicaría el disco al toque.
    expect(await imagenes.leer(hoja.id, "original")).toBeNull();
  });

  it("saltea lo que ya está cargado, aunque la extensión sea otra", async () => {
    const { lote, crear } = armarLote();
    await crear.ejecutar({ archivo: new Blob(["x"]), nombreArchivo: "205.bmp" });

    const r = await lote.ejecutar({ imagenes: [imagen("205.png"), imagen("12.png")] });

    expect(r.creadas.map((h) => h.nombreArchivo)).toEqual(["12.png"]);
    expect(r.yaEstaban).toBe(1);
  });

  it("no carga dos veces el mismo número dentro del lote", async () => {
    const { lote } = armarLote();
    const r = await lote.ejecutar({ imagenes: [imagen("205.png"), imagen("205.bmp")] });

    expect(r.creadas).toHaveLength(1);
    expect(r.yaEstaban).toBe(1);
  });

  it("con soloEstas trae nada más que las que hacen falta", async () => {
    const { lote } = armarLote();
    const r = await lote.ejecutar({ imagenes: [imagen("1.png"), imagen("205.png"), imagen("12.png")], soloEstas: ["205", "12"] });

    expect(r.creadas.map((h) => h.nombreArchivo)).toEqual(["12.png", "205.png"]);
    expect(r.deMas).toBe(1);
  });

  it("una imagen ilegible no corta el lote: queda anotada", async () => {
    const { repo, imagenes, ids } = armar();
    const roto = new ProcesadorFalso();
    roto.decodificar = async (archivo: Blob) => {
      if (archivo.size === 4) throw new ErrorDeDominio("No se pudo leer la imagen.");
      return { png: archivo, tamanio: Tamanio.crear(192, 192) };
    };
    const lote = new CargarHojasEnLote(repo, imagenes, roto, ids);

    const r = await lote.ejecutar({
      imagenes: [imagen("1.png"), { archivo: new Blob(["malo"], { type: "image/png" }), nombreArchivo: "2.png" }, imagen("3.png")],
    });

    expect(r.creadas.map((h) => h.nombreArchivo)).toEqual(["1.png", "3.png"]);
    expect(r.fallidas).toEqual([{ nombreArchivo: "2.png", motivo: "No se pudo leer la imagen." }]);
  });

  it("avisa el avance hasta el total", async () => {
    const { lote } = armarLote();
    const avances: number[] = [];
    await lote.ejecutar({ imagenes: [imagen("1.png"), imagen("2.png"), imagen("3.png")], alAvanzar: (hechas) => avances.push(hechas), enParalelo: 1 });

    expect(avances).toEqual([1, 2, 3]);
  });
  describe("Quitar el fondo", () => {
    it("deja la imagen nueva y sube la versión, sin tocar el tamaño original", async () => {
      const { crear, repo, imagenes, proc } = armar();
      const h = await crear.ejecutar({ archivo: new Blob(["x"]), nombreArchivo: "cuerpo.png" });
      const antes = await imagenes.leer(h.id, "actual");

      const r = await new QuitarFondoDeHoja(repo, imagenes, proc).ejecutar({ hojaId: h.id });

      expect(r.pixeles).toBe(10);
      expect(r.hoja.versionImagen).toBe(h.versionImagen + 1);
      expect(r.hoja.tamanio?.toString()).toBe(h.tamanio?.toString());
      expect(await (await imagenes.leer(h.id, "actual"))!.text()).toBe("sin 0,0,0");
      // La original queda como estaba: sacar el fondo no es redimensionar.
      expect(await (await imagenes.leer(h.id, "original"))!.text()).toBe(await antes!.text());
    });

    it("una hoja sin ese color no se vuelve a guardar", async () => {
      const { crear, repo, imagenes, proc } = armar();
      const h = await crear.ejecutar({ archivo: new Blob(["x"]), nombreArchivo: "cuerpo.png" });
      proc.pixelesDeFondo = 0;

      const r = await new QuitarFondoDeHoja(repo, imagenes, proc).ejecutar({ hojaId: h.id });

      expect(r.pixeles).toBe(0);
      expect(r.hoja.versionImagen).toBe(h.versionImagen);
    });

    it("en lote cuenta las limpiadas, las que no tenían fondo y las que fallan", async () => {
      const { crear, repo, imagenes, proc } = armar();
      const a = await crear.ejecutar({ archivo: new Blob(["x"]), nombreArchivo: "a.png" });
      const b = await crear.ejecutar({ archivo: new Blob(["x"]), nombreArchivo: "b.png" });
      const lote = new QuitarFondoEnLote(new QuitarFondoDeHoja(repo, imagenes, proc));
      const avances: number[] = [];

      const r = await lote.ejecutar({ hojaIds: [a.id, b.id, "no-existe"], alAvanzar: (h) => avances.push(h), enParalelo: 1 });

      expect(r.limpiadas.map((h) => h.nombreArchivo)).toEqual(["a.png", "b.png"]);
      expect(r.pixeles).toBe(20);
      expect(r.sinFondo).toBe(0);
      expect(r.fallidas).toEqual([{ hojaId: "no-existe", motivo: "Esa hoja ya no existe." }]);
      expect(avances).toEqual([1, 2, 3]);
    });
  });
});
