import { describe, expect, it } from "vitest";
import { ExportarGraficosIni, GrhDeRecorte } from "./aplicacion/casosDeUso";
import { TablaDeGrh, type Grh } from "./dominio/TablaDeGrh";
import { EscritorGraficosIni } from "./infraestructura/EscritorGraficosIni";
import { LectorGraficosIni } from "./infraestructura/LectorGraficosIni";
import { MemoriaTablaDeGrh } from "./infraestructura/memoria";

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
