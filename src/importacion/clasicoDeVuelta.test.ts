import { describe, expect, it } from "vitest";

/** El salto de línea de los archivos del clásico, que son todos de Windows. */
const SALTO = String.fromCharCode(13, 10);
import { Objeto } from "@/objetos/dominio/Objeto";
import { ENCABEZADO } from "./dominio/OriginalesRepositorio";
import { armarIni, reescribirSeccion } from "./infraestructura/EscritorIni";
import { Cuerpo } from "@/apariencias/dominio/Cuerpo";
import { Efecto } from "@/fx/dominio/Efecto";
import { Hechizo } from "@/hechizos/dominio/Hechizo";
import { Npc } from "@/npcs/dominio/Npc";
import { EscritorAparienciasIni } from "./infraestructura/EscritorAparienciasIni";
import { EscritorFxsIni } from "./infraestructura/EscritorFxsIni";
import { EscritorHechizosDat } from "./infraestructura/EscritorHechizosDat";
import { EscritorNpcsDat } from "./infraestructura/EscritorNpcsDat";
import { EscritorObjDat } from "./infraestructura/EscritorObjDat";
import { LectorAparienciasIni } from "./infraestructura/LectorAparienciasIni";
import { LectorFxsIni } from "./infraestructura/LectorFxsIni";
import { LectorHechizosDat } from "./infraestructura/LectorHechizosDat";
import { LectorNpcsDat } from "./infraestructura/LectorNpcsDat";
import { LectorObjDat } from "./infraestructura/LectorObjDat";

/*
 * Devolverle al AO clásico sus propios archivos.
 *
 * Lo que se cuida acá es lo que el editor NO entiende: de las 90 claves de un `OBJ.dat` maneja
 * unas veinte, y las otras setenta tienen que volver intactas. Si alguna se pierde, el servidor
 * arranca con objetos sin ropaje, sin sonidos y sin requisitos de herrería.
 */

const OBJ_DAT = [
  "########## TIPOS ##########",
  "' 2: Armas",
  "",
  "[INIT]",
  "NumOBJs=2",
  "",
  "[OBJ1] 'la daga de siempre",
  "Name=Daga",
  "ObjType=2",
  "GrhIndex=505",
  "MinHIT=1",
  "MaxHIT=4",
  "Valor= 50",
  "Newbie=1",
  "Ropaje=12",
  "Snd1=34",
  "SkHerreria=5",
  "",
  "[OBJ2]",
  "Name=Pocion roja",
  "ObjType=11",
  "TipoPocion=6",
  "MinModificador=10",
  "MaxModificador=20",
  "",
].join("\r\n");

function leerYEscribir(cambiar: (o: Objeto) => Objeto = (o) => o) {
  const { objetos: clasicos, encabezado } = new LectorObjDat().leer(OBJ_DAT);
  const originales = { [ENCABEZADO]: encabezado, ...Object.fromEntries(clasicos.map((o) => [o.numero, o.crudo])) };
  const objetos = clasicos.map((c) =>
    cambiar(
      Objeto.reconstituir({
        clave: `o${c.numero}`,
        numero: c.numero,
        nombre: c.nombre,
        tipo: c.tipo as never,
        valor: c.valor,
        descripcion: c.descripcion,
        apilable: c.apilable,
        nivelMinimo: c.nivelMinimo,
        banderas: c.banderas,
        atributos: c.atributos,
        graficos: { icono: null, suelo: null, equipado: {} },
        esEjemplo: false,
      }),
    ),
  );
  return new EscritorObjDat().escribir(objetos, originales);
}

describe("EscritorObjDat", () => {
  it("devuelve el archivo igual cuando no se editó nada", () => {
    expect(leerYEscribir()).toBe(OBJ_DAT + "\r\n");
  });

  it("conserva las claves que el editor no entiende", () => {
    const texto = leerYEscribir((o) => o.renombrado("Daga corta"));
    expect(texto).toContain("Ropaje=12");
    expect(texto).toContain("Snd1=34");
    expect(texto).toContain("SkHerreria=5");
    // Y las que entiende pero no sabe interpretar: TipoPocion 6 no está en su lista.
    expect(texto).toContain("TipoPocion=6");
  });

  it("conserva el encabezado y las secciones que no son objetos", () => {
    const texto = leerYEscribir();
    expect(texto).toContain("########## TIPOS ##########");
    expect(texto).toContain("[INIT]");
    expect(texto).toContain("NumOBJs=2");
    // Y el comentario que la sección trae al lado del nombre.
    expect(texto).toContain("[OBJ1] 'la daga de siempre");
  });

  it("cambia sólo la línea editada", () => {
    const antes = leerYEscribir().split("\r\n");
    const despues = leerYEscribir((o) => (o.numero === 1 ? o.renombrado("Daga corta") : o)).split("\r\n");
    const distintas = antes.map((l, i) => [l, despues[i]] as const).filter(([a, b]) => a !== b);
    expect(distintas).toEqual([["Name=Daga", "Name=Daga corta"]]);
  });

  it("un objeto nuevo sale con lo que el editor sabe y nada más", () => {
    const nuevo = Objeto.crear("nuevo", 7).renombrado("Espada nueva").conTipo("arma").conAtributo("minHit", 3);
    const texto = new EscritorObjDat().escribir([nuevo], {});
    expect(texto).toContain("[OBJ7]");
    expect(texto).toContain("Name=Espada nueva");
    expect(texto).toContain("ObjType=2");
    expect(texto).toContain("MinHIT=3");
    // Lo que vale 0 no se escribe: un objeto nuevo no tiene por qué llenarse de ceros.
    expect(texto).not.toContain("MaxHIT=0");
    expect(texto).not.toContain("Newbie=0");
  });
});

describe("reescribirSeccion", () => {
  it("reescribe lo propio, respeta lo ajeno y agrega lo que falta", () => {
    const original = ["[OBJ1]", "Name=Daga", "Ropaje=12", "' un comentario", "Valor=50"];
    const salida = reescribirSeccion(original, { Name: "Espada", Valor: 80, MinHIT: 3 });
    expect(salida).toEqual(["[OBJ1]", "Name=Espada", "Ropaje=12", "' un comentario", "Valor=80", "MinHIT=3"]);
  });

  it("una clave que ya estaba se reescribe aunque quede en cero", () => {
    expect(reescribirSeccion(["MinDef=5"], { MinDef: 0 })).toEqual(["MinDef=0"]);
  });

  it("una clave que no estaba no se agrega si no dice nada", () => {
    expect(reescribirSeccion(["Name=Daga"], { MinDef: 0, Texto: "" })).toEqual(["Name=Daga"]);
  });

  it("null es «esta no la toco»", () => {
    expect(reescribirSeccion(["TipoPocion=6"], { TipoPocion: null })).toEqual(["TipoPocion=6"]);
  });
});

describe("armarIni", () => {
  it("no toca el espaciado: pega las secciones tal como vienen", () => {
    expect(armarIni([["[A]", "x=1", ""], ["[B]", "y=2"]], ["# hola", ""])).toBe("# hola\r\n\r\n[A]\r\nx=1\r\n\r\n[B]\r\ny=2\r\n");
  });
});

const NPCS_DAT = [
  "[INIT]",
  "NumNPCs=2",
  "",
  "[NPC1] 'el sastre",
  "Name=Sastre",
  "NpcType=0",
  "Comercia=1",
  "Body=50",
  "Head=7",
  "Heading=3",
  "Movement=1",
  "Alineacion=0",
  "TipoItems=3",
  "NROITEMS=2",
  "Obj1=31-1000 'Vestimentas",
  "Obj2=54-0",
  "",
  "[NPC2]",
  "Name=Lobo",
  "NpcType=2",
  "Movement=5",
  "MaxHP=60",
  "GiveEXP=50",
  "AtacaDoble=1",
  "",
].join("\r\n");

describe("EscritorNpcsDat", () => {
  function idaYVuelta(cambiar: (n: Npc) => Npc = (n) => n) {
    const { npcs: clasicos, encabezado } = new LectorNpcsDat().leer(NPCS_DAT);
    const originales = { [ENCABEZADO]: encabezado, ...Object.fromEntries(clasicos.map((n) => [n.numero, n.crudo])) };
    const npcs = clasicos.map((c, i) =>
      cambiar(
        Npc.reconstituir({
          clave: `n${i}`,
          numero: c.numero,
          nombre: c.nombre,
          descripcion: c.descripcion,
          tipo: c.tipo as never,
          cuerpo: c.cuerpo,
          cabeza: c.cabeza,
          direccion: c.direccion as never,
          movimiento: c.movimiento as never,
          banderas: c.banderas,
          atributos: c.atributos,
          hechizos: c.hechizos,
          drops: c.drops,
          enVenta: c.enVenta,
          esEjemplo: false,
        }),
      ),
    );
    return new EscritorNpcsDat().escribir(npcs, originales);
  }

  it("devuelve el archivo igual cuando no se editó nada", () => {
    expect(idaYVuelta()).toBe(NPCS_DAT + "\r\n");
  });

  it("deja en paz lo que el editor no puede representar", () => {
    const texto = idaYVuelta((n) => n.renombrado("Sastre nuevo"));
    // Un `Movement=5` que el editor lee como «persigue», un tipo que no conoce y una cantidad en cero.
    expect(texto).toContain("Movement=5");
    expect(texto).toContain("NpcType=0");
    expect(texto).toContain("Obj2=54-0");
    // Y las claves que ni mira.
    expect(texto).toContain("AtacaDoble=1");
    expect(texto).toContain("TipoItems=3");
    expect(texto).toContain("Alineacion=0");
  });
});

const HECHIZOS_DAT = [
  "[INIT]",
  "NumeroHechizos=1",
  "",
  "[Hechizo1]",
  "Nombre=Dardo magico",
  "PalabrasMagicas=OHL VARAN",
  "ManaRequerido=10",
  "SubeHP=2",
  "MinHP=5",
  "MaxHP=8",
  "NeedStaff=2",
  "HechizeroMsg=has lanzado un dardo",
  "Loops=3",
  "",
].join("\r\n");

describe("EscritorHechizosDat", () => {
  function idaYVuelta(cambiar: (h: Hechizo) => Hechizo = (h) => h) {
    const { hechizos: clasicos, crudos, encabezado } = new LectorHechizosDat().leer(HECHIZOS_DAT);
    const originales = { [ENCABEZADO]: encabezado, ...crudos };
    const hechizos = clasicos.map((c, i) =>
      cambiar(
        Hechizo.reconstituir({
          clave: `h${i}`,
          numero: c.numero,
          nombre: c.nombre,
          descripcion: c.descripcion,
          palabrasMagicas: c.palabrasMagicas,
          tipo: c.tipo as never,
          objetivo: c.objetivo as never,
          mana: c.mana,
          energia: c.energia,
          skillRequerido: c.skillRequerido,
          nivelMinimo: c.nivelMinimo,
          banderas: c.banderas,
          atributos: c.atributos,
          fx: c.fx,
          sonido: c.sonido,
          esEjemplo: false,
        }),
      ),
    );
    return new EscritorHechizosDat().escribir(hechizos, originales);
  }

  it("devuelve el archivo igual cuando no se editó nada", () => {
    expect(idaYVuelta()).toBe(HECHIZOS_DAT + "\r\n");
  });

  it("no toca el efecto ni lo que no entiende", () => {
    const texto = idaYVuelta((h) => h.renombrado("Dardo nuevo"));
    expect(texto).toContain("Nombre=Dardo nuevo");
    // El efecto queda como estaba: el clásico lo escribe de varias formas y el editor junta todo en un tipo.
    expect(texto).toContain("SubeHP=2");
    expect(texto).toContain("MinHP=5");
    // Un `NeedStaff=2` es tan «sí» como un 1: no se pisa.
    expect(texto).toContain("NeedStaff=2");
    expect(texto).toContain("HechizeroMsg=has lanzado un dardo");
    expect(texto).toContain("Loops=3");
  });
});

const FXS_INI = ["[INIT]", "NumFxs=1", "", "[FX1]", "Animacion=3", "OffsetX=0", "OffsetY=32", "Loops=2", ""].join(SALTO);

const PERSONAJES_INI = [
  "[INIT]",
  "NumBodies=1",
  "",
  "[BODY1]",
  "Walk1=4582	 ' arriba",
  "Walk2=4584",
  "Walk3=4581",
  "Walk4=4583",
  "HeadOffsetX=0",
  "HeadOffsetY=-4",
  "",
].join(SALTO);

describe("EscritorFxsIni y EscritorAparienciasIni", () => {
  it("el Fxs.ini vuelve igual, y el corrimiento editado es lo único que cambia", () => {
    const { efectos, encabezado } = new LectorFxsIni().leer(FXS_INI);
    const originales = { [ENCABEZADO]: encabezado, ...Object.fromEntries(efectos.map((e) => [e.numero, e.crudo])) };
    const efecto = Efecto.crear("e1", 1).conOffset(efectos[0]!.offsetX, efectos[0]!.offsetY);

    expect(new EscritorFxsIni().escribir([efecto], originales)).toBe(FXS_INI + SALTO);

    const movido = new EscritorFxsIni().escribir([efecto.conOffset(0, 20)], originales);
    expect(movido).toContain("OffsetY=20");
    // La animación es un número de GRH que el editor no sabe recalcular: vuelve como vino.
    expect(movido).toContain("Animacion=3");
    expect(movido).toContain("Loops=2");
  });

  it("el Personajes.ini vuelve igual, con sus comentarios y sus GRH", () => {
    const { apariencias, encabezado } = new LectorAparienciasIni("body", "Walk", "Personajes.ini").leer(PERSONAJES_INI);
    const originales = { [ENCABEZADO]: encabezado, ...Object.fromEntries(apariencias.map((a) => [a.numero, a.crudo])) };
    const cuerpo = Cuerpo.crear("c1", 1).conOffsetCabeza(apariencias[0]!.offsetCabezaX, apariencias[0]!.offsetCabezaY);

    const escritor = new EscritorAparienciasIni("BODY", "NumBodies");
    expect(escritor.escribir([cuerpo], originales)).toBe(PERSONAJES_INI + SALTO);

    const movido = escritor.escribir([cuerpo.conOffsetCabeza(1, -10)], originales);
    expect(movido).toContain("HeadOffsetY=-10");
    expect(movido).toContain("Walk1=4582	 ' arriba");
  });
});
