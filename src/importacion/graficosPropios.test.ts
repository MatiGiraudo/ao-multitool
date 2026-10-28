import { describe, expect, it } from "vitest";
import type { HojaRepositorio } from "@/graficos/dominio/HojaRepositorio";
import { ExportarGraficosIni, GrhDeRecorte, ImportarTablaDeGrh } from "./aplicacion/casosDeUso";
import { TablaDeGrh, type Grh } from "./dominio/TablaDeGrh";
import { EscritorGraficosIni } from "./infraestructura/EscritorGraficosIni";
import { LectorGraficosIni } from "./infraestructura/LectorGraficosIni";
import { MemoriaTablaDeGrh } from "./infraestructura/memoria";
import { TablaDeGrhMapper } from "./infraestructura/TablaDeGrhDto";

/*
 * Los gráficos que no vienen del clásico: los que el editor inventa cuando pintás un mapa con un
 * recorte de una hoja del proyecto, y el `Graficos.ini` de vuelta para que el juego los conozca.
 */

const estatico = (numero: number, archivo: string, x: number, y: number): Grh => ({
  numero,
  archivo,
  x,
  y,
  ancho: 32,
  alto: 32,
  cuadros: [],
  msDelCiclo: 0,
});

describe("números de GRH propios", () => {
  it("el próximo número es uno más que el mayor, no uno más que la cantidad", () => {
    const tabla = TablaDeGrh.desde([estatico(1, "12", 0, 0), estatico(9000, "12", 32, 0)]);
    expect(tabla.proximoNumero()).toBe(9001);
    expect(TablaDeGrh.vacia().proximoNumero()).toBe(1);
  });

  it("reusa el número si ese recorte ya tenía uno", async () => {
    const repo = new MemoriaTablaDeGrh();
    await repo.guardar(TablaDeGrh.desde([estatico(505, "12", 32, 64)]));

    const r = await new GrhDeRecorte(repo).ejecutar({ archivo: "12", x: 32, y: 64, ancho: 32, alto: 32 });

    expect(r).toEqual({ numero: 505, creado: false });
  });

  it("inventa uno y lo guarda si el recorte es nuevo", async () => {
    const repo = new MemoriaTablaDeGrh();
    await repo.guardar(TablaDeGrh.desde([estatico(505, "12", 32, 64)]));

    const r = await new GrhDeRecorte(repo).ejecutar({ archivo: "77", x: 0, y: 0, ancho: 32, alto: 32 });

    expect(r).toEqual({ numero: 506, creado: true });
    const tabla = await repo.leer();
    expect(tabla?.obtener(506)).toMatchObject({ archivo: "77", x: 0, y: 0, ancho: 32, alto: 32 });
    // Y preguntar de nuevo por el mismo recorte devuelve el que acaba de crear.
    expect(await new GrhDeRecorte(repo).ejecutar({ archivo: "77", x: 0, y: 0, ancho: 32, alto: 32 })).toEqual({ numero: 506, creado: false });
  });

  it("dos recortes elegidos a la vez se llevan números distintos", async () => {
    // Elegir dos tiles seguidos es lo normal, y leer-elegir-guardar no puede solaparse: si los dos
    // leen la misma tabla se llevan el mismo número y el segundo guardado borra al primero.
    const repo = new MemoriaTablaDeGrh();
    await repo.guardar(TablaDeGrh.desde([estatico(10, "1", 0, 0)]));
    const caso = new GrhDeRecorte(repo);

    const [a, b] = await Promise.all([
      caso.ejecutar({ archivo: "2", x: 0, y: 0, ancho: 32, alto: 32 }),
      caso.ejecutar({ archivo: "2", x: 32, y: 0, ancho: 32, alto: 32 }),
    ]);

    expect([a.numero, b.numero].sort((x, y) => x - y)).toEqual([11, 12]);
    const tabla = await repo.leer();
    expect(tabla?.obtener(11)).not.toBeNull();
    expect(tabla?.obtener(12)).not.toBeNull();
  });

  it("sirve aunque nunca se haya importado un Graficos.ini", async () => {
    const repo = new MemoriaTablaDeGrh();

    const r = await new GrhDeRecorte(repo).ejecutar({ archivo: "3", x: 64, y: 0, ancho: 32, alto: 48 });

    expect(r).toEqual({ numero: 1, creado: true });
  });

  it("queda marcado como propio, y la marca sobrevive al ida y vuelta del archivo", async () => {
    const repo = new MemoriaTablaDeGrh();
    await new GrhDeRecorte(repo).ejecutar({ archivo: "77", x: 0, y: 0, ancho: 32, alto: 32 });

    const tabla = (await repo.leer())!;
    expect(tabla.obtener(1)?.propio).toBe(true);
    expect(tabla.propios()).toHaveLength(1);

    // Sin la marca en el DTO, el gráfico se guarda pero vuelve como si fuera del clásico, y la
    // próxima importación se lo lleva igual.
    const vuelta = TablaDeGrhMapper.aDominio(TablaDeGrhMapper.aDto(tabla))!;
    expect(vuelta.obtener(1)?.propio).toBe(true);
  });
});

describe("reimportar el Graficos.ini", () => {
  const INI = ["[Graphics]", "NumGrh=2", "Grh1=1-12-0-0-32-32", "Grh2=1-12-32-0-32-32", ""].join("\r\n");
  const sinHojas = { listar: async () => [] } as unknown as HojaRepositorio;

  const importador = (repo: MemoriaTablaDeGrh) => new ImportarTablaDeGrh(new LectorGraficosIni(), repo, sinHojas);

  it("no se lleva puestos los gráficos del proyecto", async () => {
    const repo = new MemoriaTablaDeGrh();
    const importar = importador(repo);
    await importar.ejecutar(INI);

    // El usuario pinta un mapa con un tile de una hoja propia: el editor le inventa el grh 3.
    const propio = await new GrhDeRecorte(repo).ejecutar({ archivo: "77", x: 0, y: 0, ancho: 32, alto: 32 });
    expect(propio).toEqual({ numero: 3, creado: true });

    // Y más tarde vuelve a importar el Graficos.ini, que no sabe nada de ese gráfico.
    const r = await importar.ejecutar(INI);

    const tabla = await repo.leer();
    expect(tabla?.obtener(3)).toMatchObject({ archivo: "77", propio: true });
    expect(r.propiosConservados).toBe(1);
    expect(r.pisados).toEqual([]);
    expect(r.grhs).toBe(3);
  });

  it("si el archivo nuevo define ese número, gana el propio y lo avisa", async () => {
    const repo = new MemoriaTablaDeGrh();
    const importar = importador(repo);
    await importar.ejecutar(INI);
    await new GrhDeRecorte(repo).ejecutar({ archivo: "77", x: 0, y: 0, ancho: 32, alto: 32 });

    // El cliente nuevo llega más alto y define el 3 como otra cosa. Pisarlo cambiaría, sin avisar,
    // lo que muestran las celdas ya pintadas con el 3.
    const masGrande = ["[Graphics]", "NumGrh=3", "Grh1=1-12-0-0-32-32", "Grh2=1-12-32-0-32-32", "Grh3=1-12-64-0-32-32", ""].join("\r\n");
    const r = await importar.ejecutar(masGrande);

    expect((await repo.leer())?.obtener(3)).toMatchObject({ archivo: "77", propio: true });
    expect(r.pisados).toEqual([3]);
  });

  it("la primera importación no inventa propios", async () => {
    const r = await importador(new MemoriaTablaDeGrh()).ejecutar(INI);
    expect({ propiosConservados: r.propiosConservados, pisados: r.pisados, grhs: r.grhs }).toEqual({
      propiosConservados: 0,
      pisados: [],
      grhs: 2,
    });
  });
});

describe("EscritorGraficosIni", () => {
  it("lo que escribe se vuelve a leer igual", () => {
    const original = TablaDeGrh.desde([
      estatico(1, "12", 0, 0),
      estatico(2, "12", 32, 0),
      { numero: 505, archivo: "", x: 0, y: 0, ancho: 0, alto: 0, cuadros: [1, 2], msDelCiclo: 360 },
    ]);

    const texto = new EscritorGraficosIni().escribir(original);
    const vuelta = TablaDeGrh.desde(new LectorGraficosIni().leer(texto));

    expect(vuelta.datos()).toEqual(original.datos());
    expect(texto).toContain("Grh1=1-12-0-0-32-32");
    expect(texto).toContain("Grh505=2-1-2-360");
  });

  it("el encabezado dice cuál es el GRH más alto", () => {
    const texto = new EscritorGraficosIni().escribir(TablaDeGrh.desde([estatico(7, "1", 0, 0), estatico(9000, "1", 32, 0)]));
    expect(texto.split("\r\n")[1]).toBe("NumGrh=9000");
  });

  it("exportar sin tabla avisa en vez de escribir un archivo vacío", async () => {
    await expect(new ExportarGraficosIni(new MemoriaTablaDeGrh(), new EscritorGraficosIni()).ejecutar()).rejects.toThrow(/tabla de GRH/i);
  });
});
