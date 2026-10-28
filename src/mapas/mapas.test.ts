import { describe, expect, it } from "vitest";
import { ALTO, ANCHO, Mapa } from "./dominio/Mapa";
import { FormatoMapaClasico, type AnchoDeGrafico } from "./infraestructura/FormatoMapaClasico";

const formato = new FormatoMapaClasico();

/** Un mapa chico pero con una celda de cada cosa, para que el ida y vuelta toque todo. */
function mapaDePrueba(): Mapa {
  const mapa = Mapa.vacio(7, { nombre: "Pueblo de prueba", musicaMp3: 4, zona: "CIUDAD", seCombate: false });
  mapa.conCabeceraOriginal({ version: 136, descripcion: "hecho a mano", crc: 58, palabraMagica: 3 });

  // El piso, en todas las celdas, como en un mapa de verdad.
  for (let y = 1; y <= ALTO; y++) for (let x = 1; x <= ANCHO; x++) mapa.ponerGrafico(x, y, 1, 1000 + ((x + y) % 7));

  mapa.ponerGrafico(5, 5, 2, 2500);
  mapa.ponerGrafico(5, 5, 3, 3500);
  mapa.ponerGrafico(5, 5, 4, 4500);
  mapa.bloquear(5, 5, true);
  mapa.ponerTrigger(6, 5, 3);
  mapa.ponerParticula(7, 5, 12);
  mapa.ponerTraslado(8, 5, { mapa: 34, x: 50, y: 50 });
  mapa.ponerNpc(9, 5, 25);
  mapa.ponerObjeto(10, 5, { objeto: 12, cantidad: 100 });
  return mapa;
}

describe("Mapa", () => {
  it("es de 100×100 y no deja escribir afuera", () => {
    const mapa = Mapa.vacio(1);
    expect(() => mapa.ponerGrafico(0, 1, 1, 5)).toThrow();
    expect(() => mapa.ponerGrafico(101, 1, 1, 5)).toThrow();
    expect(() => mapa.ponerGrafico(1, 1, 5, 5)).toThrow();
    mapa.ponerGrafico(100, 100, 4, 5);
    expect(mapa.grafico(100, 100, 4)).toBe(5);
  });

  it("cuenta lo que tiene y sabe qué gráficos usa", () => {
    const mapa = mapaDePrueba();
    const c = mapa.contar();
    expect(c).toMatchObject({ bloqueadas: 1, conTrigger: 1, traslados: 1, npcs: 1, objetos: 1 });
    // Siete del piso más los tres de las capas de arriba.
    expect(mapa.graficosUsados().size).toBe(10);
  });

  it("poner un objeto sin número lo saca", () => {
    const mapa = Mapa.vacio(1);
    mapa.ponerObjeto(3, 3, { objeto: 5, cantidad: 2 });
    expect(mapa.objeto(3, 3)).toEqual({ objeto: 5, cantidad: 2 });
    mapa.ponerObjeto(3, 3, null);
    expect(mapa.objeto(3, 3)).toBeNull();
  });
});

describe("FormatoMapaClasico", () => {
  it("un mapa hecho de cero sale completo, con la cabecera en blanco", () => {
    // Lo que pasa al crear un mapa nuevo en el editor: nunca vino de un archivo, así que la
    // cabecera queda en cero. El servidor la lee y la descarta, así que lo que importa es que
    // el resto vuelva entero.
    const nuevo = Mapa.vacio(120, { nombre: "Mapa nuevo", zona: "CIUDAD", terreno: "NIEVE", restringir: "NEWBIE", seCombate: false, musicaMp3: 7 });
    for (let y = 1; y <= ALTO; y++) for (let x = 1; x <= ANCHO; x++) nuevo.ponerGrafico(x, y, 1, 1000);
    nuevo.ponerTrigger(4, 4, 4);
    nuevo.ponerTraslado(4, 5, { mapa: 9, x: 60, y: 61 });
    nuevo.bloquear(4, 6, true);
    nuevo.ponerNpc(4, 7, 25);
    nuevo.ponerObjeto(4, 8, { objeto: 12, cantidad: 100 });

    const archivos = formato.escribir(nuevo, 4);
    const { mapa } = formato.leer(120, archivos.map.buffer as ArrayBuffer, archivos.inf.buffer as ArrayBuffer, archivos.dat);

    expect(mapa.cabeceraOriginal).toEqual({ version: 0, descripcion: "", crc: 0, palabraMagica: 0 });
    expect(mapa.info.nombre).toBe("Mapa nuevo");
    expect(mapa.grafico(50, 50, 1)).toBe(1000);
    expect(mapa.trigger(4, 4)).toBe(4);
    expect(mapa.traslado(4, 5)).toEqual({ mapa: 9, x: 60, y: 61 });
    expect(mapa.bloqueada(4, 6)).toBe(true);
    expect(mapa.npc(4, 7)).toBe(25);
    expect(mapa.objeto(4, 8)).toEqual({ objeto: 12, cantidad: 100 });
    // Y los datos del .dat, que son los que se editan en el panel del mapa.
    expect(mapa.info).toMatchObject({ zona: "CIUDAD", terreno: "NIEVE", restringir: "NEWBIE", seCombate: false, musicaMp3: 7 });
  });

  it.each([4, 2] as AnchoDeGrafico[])("ida y vuelta completa con gráficos de %i bytes", (ancho) => {
    const original = mapaDePrueba();
    const archivos = formato.escribir(original, ancho);
    const { mapa, ancho: detectado } = formato.leer(
      7,
      archivos.map.buffer as ArrayBuffer,
      archivos.inf.buffer as ArrayBuffer,
      archivos.dat,
    );

    expect(detectado).toBe(ancho);
    expect(mapa.grafico(5, 5, 2)).toBe(2500);
    expect(mapa.grafico(5, 5, 4)).toBe(4500);
    expect(mapa.bloqueada(5, 5)).toBe(true);
    expect(mapa.trigger(6, 5)).toBe(3);
    expect(mapa.particula(7, 5)).toBe(12);
    expect(mapa.traslado(8, 5)).toEqual({ mapa: 34, x: 50, y: 50 });
    expect(mapa.npc(9, 5)).toBe(25);
    expect(mapa.objeto(10, 5)).toEqual({ objeto: 12, cantidad: 100 });
    expect(mapa.cabeceraOriginal).toEqual({ version: 136, descripcion: "hecho a mano", crc: 58, palabraMagica: 3 });
    expect(mapa.info).toMatchObject({ nombre: "Pueblo de prueba", musicaMp3: 4, zona: "CIUDAD", seCombate: false });
  });

  it("escribir dos veces da exactamente los mismos bytes", () => {
    const mapa = mapaDePrueba();
    const a = formato.escribir(mapa);
    const { mapa: leido } = formato.leer(7, a.map.buffer as ArrayBuffer, a.inf.buffer as ArrayBuffer, a.dat);
    const b = formato.escribir(leido);
    expect(Buffer.from(b.map)).toEqual(Buffer.from(a.map));
    expect(Buffer.from(b.inf)).toEqual(Buffer.from(a.inf));
    expect(b.dat).toBe(a.dat);
  });

  it("detecta solo si los gráficos son de 2 o de 4 bytes", () => {
    const mapa = mapaDePrueba();
    expect(formato.detectarAncho(formato.escribir(mapa, 4).map.buffer as ArrayBuffer)).toBe(4);
    expect(formato.detectarAncho(formato.escribir(mapa, 2).map.buffer as ArrayBuffer)).toBe(2);
  });

  it("avisa cuando el archivo no cierra de ninguna de las dos formas", () => {
    const mapa = mapaDePrueba();
    const cortado = formato.escribir(mapa).map.slice(0, 5000);
    expect(() => formato.leer(7, cortado.buffer as ArrayBuffer, new ArrayBuffer(10010))).toThrow();
  });

  it("el Pk del .dat está al revés: 1 es zona segura", () => {
    expect(formato.leerDat(1, "[MAPA1]\nName=Ullathorpe\nPk=1").seCombate).toBe(false);
    expect(formato.leerDat(1, "[MAPA1]\nName=Dungeon\nPk=0").seCombate).toBe(true);
    // Y al escribirlo vuelve invertido, para que el juego lo lea como corresponde.
    expect(formato.escribirDat(Mapa.vacio(1, { seCombate: false }))).toContain("Pk=1");
  });
});
