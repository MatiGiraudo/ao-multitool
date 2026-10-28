import { describe, expect, it } from "vitest";
import { Objeto } from "@/objetos/dominio/Objeto";
import { ENCABEZADO } from "./dominio/OriginalesRepositorio";
import { armarIni, reescribirSeccion } from "./infraestructura/EscritorIni";
import { EscritorObjDat } from "./infraestructura/EscritorObjDat";
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
