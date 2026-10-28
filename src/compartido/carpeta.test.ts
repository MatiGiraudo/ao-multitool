import { describe, expect, it } from "vitest";
import { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import { Tamanio } from "@/graficos/dominio/Tamanio";
import { CarpetaAlmacenDeImagenes } from "@/graficos/infraestructura/carpeta/CarpetaAlmacenDeImagenes";
import { CarpetaHojaRepositorio } from "@/graficos/infraestructura/carpeta/CarpetaHojaRepositorio";
import { TablaDeGrh } from "@/importacion/dominio/TablaDeGrh";
import { CarpetaTablaDeGrh } from "@/importacion/infraestructura/carpeta/CarpetaTablaDeGrh";
import { Mapa } from "@/mapas/dominio/Mapa";
import { CarpetaMapaRepositorio } from "@/mapas/infraestructura/carpeta/CarpetaMapaRepositorio";
import { Objeto } from "@/objetos/dominio/Objeto";
import { ObjetoMapper, type ObjetoDto } from "@/objetos/infraestructura/ObjetoDto";
import { CarpetaAlmacenDeExportacion } from "@/proyecto/infraestructura/carpeta/CarpetaAlmacenDeExportacion";
import { CarpetaColeccionRepositorio } from "./infraestructura/carpeta/CarpetaColeccionRepositorio";
import { CarpetaDelProyecto } from "./infraestructura/carpeta/CarpetaDelProyecto";
import { carpetaDePrueba } from "./infraestructura/carpeta/memoria";

/*
 * El modo carpeta: el editor leyendo y escribiendo en una carpeta del usuario.
 *
 * Lo que de verdad se cuida acá es que el formato sea el MISMO que escribe el modo servidor. Si
 * se separan, una carpeta deja de poder abrirse con los dos modos y el proyecto se parte en dos.
 */

const objeto = (clave: string, numero: number, nombre: string) => Objeto.crear(clave, numero).renombrado(nombre);

describe("CarpetaDelProyecto", () => {
  it("sin carpeta elegida no deja escribir, y lo dice", async () => {
    await expect(new CarpetaDelProyecto().escribir(["a.json"], "{}")).rejects.toThrow(/carpeta del proyecto/);
  });

  it("crea las subcarpetas al escribir y las encuentra al leer", async () => {
    const { carpeta } = carpetaDePrueba();
    await carpeta.escribir(["mapas", "1.json"], '{"numero":1}');
    expect(await carpeta.leerTexto(["mapas", "1.json"])).toBe('{"numero":1}');
    expect(await carpeta.listar(["mapas"])).toEqual(["1.json"]);
  });

  it("leer algo que no está devuelve null, no una excepción", async () => {
    const { carpeta } = carpetaDePrueba();
    expect(await carpeta.leerTexto(["objetos", "objetos.json"])).toBeNull();
    expect(await carpeta.listar(["todavia-no-existe"])).toEqual([]);
    await carpeta.borrar(["ni-esto", "x.json"]);
  });
});

describe("CarpetaColeccionRepositorio", () => {
  const conObjetos = () => {
    const prueba = carpetaDePrueba();
    const repo = new CarpetaColeccionRepositorio<Objeto, ObjetoDto>(prueba.carpeta, ["objetos", "objetos.json"], ObjetoMapper, (o) => o.clave);
    return { ...prueba, repo };
  };

  it("escribe el mismo archivo que el modo servidor: ordenado, indentado y con salto final", async () => {
    const { repo, contenidoDe } = conObjetos();
    await repo.guardar(objeto("b", 2, "Espada"));
    await repo.guardar(objeto("a", 1, "Daga"));

    const texto = (await contenidoDe("objetos", "objetos.json"))!;
    expect(texto.endsWith("]\n")).toBe(true);
    expect(texto).toContain('  {\n    "clave"');
    expect((JSON.parse(texto) as ObjetoDto[]).map((d) => d.numero)).toEqual([1, 2]);
  });

  it("guardar, listar, reemplazar y eliminar", async () => {
    const { repo } = conObjetos();
    await repo.guardarVarios([objeto("a", 1, "Daga"), objeto("b", 2, "Espada")]);
    expect((await repo.listar()).map((o) => o.nombre)).toEqual(["Daga", "Espada"]);

    await repo.guardar(objeto("a", 1, "Daga corta"));
    expect((await repo.listar()).map((o) => o.nombre)).toEqual(["Daga corta", "Espada"]);

    await repo.eliminar("a");
    expect((await repo.listar()).map((o) => o.clave)).toEqual(["b"]);
  });

  it("dos guardados a la vez no se pisan", async () => {
    // Sin la cola, los dos leen el archivo vacío y el segundo borra al primero.
    const { repo } = conObjetos();
    await Promise.all([repo.guardar(objeto("a", 1, "Daga")), repo.guardar(objeto("b", 2, "Espada"))]);
    expect((await repo.listar()).map((o) => o.clave).sort()).toEqual(["a", "b"]);
  });

  it("un archivo vacío o con basura no voltea la pantalla", async () => {
    const { repo, carpeta } = conObjetos();
    await carpeta.escribir(["objetos", "objetos.json"], "   ");
    expect(await repo.listar()).toEqual([]);
    await carpeta.escribir(["objetos", "objetos.json"], '{"no":"es una lista"}');
    expect(await repo.listar()).toEqual([]);
  });
});

describe("CarpetaHojaRepositorio", () => {
  const hoja = (id: string, archivo: string) => HojaDeSprites.crear(id, archivo, `${id}-a`).conImagenNueva(Tamanio.crear(64, 64));

  it("una hoja por archivo, con el nombre del id", async () => {
    const { carpeta, nombresEn } = carpetaDePrueba();
    const repo = new CarpetaHojaRepositorio(carpeta);
    await repo.guardar(hoja("abc123", "12.png"));
    await repo.guardar(hoja("def456", "13.png"));

    expect(nombresEn("graficos")).toEqual(["abc123.json", "def456.json"]);
    expect((await repo.listar()).map((h) => h.nombreArchivo).sort()).toEqual(["12.png", "13.png"]);
    expect((await repo.obtener("abc123"))?.nombreArchivo).toBe("12.png");

    await repo.eliminar("abc123");
    expect(await repo.obtener("abc123")).toBeNull();
    expect(await repo.listar()).toHaveLength(1);
  });

  it("un id que no sirve como nombre de archivo no llega al disco", async () => {
    const repo = new CarpetaHojaRepositorio(carpetaDePrueba().carpeta);
    await expect(repo.obtener("../../otra-carpeta")).rejects.toThrow(/Identificador/);
  });
});

describe("CarpetaAlmacenDeImagenes", () => {
  const png = () => new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });

  it("guarda el PNG al lado del JSON de la hoja", async () => {
    const { carpeta, nombresEn } = carpetaDePrueba();
    const almacen = new CarpetaAlmacenDeImagenes(carpeta);

    await almacen.guardar("abc123", png(), "actual");
    await almacen.guardar("abc123", png(), "original");
    expect(nombresEn("graficos")).toEqual(["abc123.original.png", "abc123.png"]);

    expect(await almacen.leer("abc123", "actual")).not.toBeNull();
    await almacen.eliminar("abc123");
    expect(await almacen.leer("abc123", "actual")).toBeNull();
    expect(await almacen.leer("abc123", "original")).toBeNull();
  });

  it("la URL no está hasta que se leyó el archivo, y entonces avisa", async () => {
    const { carpeta } = carpetaDePrueba();
    const almacen = new CarpetaAlmacenDeImagenes(carpeta);
    await almacen.guardar("abc123", png(), "actual");

    let avisos = 0;
    almacen.alCambiar(() => avisos++);

    // La primera vez devuelve vacío y dispara la lectura: es lo que la interfaz trata como «todavía no».
    expect(almacen.urlDe("abc123", 1)).toBe("");
    await new Promise((listo) => setTimeout(listo, 10));
    expect(avisos).toBe(1);
    expect(almacen.urlDe("abc123", 1)).toMatch(/^blob:/);
    // Y la segunda no vuelve a leer ni a avisar.
    expect(avisos).toBe(1);
  });
});

describe("CarpetaTablaDeGrh y CarpetaMapaRepositorio", () => {
  it("la tabla se guarda con una línea por GRH, como en el servidor", async () => {
    const { carpeta, contenidoDe } = carpetaDePrueba();
    const repo = new CarpetaTablaDeGrh(carpeta);
    await repo.guardar(TablaDeGrh.desde([{ numero: 1, archivo: "12", x: 0, y: 0, ancho: 32, alto: 32, cuadros: [], msDelCiclo: 0 }]));

    const texto = (await contenidoDe("importacion", "grh.json"))!;
    expect(texto.startsWith('{\n  "formato": "ao-grh"')).toBe(true);
    expect(texto).toContain('\n    {"numero":1');
    expect((await repo.leer())?.cantidad).toBe(1);
  });

  it("los mapas van de a uno, por número", async () => {
    const { carpeta, nombresEn } = carpetaDePrueba();
    const repo = new CarpetaMapaRepositorio(carpeta);
    await repo.guardar({ mapa: Mapa.vacio(7, { nombre: "Nix" }), anchoDeGrafico: 4, nombreArchivo: "Mapa7" });

    expect(nombresEn("mapas")).toEqual(["7.json"]);
    expect(await repo.listar()).toEqual([{ numero: 7, nombre: "Nix", nombreArchivo: "Mapa7" }]);
    expect((await repo.obtener(7))?.mapa.info.nombre).toBe("Nix");

    await repo.eliminar(7);
    expect(await repo.listar()).toEqual([]);
  });
});

describe("CarpetaAlmacenDeExportacion", () => {
  it("escribe en exportado/, y los mapas en su subcarpeta", async () => {
    const { carpeta, nombresEn, contenidoDe } = carpetaDePrueba();

    const r = await new CarpetaAlmacenDeExportacion(carpeta).guardar([
      { nombreArchivo: "objetos.json", contenido: "[]" },
      { nombreArchivo: "Mapa1.map", contenido: new Uint8Array([1, 2, 3]), carpeta: "Mundos" },
    ]);

    expect(r.escritos).toBe(2);
    expect(nombresEn("exportado")).toEqual(["Mundos", "objetos.json"]);
    expect(nombresEn("exportado", "Mundos")).toEqual(["Mapa1.map"]);
    expect(await contenidoDe("exportado", "objetos.json")).toBe("[]");
  });

  it("un nombre con rutas adentro no escribe fuera de la carpeta", async () => {
    const { carpeta, nombresEn } = carpetaDePrueba();
    await new CarpetaAlmacenDeExportacion(carpeta).guardar([{ nombreArchivo: "../../afuera.json", contenido: "{}" }]);
    expect(nombresEn("exportado")).toEqual(["afuera.json"]);
  });
});
