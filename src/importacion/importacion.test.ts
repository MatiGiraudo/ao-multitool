import { describe, expect, it } from "vitest";
import { GeneradorDeIdsSecuencial } from "@/compartido/infraestructura/GeneradorDeIdsAleatorio";
import { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import { CatalogoGraficoDesdeHojas } from "@/graficos/infraestructura/CatalogoGraficoDesdeHojas";
import { MemoriaHojaRepositorio } from "@/graficos/infraestructura/memoria";
import { ImportarObjetos } from "@/objetos/aplicacion/casosDeUso";
import { FormatoAoObjs } from "@/objetos/infraestructura/FormatoAoObjs";
import { MemoriaObjetoRepositorio } from "@/objetos/infraestructura/memoria";
import { ImportarHechizos } from "@/hechizos/aplicacion/casosDeUso";
import { FormatoAoSpells } from "@/hechizos/infraestructura/FormatoAoSpells";
import { MemoriaHechizoRepositorio } from "@/hechizos/infraestructura/memoria";
import { ImportarHechizosClasicos, ImportarObjetosClasicos, ImportarTablaDeGrh } from "./aplicacion/casosDeUso";
import { TablaDeGrh } from "./dominio/TablaDeGrh";
import { LectorGraficosIni } from "./infraestructura/LectorGraficosIni";
import { LectorHechizosDat } from "./infraestructura/LectorHechizosDat";
import { ArchivoIni } from "./infraestructura/LectorIni";
import { LectorObjDat } from "./infraestructura/LectorObjDat";
import { MemoriaTablaDeGrh } from "./infraestructura/memoria";

const GRAFICOS_INI = `﻿[INIT]
NumGrhs=3

' un gráfico suelto, con el tamaño en tiles
[Grh1]
NumFrames=1
FileNum=12
sX=0
sY=0
Tile_Ancho=1
Tile_Alto=2

[GRH2]
numframes=1
filenum=12
sx=32
sY=0
Tile_Ancho=1
Tile_Alto=2

; una animación de dos cuadros
[Grh3]
NumFrames=2
Frame1=1
Frame2=2
Speed=240

[Grh4]
NumFrames=1
FileNum=99
sX=10
sY=20
Tile_Ancho=64
Tile_Alto=48
`;

const OBJ_DAT = `[OBJ1]
Name=Daga
ObjType=2
GrhIndex=1
MinHIT=1
MaxHIT=4
Valor=50
Newbie=1
Crucial=1

[OBJ2]
Name=Poción roja
ObjType=11
GrhIndex=3
TipoPocion=3
MinModificador=5
MaxModificador=10
DuracionEfecto=0
Valor=20

[OBJ3]
Name=Casco de hierro
ObjType=17
GrhIndex=4
MinDef=2
MaxDef=4
`;

describe("ArchivoIni", () => {
  const ini = ArchivoIni.parsear(GRAFICOS_INI);

  it("perdona BOM, comentarios y mayúsculas", () => {
    expect(ini.entero("grh2", "FileNum")).toBe(12);
    expect(ini.entero("GRH2", "filenum")).toBe(12);
    expect(ini.texto("grh1", "noExiste", "nada")).toBe("nada");
  });

  it("encuentra las secciones numeradas, en orden", () => {
    expect(ini.numeradas("grh").map((s) => s.numero)).toEqual([1, 2, 3, 4]);
    expect(ini.numeradas("obj")).toEqual([]);
  });

  it("una bandera es cualquier cosa que no sea 0 ni vacío", () => {
    const b = ArchivoIni.parsear("[A]\nUno=1\nCero=0\nVacio=\nNo=no");
    expect(b.bandera("a", "Uno")).toBe(true);
    expect(b.bandera("a", "Cero")).toBe(false);
    expect(b.bandera("a", "Vacio")).toBe(false);
    expect(b.bandera("a", "No")).toBe(false);
  });
});

describe("LectorGraficosIni", () => {
  const grhs = new LectorGraficosIni().leer(GRAFICOS_INI);
  const tabla = TablaDeGrh.desde(grhs);

  it("pasa de tiles a píxeles, y deja en paz lo que ya viene en píxeles", () => {
    expect(tabla.obtener(1)).toMatchObject({ archivo: "12", x: 0, y: 0, ancho: 32, alto: 64 });
    expect(tabla.obtener(4)).toMatchObject({ ancho: 64, alto: 48 });
  });

  it("resuelve un GRH animado a los recortes de sus cuadros", () => {
    expect(tabla.recortes(3)).toEqual({
      archivo: "12",
      rects: [
        { x: 0, y: 0, ancho: 32, alto: 64 },
        { x: 32, y: 0, ancho: 32, alto: 64 },
      ],
      msPorFrame: 120,
    });
  });

  it("lista los archivos que hacen falta", () => {
    expect(tabla.archivos()).toEqual(["12", "99"]);
  });

  it("avisa si el archivo no es un Graficos.ini", () => {
    expect(() => new LectorGraficosIni().leer("[OBJ1]\nName=Daga")).toThrow();
  });
});

describe("LectorObjDat", () => {
  const objetos = new LectorObjDat().leer(OBJ_DAT);

  it("traduce los ObjType del clásico a los tipos del editor", () => {
    expect(objetos.map((o) => o.tipo)).toEqual(["arma", "pocion", "casco"]);
  });

  it("trae atributos según el tipo, y banderas", () => {
    expect(objetos[0]).toMatchObject({ numero: 1, nombre: "Daga", valor: 50, atributos: { minHit: 1, maxHit: 4 } });
    expect(objetos[0]!.banderas).toEqual(["newbie", "noCae"]);
    expect(objetos[1]!.atributos).toEqual({ efecto: "vida", min: 5, max: 10 });
    expect(objetos[2]!.atributos).toEqual({ minDef: 2, maxDef: 4 });
  });

  it("deduce qué se apila a partir del tipo", () => {
    expect(objetos.map((o) => o.apilable)).toEqual([false, true, false]);
  });

  it("avisa si el archivo no es un OBJ.dat", () => {
    expect(() => new LectorObjDat().leer("[Grh1]\nNumFrames=1")).toThrow();
  });
});

describe("ImportarTablaDeGrh", () => {
  it("guarda la tabla y dice qué hojas faltan cargar", async () => {
    const hojas = new MemoriaHojaRepositorio();
    await hojas.guardar(HojaDeSprites.crear("h1", "12.png", "a1"));
    const tablas = new MemoriaTablaDeGrh();

    const r = await new ImportarTablaDeGrh(new LectorGraficosIni(), tablas, hojas).ejecutar(GRAFICOS_INI);
    expect(r).toEqual({ grhs: 4, archivos: ["12", "99"], cargados: ["12"], faltantes: ["99"] });
    expect((await tablas.leer())?.cantidad).toBe(4);
  });
});

describe("ImportarObjetosClasicos", () => {
  async function escenario() {
    const hojas = new MemoriaHojaRepositorio();
    await hojas.guardar(HojaDeSprites.crear("h1", "12.png", "a1").sinAnimacion("a1"));
    const tablas = new MemoriaTablaDeGrh();
    await tablas.guardar(TablaDeGrh.desde(new LectorGraficosIni().leer(GRAFICOS_INI)));
    const objetos = new MemoriaObjetoRepositorio();
    const ids = new GeneradorDeIdsSecuencial();
    const caso = new ImportarObjetosClasicos(
      new LectorObjDat(),
      tablas,
      hojas,
      new ImportarObjetos(objetos, new FormatoAoObjs(), ids),
      (hs) => new CatalogoGraficoDesdeHojas(hs),
      ids,
    );
    return { caso, hojas, objetos };
  }

  it("crea las animaciones que hacen falta y vincula los iconos", async () => {
    const { caso, hojas, objetos } = await escenario();
    const r = await caso.ejecutar(OBJ_DAT);

    expect(r.objetos).toMatchObject({ agregados: 3, reemplazados: 0 });
    // grh1 (la daga) y grh3 (la poción, animada). El casco usa grh4, que vive en una hoja que no está.
    expect(r.animacionesCreadas).toBe(2);
    expect(r.hojasFaltantes).toEqual(["99"]);
    expect(r.grhSinResolver).toEqual([]);

    const hoja = (await hojas.listar())[0]!;
    expect(hoja.animaciones.map((a) => a.nombre).sort()).toEqual(["grh1", "grh3"]);
    expect(hoja.animacionLlamada("grh3")!.cantidadDeFrames).toBe(2);

    const daga = (await objetos.listar()).find((o) => o.numero === 1)!;
    expect(daga.graficos.icono).toMatchObject({ tipo: "vinculada", hojaId: "h1" });
    const casco = (await objetos.listar()).find((o) => o.numero === 3)!;
    expect(casco.graficos.icono).toBeNull();
  });

  it("no duplica animaciones ni objetos al importar dos veces", async () => {
    const { caso, hojas, objetos } = await escenario();
    await caso.ejecutar(OBJ_DAT);
    const r = await caso.ejecutar(OBJ_DAT);

    expect(r.animacionesCreadas).toBe(0);
    expect(r.objetos).toMatchObject({ agregados: 0, reemplazados: 3 });
    expect((await hojas.listar())[0]!.animaciones).toHaveLength(2);
    expect(await objetos.listar()).toHaveLength(3);
  });

  it("sin tabla de GRH importa igual los datos, y anota los gráficos que no pudo resolver", async () => {
    const hojas = new MemoriaHojaRepositorio();
    const objetos = new MemoriaObjetoRepositorio();
    const ids = new GeneradorDeIdsSecuencial();
    const caso = new ImportarObjetosClasicos(
      new LectorObjDat(),
      new MemoriaTablaDeGrh(),
      hojas,
      new ImportarObjetos(objetos, new FormatoAoObjs(), ids),
      (hs) => new CatalogoGraficoDesdeHojas(hs),
      ids,
    );

    const r = await caso.ejecutar(OBJ_DAT);
    expect(r.objetos.agregados).toBe(3);
    expect(r.grhSinResolver).toEqual([1, 3, 4]);
    expect((await objetos.listar()).every((o) => o.graficos.icono === null)).toBe(true);
  });
});

const HECHIZOS_DAT = `[HECHIZO1]
Nombre=Dardo Mágico
Desc=Un dardo de energía
PalabrasMagicas=OHL VOR PEK
Target=2
SubeHP=2
MinHP=5
MaxHP=10
ManaRequerido=10
StaRequerido=2
MinSkill=5
FXgrh=5
WAV=61
NeedStaff=1

[HECHIZO2]
Nombre=Paralizar
PalabrasMagicas=OHL ARIK
Paraliza=1
Duracion=12
ManaRequerido=30
Target=3

[HECHIZO3]
Nombre=Curar heridas
SubeHP=1
MinHP=10
MaxHP=20
ManaRequerido=8

[HECHIZO4]
Nombre=Invocar lobos
Invoca=1
NumNpc=12
Cant=3
ManaRequerido=50

[HECHIZO5]
Nombre=Tormenta de maná
SubeMana=1
MinMana=20
MaxMana=40
ManaRequerido=0
`;

describe("LectorHechizosDat", () => {
  const hechizos = new LectorHechizosDat().leer(HECHIZOS_DAT);

  it("traduce las banderas sueltas del clásico al tipo de efecto", () => {
    expect(hechizos.map((h) => h.tipo)).toEqual(["dano", "paralizar", "curacion", "invocar", "modificar_stat"]);
  });

  it("SubeHP=2 es daño y SubeHP=1 es curación, con su rango", () => {
    expect(hechizos[0]).toMatchObject({ tipo: "dano", atributos: { min: 5, max: 10 } });
    expect(hechizos[2]).toMatchObject({ tipo: "curacion", atributos: { min: 10, max: 20 } });
  });

  it("trae costo, objetivo, FX, sonido y banderas", () => {
    expect(hechizos[0]).toMatchObject({
      numero: 1,
      nombre: "Dardo Mágico",
      palabrasMagicas: "OHL VOR PEK",
      objetivo: "npc",
      mana: 10,
      energia: 2,
      skillRequerido: 5,
      fx: 5,
      sonido: "61",
      banderas: ["baculo"],
    });
    expect(hechizos[1]).toMatchObject({ tipo: "paralizar", objetivo: "ambos", atributos: { duracion: 12 } });
  });

  it("la invocación y los cambios de atributo traen sus datos", () => {
    expect(hechizos[3]!.atributos).toEqual({ npc: 12, cantidad: 3 });
    expect(hechizos[4]!.atributos).toEqual({ stat: "mana", min: 20, max: 40 });
  });

  it("avisa si el archivo no es un Hechizos.dat", () => {
    expect(() => new LectorHechizosDat().leer("[OBJ1]\nName=Daga")).toThrow();
  });
});

describe("ImportarHechizosClasicos", () => {
  it("deja los hechizos listos en el editor, sin duplicar al reimportar", async () => {
    const repo = new MemoriaHechizoRepositorio();
    const caso = new ImportarHechizosClasicos(
      new LectorHechizosDat(),
      new ImportarHechizos(repo, new FormatoAoSpells(), new GeneradorDeIdsSecuencial()),
    );

    expect(await caso.ejecutar(HECHIZOS_DAT)).toEqual({ agregados: 5, reemplazados: 0 });
    expect(await caso.ejecutar(HECHIZOS_DAT)).toEqual({ agregados: 0, reemplazados: 5 });

    const hechizos = await repo.listar();
    expect(hechizos).toHaveLength(5);
    const dardo = hechizos.find((h) => h.numero === 1)!;
    expect(dardo.tipo.id).toBe("dano");
    expect(dardo.atributosVigentes()).toEqual({ min: 5, max: 10 });
    expect(dardo.tieneBandera("baculo")).toBe(true);
  });
});
