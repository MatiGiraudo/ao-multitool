import { describe, expect, it } from "vitest";
import { baseDeArchivo } from "@/compartido/dominio/nombreDeArchivo";
import { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import type { HojaRepositorio } from "@/graficos/dominio/HojaRepositorio";
import { MemoriaAlmacenDeImagenes, MemoriaHojaRepositorio } from "@/graficos/infraestructura/memoria";
import { ExportarGraficosIni, ExportarHojasPropias, GrhDelProyecto, ImportarTablaDeGrh } from "./aplicacion/casosDeUso";
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

/** Un proyecto con esas hojas cargadas. El id de cada una es su nombre sin extensión. */
async function conHojas(...nombres: string[]): Promise<MemoriaHojaRepositorio> {
  const repo = new MemoriaHojaRepositorio();
  for (const nombre of nombres) await repo.guardar(HojaDeSprites.crear(baseDeArchivo(nombre), nombre, `${nombre}-a`));
  return repo;
}

describe("números de GRH propios", () => {
  it("el próximo número es uno más que el mayor, no uno más que la cantidad", () => {
    const tabla = TablaDeGrh.desde([estatico(1, "12", 0, 0), estatico(9000, "12", 32, 0)]);
    expect(tabla.proximoNumero()).toBe(9001);
    expect(TablaDeGrh.vacia().proximoNumero()).toBe(1);
  });

  it("reusa el número si ese recorte ya tenía uno", async () => {
    const repo = new MemoriaTablaDeGrh();
    await repo.guardar(TablaDeGrh.desde([estatico(505, "12", 32, 64)]));

    const r = await new GrhDelProyecto(repo, await conHojas("12.png")).deRecorte({ hojaId: "12", x: 32, y: 64, ancho: 32, alto: 32 });

    expect(r).toEqual({ numero: 505, creado: false, archivo: "12", asignado: false });
  });

  it("inventa uno y lo guarda si el recorte es nuevo", async () => {
    const repo = new MemoriaTablaDeGrh();
    await repo.guardar(TablaDeGrh.desde([estatico(505, "12", 32, 64)]));
    const hojas = await conHojas("12.png", "77.png");

    const r = await new GrhDelProyecto(repo, hojas).deRecorte({ hojaId: "77", x: 0, y: 0, ancho: 32, alto: 32 });

    expect(r).toEqual({ numero: 506, creado: true, archivo: "77", asignado: false });
    const tabla = await repo.leer();
    expect(tabla?.obtener(506)).toMatchObject({ archivo: "77", x: 0, y: 0, ancho: 32, alto: 32 });
    // Y preguntar de nuevo por el mismo recorte devuelve el que acaba de crear.
    expect(await new GrhDelProyecto(repo, hojas).deRecorte({ hojaId: "77", x: 0, y: 0, ancho: 32, alto: 32 })).toMatchObject({
      numero: 506,
      creado: false,
    });
  });

  it("dos recortes elegidos a la vez se llevan números distintos", async () => {
    // Elegir dos tiles seguidos es lo normal, y leer-elegir-guardar no puede solaparse: si los dos
    // leen la misma tabla se llevan el mismo número y el segundo guardado borra al primero.
    const repo = new MemoriaTablaDeGrh();
    await repo.guardar(TablaDeGrh.desde([estatico(10, "1", 0, 0)]));
    const caso = new GrhDelProyecto(repo, await conHojas("1.png", "2.png"));

    const [a, b] = await Promise.all([
      caso.deRecorte({ hojaId: "2", x: 0, y: 0, ancho: 32, alto: 32 }),
      caso.deRecorte({ hojaId: "2", x: 32, y: 0, ancho: 32, alto: 32 }),
    ]);

    expect([a.numero, b.numero].sort((x, y) => x - y)).toEqual([11, 12]);
    const tabla = await repo.leer();
    expect(tabla?.obtener(11)).not.toBeNull();
    expect(tabla?.obtener(12)).not.toBeNull();
  });

  it("sirve aunque nunca se haya importado un Graficos.ini", async () => {
    const repo = new MemoriaTablaDeGrh();

    const r = await new GrhDelProyecto(repo, await conHojas("3.png")).deRecorte({ hojaId: "3", x: 64, y: 0, ancho: 32, alto: 48 });

    expect(r).toEqual({ numero: 1, creado: true, archivo: "3", asignado: false });
  });

  it("queda marcado como propio, y la marca sobrevive al ida y vuelta del archivo", async () => {
    const repo = new MemoriaTablaDeGrh();
    await new GrhDelProyecto(repo, await conHojas("77.png")).deRecorte({ hojaId: "77", x: 0, y: 0, ancho: 32, alto: 32 });

    const tabla = (await repo.leer())!;
    expect(tabla.obtener(1)?.propio).toBe(true);
    expect(tabla.propios()).toHaveLength(1);

    // Sin la marca en el DTO, el gráfico se guarda pero vuelve como si fuera del clásico, y la
    // próxima importación se lo lleva igual.
    const vuelta = TablaDeGrhMapper.aDominio(TablaDeGrhMapper.aDto(tabla))!;
    expect(vuelta.obtener(1)?.propio).toBe(true);
  });
});

describe("el número de archivo de una hoja", () => {
  /*
   * El `FileNum` del Graficos.ini es un número y nada más. Una hoja que se llama `pasto.png` no
   * tiene ninguno, y escribir su nombre ahí no da un archivo mal escrito: da otro archivo, porque
   * al leerlo de vuelta `pasto` es NaN y queda en 0.
   */

  it("una hoja con nombre propio se lleva un número libre, y el archivo se puede volver a leer", async () => {
    const repo = new MemoriaTablaDeGrh();
    await repo.guardar(TablaDeGrh.desde([estatico(1, "12", 0, 0)]));
    const hojas = await conHojas("12.png", "pasto.png");

    const r = await new GrhDelProyecto(repo, hojas).deRecorte({ hojaId: "pasto", x: 32, y: 0, ancho: 32, alto: 32 });

    expect(r).toEqual({ numero: 2, creado: true, archivo: "13", asignado: true });
    expect((await hojas.obtener("pasto"))?.numeroDeArchivo).toBe(13);

    const texto = new EscritorGraficosIni().escribir((await repo.leer())!);
    expect(texto).toContain("Grh2=1-13-32-0-32-32");
    const vuelta = TablaDeGrh.desde(new LectorGraficosIni().leer(texto));
    expect(vuelta.obtener(2)?.archivo).toBe("13");
  });

  it("el número se lo queda: elegir otro tile de la misma hoja no le da uno nuevo", async () => {
    const repo = new MemoriaTablaDeGrh();
    const hojas = await conHojas("pasto.png");
    const caso = new GrhDelProyecto(repo, hojas);

    const primero = await caso.deRecorte({ hojaId: "pasto", x: 0, y: 0, ancho: 32, alto: 32 });
    const segundo = await caso.deRecorte({ hojaId: "pasto", x: 32, y: 0, ancho: 32, alto: 32 });

    expect(primero).toEqual({ numero: 1, creado: true, archivo: "1", asignado: true });
    expect(segundo).toEqual({ numero: 2, creado: true, archivo: "1", asignado: false });
  });

  it("los GRH que ya nombraban la hoja por su nombre pasan al número", async () => {
    // Es lo que tiene pintado un proyecto hecho con la versión que escribía `pasto` en el archivo:
    // los mapas guardados usan el grh 7, así que el 7 tiene que seguir siendo el mismo recorte.
    const repo = new MemoriaTablaDeGrh();
    await repo.guardar(TablaDeGrh.desde([estatico(7, "pasto", 0, 0)]));
    const hojas = await conHojas("pasto.png");

    const r = await new GrhDelProyecto(repo, hojas).deRecorte({ hojaId: "pasto", x: 0, y: 0, ancho: 32, alto: 32 });

    expect(r).toEqual({ numero: 7, creado: false, archivo: "1", asignado: true });
    expect((await repo.leer())?.obtener(7)).toMatchObject({ archivo: "1", x: 0, y: 0 });
  });

  it("no le pisa el número a un archivo que la tabla ya menciona, aunque su hoja no esté cargada", async () => {
    // Después de importar un cliente la tabla nombra miles de archivos y las hojas se cargan
    // cuando hacen falta: mirar sólo las cargadas repartiría un número que ya es de otro.
    const repo = new MemoriaTablaDeGrh();
    await repo.guardar(TablaDeGrh.desde([estatico(1, "9000", 0, 0)]));

    const r = await new GrhDelProyecto(repo, await conHojas("pasto.png")).deRecorte({ hojaId: "pasto", x: 0, y: 0, ancho: 32, alto: 32 });

    expect(r.archivo).toBe("9001");
  });

  it("una hoja que ya se llama por número no recibe otro", async () => {
    const hojas = await conHojas("12.png");

    const r = await new GrhDelProyecto(new MemoriaTablaDeGrh(), hojas).deRecorte({ hojaId: "12", x: 0, y: 0, ancho: 32, alto: 32 });

    expect(r).toMatchObject({ archivo: "12", asignado: false });
    expect((await hojas.obtener("12"))?.numeroDeArchivo).toBeNull();
  });

  it("si la hoja ya no está, lo dice en vez de inventar un gráfico", async () => {
    const caso = new GrhDelProyecto(new MemoriaTablaDeGrh(), new MemoriaHojaRepositorio());
    await expect(caso.deRecorte({ hojaId: "fantasma", x: 0, y: 0, ancho: 32, alto: 32 })).rejects.toThrow(/hoja/i);
  });
});

describe("ExportarHojasPropias", () => {
  const png = (texto: string) => new Blob([texto], { type: "image/png" });

  it("saca las hojas que el cliente no tiene, con el nombre que les dio el proyecto", async () => {
    const hojas = await conHojas("12.png", "pasto.png");
    await hojas.guardar((await hojas.obtener("pasto"))!.conNumeroDeArchivo(13));
    const imagenes = new MemoriaAlmacenDeImagenes();
    await imagenes.guardar("pasto", png("dibujo"), "actual");
    await imagenes.guardar("12", png("del cliente"), "actual");

    const archivos = await new ExportarHojasPropias(hojas, imagenes).ejecutar();

    // La 12 ya está en la carpeta del juego: devolverla sería copiar el cliente adentro del cliente.
    expect(archivos).toHaveLength(1);
    expect(archivos[0]).toMatchObject({ nombreArchivo: "13.png", carpeta: "Graficos" });
    expect(new TextDecoder().decode(archivos[0]!.contenido)).toBe("dibujo");
  });

  it("una hoja sin imagen cargada no sale", async () => {
    const hojas = await conHojas("pasto.png");
    await hojas.guardar((await hojas.obtener("pasto"))!.conNumeroDeArchivo(13));

    expect(await new ExportarHojasPropias(hojas, new MemoriaAlmacenDeImagenes()).ejecutar()).toEqual([]);
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
    const propio = await new GrhDelProyecto(repo, await conHojas("77.png")).deRecorte({ hojaId: "77", x: 0, y: 0, ancho: 32, alto: 32 });
    expect(propio).toMatchObject({ numero: 3, creado: true });

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
    await new GrhDelProyecto(repo, await conHojas("77.png")).deRecorte({ hojaId: "77", x: 0, y: 0, ancho: 32, alto: 32 });

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
