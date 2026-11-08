import { describe, expect, it } from "vitest";
import { Mapa } from "./dominio/Mapa";
import { FormatoMapaClasico } from "./infraestructura/FormatoMapaClasico";
import { FormatoMapaCsm } from "./infraestructura/FormatoMapaCsm";
import { MapaMapper } from "./infraestructura/MapaDto";

/*
 * El formato .csm del AO20.
 *
 * El archivo de prueba se arma byte a byte acá y no con el escritor del editor: si los dos lados
 * salieran del mismo código, la prueba diría que somos consistentes con nosotros mismos y no que
 * entendimos el formato. Los bytes de abajo están puestos a mano siguiendo `ModCargaIAO.bas` del
 * WorldEditor, con la trampa incluida: la cabecera cuenta las luces antes que las partículas y
 * los NPCs antes que los objetos, pero en el archivo van al revés.
 */

/** Un armador de archivos binarios chiquito, para escribir el .csm de prueba a mano. */
class Bytes {
  private readonly datos: number[] = [];

  u8(n: number): this {
    this.datos.push(n & 0xff);
    return this;
  }
  i16(n: number): this {
    return this.u8(n).u8(n >> 8);
  }
  i32(n: number): this {
    return this.u8(n).u8(n >> 8).u8(n >> 16).u8(n >> 24);
  }
  /** Un string de VB: dos bytes de largo y los caracteres. */
  texto(s: string): this {
    this.i16(s.length);
    for (const c of s) this.u8(c.charCodeAt(0));
    return this;
  }
  celda(x: number, y: number): this {
    return this.i16(x).i16(y);
  }

  get bytes(): Uint8Array {
    return new Uint8Array(this.datos);
  }
  get buffer(): ArrayBuffer {
    return this.bytes.buffer as ArrayBuffer;
  }
}

/** El mapa de prueba: una celda de cada cosa, para que ninguna pueda esconderse en otra. */
function csmDePrueba(): Bytes {
  const b = new Bytes();
  // Cabecera: bloqueados, capas 1 a 4, triggers, LUCES, PARTÍCULAS, NPCS, OBJETOS, traslados.
  b.i32(1).i32(2).i32(1).i32(0).i32(1).i32(1).i32(1).i32(1).i32(1).i32(1).i32(1);
  // El tamaño, que el WorldEditor escribe en cero.
  b.i16(0).i16(0).i16(0).i16(0);
  // El .dat del mapa, adentro del archivo.
  b.texto("Prueba").u8(1).texto("NO").i32(2).i32(3).u8(1).texto("CAMPO").texto("BOSQUE").texto("AMB");
  b.i32(0x8f8f8f).i32(4).i32(5).i32(6).texto("SAL").u8(1).u8(0).u8(1);
  // Los bloques, en el orden del archivo.
  b.celda(2, 3).u8(5);
  b.celda(1, 1).i32(500).celda(2, 1).i32(501);
  b.celda(1, 1).i32(600);
  b.celda(5, 5).i32(700);
  b.celda(4, 4).i16(7);
  b.celda(6, 6).i32(42);
  b.celda(7, 7).i32(0x010203).u8(9);
  b.celda(8, 8).i16(11).i16(3);
  b.celda(9, 9).i16(500);
  b.celda(10, 10).i16(-1).i16(1).i16(1);
  return b;
}

describe("leer un .csm", () => {
  const mapa = () => new FormatoMapaCsm().leer(7, csmDePrueba().buffer);

  it("reparte cada bloque donde va, aunque la cabecera los cuente en otro orden", () => {
    const m = mapa();

    expect(m.grafico(1, 1, 1)).toBe(500);
    expect(m.grafico(2, 1, 1)).toBe(501);
    expect(m.grafico(1, 1, 2)).toBe(600);
    expect(m.grafico(5, 5, 4)).toBe(700);
    expect(m.trigger(4, 4)).toBe(7);
    // Acá se cae si se leen al revés: la partícula es 42 y la luz tiene color.
    expect(m.particula(6, 6)).toBe(42);
    expect(m.luz(7, 7)).toEqual({ color: 0x010203, rango: 9 });
    expect(m.objeto(8, 8)).toEqual({ objeto: 11, cantidad: 3 });
    expect(m.npc(9, 9)).toBe(500);
    expect(m.traslado(10, 10)).toEqual({ mapa: -1, x: 1, y: 1 });
  });

  it("trae los lados bloqueados, no sólo que está bloqueada", () => {
    const m = mapa();

    expect(m.lados(2, 3)).toBe(5);
    expect(m.bloqueada(2, 3)).toBe(true);
    expect(m.bloqueada(1, 1)).toBe(false);
  });

  it("parte el .dat entre lo que el editor muestra y lo que sólo devuelve", () => {
    const m = mapa();

    expect(m.info).toMatchObject({ nombre: "Prueba", musica: 3, musicaMp3: 2, zona: "CAMPO", terreno: "BOSQUE", restringir: "NO", backup: true });
    // En el archivo dice si la zona es segura; el editor piensa al revés.
    expect(m.info.seCombate).toBe(false);
    expect(m.cabeceraCsm).toEqual({
      tamanio: { xMax: 0, xMin: 0, yMax: 0, yMin: 0 },
      ambiente: "AMB",
      luzBase: 0x8f8f8f,
      letraGrh: 4,
      nivel: 5,
      extra: 6,
      salida: "SAL",
      lluvia: 1,
      nieve: 0,
      niebla: 1,
    });
  });

  it("ignora la basura que los archivos de verdad traen pegada al final", () => {
    /* El WorldEditor escribe el .csm sin vaciarlo antes, así que si la versión anterior del mapa
     * era más larga queda una cola vieja. Leer de más llenaría el mapa de tiles fantasma. */
    const conCola = new Bytes();
    for (const byte of csmDePrueba().bytes) conCola.u8(byte);
    for (let i = 0; i < 500; i++) conCola.u8(i % 251);

    const m = new FormatoMapaCsm().leer(7, conCola.buffer);

    expect(m.contar()).toEqual(mapa().contar());
  });

  it("se queja si el archivo se termina antes de lo que promete", () => {
    const cortado = csmDePrueba().bytes.slice(0, 200);

    expect(() => new FormatoMapaCsm().leer(7, cortado.buffer as ArrayBuffer)).toThrow(/se termina antes/);
  });

  it("se queja si una celda cae fuera del mapa, que es como se nota una lectura corrida", () => {
    const b = new Bytes();
    b.i32(1).i32(0).i32(0).i32(0).i32(0).i32(0).i32(0).i32(0).i32(0).i32(0).i32(0);
    b.i16(0).i16(0).i16(0).i16(0);
    b.texto("").u8(0).texto("").i32(0).i32(0).u8(0).texto("").texto("").texto("").i32(0).i32(0).i32(0).i32(0).texto("").u8(0).u8(0).u8(0);
    b.celda(300, 1).u8(1);

    expect(() => new FormatoMapaCsm().leer(7, b.buffer)).toThrow(/fuera del mapa/);
  });
});

describe("devolver un .csm", () => {
  it("un mapa leído y escrito sale igual al que entró", () => {
    const original = csmDePrueba().bytes;
    const formato = new FormatoMapaCsm();

    const vuelta = formato.escribir(formato.leer(7, original.buffer as ArrayBuffer));

    expect([...vuelta]).toEqual([...original]);
  });

  it("lo que se edita sale en el archivo", () => {
    const formato = new FormatoMapaCsm();
    const mapa = formato.leer(7, csmDePrueba().buffer);

    mapa.ponerGrafico(50, 50, 3, 99);
    mapa.ponerLuz(7, 7, { color: 0x404040, rango: 3 });
    const leidoDeVuelta = formato.leer(7, formato.escribir(mapa).buffer as ArrayBuffer);

    expect(leidoDeVuelta.grafico(50, 50, 3)).toBe(99);
    expect(leidoDeVuelta.luz(7, 7)).toEqual({ color: 0x404040, rango: 3 });
  });

  it("un mapa nuevo, sin nada del AO20, también sale", () => {
    const formato = new FormatoMapaCsm();
    const mapa = Mapa.vacio(3, { nombre: "Nuevo" });
    mapa.ponerGrafico(1, 1, 1, 5);

    const vuelta = formato.leer(3, formato.escribir(mapa).buffer as ArrayBuffer);

    expect(vuelta.info.nombre).toBe("Nuevo");
    expect(vuelta.grafico(1, 1, 1)).toBe(5);
  });
});

describe("pasar un mapa de un formato al otro", () => {
  it("del AO20 al clásico viaja todo menos las luces", () => {
    const mapa = new FormatoMapaCsm().leer(7, csmDePrueba().buffer);
    const clasico = new FormatoMapaClasico();

    const { map, inf, dat } = clasico.escribir(mapa, 4);
    const { mapa: vuelta } = clasico.leer(7, map.buffer as ArrayBuffer, inf.buffer as ArrayBuffer, dat);

    expect(vuelta.grafico(2, 1, 1)).toBe(501);
    expect(vuelta.trigger(4, 4)).toBe(7);
    expect(vuelta.particula(6, 6)).toBe(42);
    expect(vuelta.objeto(8, 8)).toEqual({ objeto: 11, cantidad: 3 });
    expect(vuelta.npc(9, 9)).toBe(500);
    expect(vuelta.traslado(10, 10)).toEqual({ mapa: -1, x: 1, y: 1 });
    expect(vuelta.info.nombre).toBe("Prueba");
    // El .map sólo sabe si la celda está bloqueada, así que los lados vuelven todos prendidos.
    expect(vuelta.bloqueada(2, 3)).toBe(true);
    expect(vuelta.lados(2, 3)).toBe(15);
    // Y no tiene dónde guardar una luz: esto es lo que se pierde al convertir.
    expect(vuelta.luz(7, 7)).toBeNull();
  });

  it("guardarlo en el proyecto no le saca las luces ni lo del .csm", () => {
    const mapa = new FormatoMapaCsm().leer(7, csmDePrueba().buffer);

    const dto = MapaMapper.aDto({ mapa, anchoDeGrafico: 4, nombreArchivo: "Mapa7" });
    const { mapa: vuelta } = MapaMapper.aDominio(JSON.parse(JSON.stringify(dto)));

    expect(vuelta.luz(7, 7)).toEqual({ color: 0x010203, rango: 9 });
    expect(vuelta.lados(2, 3)).toBe(5);
    expect(vuelta.cabeceraCsm.ambiente).toBe("AMB");
    // Y con eso guardado, el archivo del juego vuelve a salir igual.
    expect([...new FormatoMapaCsm().escribir(vuelta)]).toEqual([...csmDePrueba().bytes]);
  });
});
