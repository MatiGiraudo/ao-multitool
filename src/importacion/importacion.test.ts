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
import {
  ImportarCabezasClasicas,
  ImportarCuerposClasicos,
  ImportarEfectosClasicos,
  ImportarHechizosClasicos,
  ImportarObjetosClasicos,
  ImportarTablaDeGrh,
} from "./aplicacion/casosDeUso";
import { PuenteDeGrh } from "./aplicacion/PuenteDeGrh";
import { LectorAparienciasIni } from "./infraestructura/LectorAparienciasIni";
import { LectorFxsIni } from "./infraestructura/LectorFxsIni";
import { TablaDeGrh } from "./dominio/TablaDeGrh";
import { LectorGraficosIni } from "./infraestructura/LectorGraficosIni";
import { LectorHechizosDat } from "./infraestructura/LectorHechizosDat";
import { ArchivoIni } from "./infraestructura/LectorIni";
import { LectorObjDat } from "./infraestructura/LectorObjDat";
import { ImportarApariencias } from "@/apariencias/aplicacion/casosDeUso";
import { ESPECIE_CABEZA } from "@/apariencias/dominio/Cabeza";
import { ESPECIE_CUERPO } from "@/apariencias/dominio/Cuerpo";
import { FormatoAoBodies } from "@/apariencias/infraestructura/FormatoAoBodies";
import { FormatoAoHeads } from "@/apariencias/infraestructura/FormatoAoHeads";
import { MemoriaCabezaRepositorio, MemoriaCuerpoRepositorio } from "@/apariencias/infraestructura/memoria";
import { ImportarEfectos } from "@/fx/aplicacion/casosDeUso";
import { FormatoAoFx } from "@/fx/infraestructura/FormatoAoFx";
import { MemoriaEfectoRepositorio } from "@/fx/infraestructura/memoria";
import type { ReferenciaGrafica } from "@/compartido/dominio/ReferenciaGrafica";
import { MemoriaTablaDeGrh } from "./infraestructura/memoria";

/** El catálogo se arma siempre igual; los escenarios sólo cambian las hojas. */
const catalogoDe = (hs: readonly HojaDeSprites[]) => new CatalogoGraficoDesdeHojas(hs);

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

const GRAFICOS_INI_DE_UNA_LINEA = `[INIT]
NumGrh=4
Version=114

[Graphics]
Grh1=1-12-0-0-32-64
Grh2=1-12-32-0-32-64
Grh3=2-1-2-240
Grh4=1-99-10-20-11-30
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

  // Estos tres van por `texto` y `bandera` a propósito: `entero` usa parseFloat, que frena solo en
  // el espacio, así que por ese camino el comentario pasa desapercibido aunque no se corte nada.
  it("saca el comentario pegado a un valor numérico", () => {
    const b = ArchivoIni.parsear("[A]\nWalk1=4582\t ' arriba\nFileNum=12 ' la hoja\nWAV=61 ; sonido\nDef=7 ´ raro");
    expect(b.texto("a", "Walk1")).toBe("4582");
    expect(b.texto("a", "FileNum")).toBe("12");
    expect(b.texto("a", "WAV")).toBe("61");
    expect(b.texto("a", "Def")).toBe("7");
    expect(b.entero("a", "Walk1")).toBe(4582);
  });

  it("una bandera apagada con comentario al lado sigue apagada", () => {
    const b = ArchivoIni.parsear("[A]\nCrucial=0 ' no se cae al morir\nNewbie=1 ' solo newbies");
    expect(b.bandera("a", "Crucial")).toBe(false);
    expect(b.bandera("a", "Newbie")).toBe(true);
  });

  it("no corta un texto que tiene comillas de verdad", () => {
    const b = ArchivoIni.parsear("[A]\nName=La espada 'Matadragones'\nDesc=Cura 5 ; dicen\nClave=no 'toques'");
    expect(b.texto("a", "Name")).toBe("La espada 'Matadragones'");
    expect(b.texto("a", "Desc")).toBe("Cura 5 ; dicen");
    expect(b.texto("a", "Clave")).toBe("no 'toques'");
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

describe("LectorGraficosIni, formato de una línea", () => {
  const tabla = TablaDeGrh.desde(new LectorGraficosIni().leer(GRAFICOS_INI_DE_UNA_LINEA));

  it("lee los campos por posición, con el tamaño ya en píxeles", () => {
    expect(tabla.obtener(1)).toMatchObject({ archivo: "12", x: 0, y: 0, ancho: 32, alto: 64 });
    // 11×30 son píxeles: si se leyeran como tiles quedaría un sprite de 352×960.
    expect(tabla.obtener(4)).toMatchObject({ archivo: "99", x: 10, y: 20, ancho: 11, alto: 30 });
  });

  it("resuelve un GRH animado igual que el formato por secciones", () => {
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
      new PuenteDeGrh(hojas, ids),
      hojas,
      new ImportarObjetos(objetos, new FormatoAoObjs(), ids),
      catalogoDe,
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
      new PuenteDeGrh(hojas, ids),
      hojas,
      new ImportarObjetos(objetos, new FormatoAoObjs(), ids),
      catalogoDe,
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
  const { hechizos, sinEfecto } = new LectorHechizosDat().leer(HECHIZOS_DAT);

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

  it("no inventa el efecto cuando el archivo no lo trae", () => {
    // Los cinco del ejemplo traen banderas de efecto, así que no hay nada que avisar.
    expect(sinEfecto).toEqual([]);

    // El Hechizos.dat del CLIENTE sólo trae el texto que se muestra: ahí no hay efecto que leer.
    const delCliente = new LectorHechizosDat().leer("[HECHIZO1]\nNombre=Curar Heridas Leves\nManaRequerido=10");
    expect(delCliente.sinEfecto).toEqual([1]);
    expect(delCliente.hechizos[0]).toMatchObject({ nombre: "Curar Heridas Leves", mana: 10 });
  });
});

describe("ImportarHechizosClasicos", () => {
  it("deja los hechizos listos en el editor, sin duplicar al reimportar", async () => {
    const repo = new MemoriaHechizoRepositorio();
    const caso = new ImportarHechizosClasicos(
      new LectorHechizosDat(),
      new ImportarHechizos(repo, new FormatoAoSpells(), new GeneradorDeIdsSecuencial()),
    );

    expect(await caso.ejecutar(HECHIZOS_DAT)).toEqual({ agregados: 5, reemplazados: 0, sinEfecto: [] });
    expect(await caso.ejecutar(HECHIZOS_DAT)).toEqual({ agregados: 0, reemplazados: 5, sinEfecto: [] });

    const hechizos = await repo.listar();
    expect(hechizos).toHaveLength(5);
    const dardo = hechizos.find((h) => h.numero === 1)!;
    expect(dardo.tipo.id).toBe("dano");
    expect(dardo.atributosVigentes()).toEqual({ min: 5, max: 10 });
    expect(dardo.tieneBandera("baculo")).toBe(true);
  });
});

const PERSONAJES_INI = `[INIT]
NumBodies=3

[BODY1]
Walk1=1	 ' arriba
Walk2=2	 ' derecha
Walk3=3	 ' abajo
Walk4=4	 ' izq
HeadOffsetX=0
HeadOffsetY=-4

[BODY2]
Walk1=0	 ' arriba
Walk2=0	 ' derecha
Walk3=3	 ' abajo
Walk4=0	 ' izq
HeadOffsetX=-2
HeadOffsetY=-32

[BODY3]
Walk1=4	 ' arriba
Walk2=4	 ' derecha
Walk3=4	 ' abajo
Walk4=4	 ' izq
HeadOffsetX=0
HeadOffsetY=0
`;

const CABEZAS_INI = `[INIT]
NumHeads=2

[HEAD1]
Head1=1	 ' arriba
Head2=2	 ' derecha
Head3=3	 ' abajo
Head4=1	 ' izq

[HEAD2]
Head1=0	 ' arriba
Head2=0	 ' derecha
Head3=0	 ' abajo
Head4=0	 ' izq
`;

const FXS_INI = `[INIT]
NumFxs=2

[FX1]
Animacion=3
OffsetX=0
OffsetY=32

[FX2]
Animacion=99
OffsetX=-5
OffsetY=-15
`;

describe("LectorAparienciasIni", () => {
  const cuerpos = new LectorAparienciasIni("body", "Walk", "Personajes.ini").leer(PERSONAJES_INI);

  it("traduce el orden de AO (1 norte, 2 este, 3 sur, 4 oeste) y saltea las direcciones en 0", () => {
    expect(cuerpos[0]).toEqual({
      numero: 1,
      grhPorDireccion: { norte: 1, este: 2, sur: 3, oeste: 4 },
      offsetCabezaX: 0,
      offsetCabezaY: -4,
    });
    expect(cuerpos[1]!.grhPorDireccion).toEqual({ sur: 3 });
  });

  it("perdona el comentario pegado al valor", () => {
    // En el archivo real cada Walk termina en "\t ' arriba"; si eso entrara al valor, nada sería un número.
    expect(cuerpos.every((c) => Object.values(c.grhPorDireccion).every(Number.isInteger))).toBe(true);
    expect(cuerpos[1]).toMatchObject({ offsetCabezaX: -2, offsetCabezaY: -32 });
  });

  it("lee las cabezas con el mismo molde, sin corrimiento", () => {
    const cabezas = new LectorAparienciasIni("head", "Head", "Cabezas.ini").leer(CABEZAS_INI);
    expect(cabezas[0]!.grhPorDireccion).toEqual({ norte: 1, este: 2, sur: 3, oeste: 1 });
    expect(cabezas[1]!.grhPorDireccion).toEqual({});
  });

  it("avisa si el archivo no es el que corresponde", () => {
    expect(() => new LectorAparienciasIni("body", "Walk", "Personajes.ini").leer(CABEZAS_INI)).toThrow();
  });
});

describe("LectorFxsIni", () => {
  it("trae la animación y el corrimiento de cada efecto", () => {
    expect(new LectorFxsIni().leer(FXS_INI)).toEqual([
      { numero: 1, grh: 3, offsetX: 0, offsetY: 32 },
      { numero: 2, grh: 99, offsetX: -5, offsetY: -15 },
    ]);
  });

  it("avisa si el archivo no es un Fxs.ini", () => {
    expect(() => new LectorFxsIni().leer(CABEZAS_INI)).toThrow();
  });
});

describe("importadores de apariencias y FX del clásico", () => {
  /** Una referencia vinculada guarda ids; para leerla en un test hay que volver al nombre. */
  async function animacionDe(hojas: MemoriaHojaRepositorio, ref: ReferenciaGrafica | null | undefined) {
    if (!ref || ref.tipo !== "vinculada") return null;
    const hoja = (await hojas.listar()).find((h) => h.id === ref.hojaId);
    return hoja?.animaciones.find((a) => a.id === ref.animacionId)?.nombre ?? null;
  }

  /** La hoja 12.png existe; la 99 no, para ver qué pasa con lo que no se puede vincular. */
  async function escenario() {
    const hojas = new MemoriaHojaRepositorio();
    await hojas.guardar(HojaDeSprites.crear("h1", "12.png", "a1").sinAnimacion("a1"));
    const tablas = new MemoriaTablaDeGrh();
    await tablas.guardar(TablaDeGrh.desde(new LectorGraficosIni().leer(GRAFICOS_INI)));
    const ids = new GeneradorDeIdsSecuencial();
    return { hojas, tablas, ids, puente: new PuenteDeGrh(hojas, ids) };
  }

  it("arma los cuerpos con sus cuatro direcciones y el corrimiento de la cabeza", async () => {
    const { hojas, tablas, ids, puente } = await escenario();
    const repo = new MemoriaCuerpoRepositorio();
    const caso = new ImportarCuerposClasicos(
      new LectorAparienciasIni("body", "Walk", "Personajes.ini"),
      tablas,
      puente,
      hojas,
      new ImportarApariencias(repo, new FormatoAoBodies(), ids, ESPECIE_CUERPO),
      catalogoDe,
    );

    const r = await caso.ejecutar(PERSONAJES_INI);
    expect(r.apariencias).toMatchObject({ agregados: 3, reemplazados: 0 });
    // Los GRH 1, 2 y 3 salen de la hoja 12; el 4 vive en la 99, que no está cargada.
    expect(r.animacionesCreadas).toBe(3);
    expect(r.hojasFaltantes).toEqual(["99"]);

    const cuerpo = (await repo.listar()).find((c) => c.numero === 1)!;
    expect(cuerpo.offsetCabezaY).toBe(-4);
    expect(await animacionDe(hojas, cuerpo.direcciones.sur)).toBe("grh3");
    expect(await animacionDe(hojas, cuerpo.direcciones.norte)).toBe("grh1");
    // La dirección que apunta a la hoja que falta queda pendiente, no se pierde el cuerpo.
    expect(cuerpo.direcciones.oeste).toBeUndefined();
  });

  it("arma las cabezas con el mismo molde", async () => {
    const { hojas, tablas, ids, puente } = await escenario();
    const repo = new MemoriaCabezaRepositorio();
    const caso = new ImportarCabezasClasicas(
      new LectorAparienciasIni("head", "Head", "Cabezas.ini"),
      tablas,
      puente,
      hojas,
      new ImportarApariencias(repo, new FormatoAoHeads(), ids, ESPECIE_CABEZA),
      catalogoDe,
    );

    const r = await caso.ejecutar(CABEZAS_INI);
    expect(r.apariencias).toMatchObject({ agregados: 2 });
    const cabeza = (await repo.listar()).find((c) => c.numero === 1)!;
    expect(await animacionDe(hojas, cabeza.direcciones.este)).toBe("grh2");
  });

  it("arma los FX con su corrimiento, y anota el GRH que la tabla no conoce", async () => {
    const { hojas, tablas, ids, puente } = await escenario();
    const repo = new MemoriaEfectoRepositorio();
    const caso = new ImportarEfectosClasicos(
      new LectorFxsIni(),
      tablas,
      puente,
      hojas,
      new ImportarEfectos(repo, new FormatoAoFx(), ids),
      catalogoDe,
    );

    const r = await caso.ejecutar(FXS_INI);
    expect(r.efectos).toMatchObject({ agregados: 2 });
    expect(r.grhSinResolver).toEqual([99]);

    const fx = (await repo.listar()).find((e) => e.numero === 1)!;
    expect(fx.offsetY).toBe(32);
    expect(await animacionDe(hojas, fx.animacion)).toBe("grh3");
  });

  it("al reimportar reusa las animaciones en vez de duplicarlas", async () => {
    const { hojas, tablas, ids, puente } = await escenario();
    const repo = new MemoriaCuerpoRepositorio();
    const caso = new ImportarCuerposClasicos(
      new LectorAparienciasIni("body", "Walk", "Personajes.ini"),
      tablas,
      puente,
      hojas,
      new ImportarApariencias(repo, new FormatoAoBodies(), ids, ESPECIE_CUERPO),
      catalogoDe,
    );

    await caso.ejecutar(PERSONAJES_INI);
    const segunda = await caso.ejecutar(PERSONAJES_INI);
    expect(segunda.animacionesCreadas).toBe(0);
    expect(segunda.apariencias).toMatchObject({ agregados: 0, reemplazados: 3 });
    expect((await hojas.listar())[0]!.animaciones).toHaveLength(3);
    expect(await repo.listar()).toHaveLength(3);
  });
});
