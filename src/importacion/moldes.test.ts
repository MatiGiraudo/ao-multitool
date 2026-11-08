import { describe, expect, it } from "vitest";
import { GeneradorDeIdsSecuencial } from "@/compartido/infraestructura/GeneradorDeIdsAleatorio";
import type { ReferenciaGrafica } from "@/compartido/dominio/ReferenciaGrafica";
import { ImportarApariencias } from "@/apariencias/aplicacion/casosDeUso";
import { Cuerpo, ESPECIE_CUERPO } from "@/apariencias/dominio/Cuerpo";
import { FormatoAoBodies } from "@/apariencias/infraestructura/FormatoAoBodies";
import { MemoriaCuerpoRepositorio } from "@/apariencias/infraestructura/memoria";
import { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import { CatalogoGraficoDesdeHojas } from "@/graficos/infraestructura/CatalogoGraficoDesdeHojas";
import { MemoriaHojaRepositorio } from "@/graficos/infraestructura/memoria";
import { ImportarCuerposClasicos } from "./aplicacion/casosDeUso";
import { PuenteDeGrh } from "./aplicacion/PuenteDeGrh";
import { TablaDeGrh } from "./dominio/TablaDeGrh";
import { msPorFrameDeVelocidad, recortesDelMolde } from "./dominio/moldes";
import { EscritorAparienciasIni } from "./infraestructura/EscritorAparienciasIni";
import { LectorAparienciasIni } from "./infraestructura/LectorAparienciasIni";
import { LectorMoldesIni } from "./infraestructura/LectorMoldesIni";
import { MemoriaTablaDeGrh } from "./infraestructura/memoria";

/*
 * Los cuerpos con molde del AO20: el camino completo, desde el moldes.ini hasta el cuerpos.dat de
 * vuelta.
 *
 * Es el único gráfico del clásico que no entra por un número de GRH, así que lo que hay que
 * probar no es el parser sino la cuenta: que las filas del molde caigan en la dirección que les
 * toca —se equivoca sola, y se ve recién al mirar un personaje caminando—, que la velocidad se
 * lea como la lee el juego, y que al devolver el archivo el molde quede apagado, porque con el
 * molde prendido el cliente no mira los Walk que escribe el editor.
 */

const MOLDES_INI = `[INIT]
Moldes=2

[Molde1]
X=0
Y=0
Width=10
Height=20
Dir1=2
Dir2=2
Dir3=1
Dir4=1

[Molde2]
X=100
Y=200
Width=5
Height=5
Dir1=1
Dir2=0
Dir3=1
Dir4=1
`;

/** Un cuerpos.dat como el del AO20: casi todo con molde, y alguno todavía con Walk. */
const CUERPOS_DAT = `[INIT]
NumBodies=4

[BODY1]
Std=1
FileNum=12
HeadOffsetX=0
HeadOffsetY=-2

[BODY2]
Std=1
FileNum=12
HeadOffsetX=0
HeadOffsetY=-2
Speed=0.25

[BODY3]
Std=2
FileNum=99
HeadOffsetX=0
HeadOffsetY=0

[BODY4]
Walk1=1
Walk2=1
Walk3=1
Walk4=1
HeadOffsetX=1
HeadOffsetY=-4
`;

const SALTO = "\r\n";

const molde1 = () => new LectorMoldesIni().leer(MOLDES_INI).get(1)!;

describe("los moldes de cuerpos del AO20", () => {
  it("lee el moldes.ini con sus cuadros por dirección", () => {
    const moldes = new LectorMoldesIni().leer(MOLDES_INI);
    expect(moldes.size).toBe(2);
    expect(moldes.get(1)).toEqual({ x: 0, y: 0, ancho: 10, alto: 20, cuadrosPorFila: [2, 2, 1, 1] });
    expect(moldes.get(2)!.cuadrosPorFila).toEqual([1, 0, 1, 1]);
  });

  it("no acepta cualquier .ini", () => {
    expect(() => new LectorMoldesIni().leer("[INIT]\nMoldes=2\n")).toThrow(/moldes\.ini/);
  });

  it("reparte las filas del molde en el orden del cliente, que no es el de los Walk", () => {
    const recortes = recortesDelMolde(molde1(), "12", 1);

    // Primera fila: el frente. Los cuadros van hacia la derecha desde el borde del molde.
    expect(recortes.sur!.rects).toEqual([
      { x: 0, y: 0, ancho: 10, alto: 20 },
      { x: 10, y: 0, ancho: 10, alto: 20 },
    ]);
    // Segunda fila: la espalda, un alto más abajo y de nuevo desde la izquierda.
    expect(recortes.norte!.rects[0]).toEqual({ x: 0, y: 20, ancho: 10, alto: 20 });
    expect(recortes.oeste!.rects).toEqual([{ x: 0, y: 40, ancho: 10, alto: 20 }]);
    expect(recortes.este!.rects).toEqual([{ x: 0, y: 60, ancho: 10, alto: 20 }]);
    expect(recortes.sur!.archivo).toBe("12");
  });

  it("una fila vacía no está, pero su lugar en la hoja sí", () => {
    const molde = new LectorMoldesIni().leer(MOLDES_INI).get(2)!;
    const recortes = recortesDelMolde(molde, "99", 1);

    expect(recortes.norte).toBeUndefined();
    // El oeste es la tercera fila: se saltea la del norte igual, porque en la hoja está ocupada.
    expect(recortes.oeste!.rects).toEqual([{ x: 100, y: 210, ancho: 5, alto: 5 }]);
  });

  it("un Speed con coma camina como en el juego, no como dice el archivo", () => {
    /* El AO20 escribe la velocidad de las dos maneras y el val() del cliente corta en la coma: ese
     * 0,333 vale 0, que el cliente convierte en 1. Leerlo como 0.333 dejaría al cuerpo caminando
     * tres veces más lento en el editor que en el juego. */
    const conComa = ["[INIT]", "NumBodies=1", "", "[BODY1]", "Std=1", "FileNum=12", "Speed=0,333", ""].join("\n");
    const moldes = new LectorMoldesIni().leer(MOLDES_INI);
    const lector = new LectorAparienciasIni("body", "Walk", "cuerpos.dat");

    expect(lector.leer(conComa, moldes).apariencias[0]!.recortesPorDireccion!.sur!.msPorFrame).toBe(56);
    expect(lector.leer(conComa.replace("0,333", "0.333"), moldes).apariencias[0]!.recortesPorDireccion!.sur!.msPorFrame).toBe(167);
  });

  it("la velocidad se lee como la lee el juego", () => {
    // Sin velocidad, un cuadro dura lo que el cliente calcula con su 0.018.
    expect(msPorFrameDeVelocidad(1)).toBe(56);
    expect(msPorFrameDeVelocidad(0)).toBe(56);
    // Es un multiplicador, y va al revés: menos velocidad, más tiempo por cuadro.
    expect(msPorFrameDeVelocidad(0.25)).toBe(222);
    expect(msPorFrameDeVelocidad(2)).toBe(28);
  });
});

describe("importar un cuerpos.dat con moldes", () => {
  /** La hoja 12.png está cargada; la 99 no, para ver qué pasa con el molde que no se puede aplicar. */
  async function escenario() {
    const hojas = new MemoriaHojaRepositorio();
    await hojas.guardar(HojaDeSprites.crear("h1", "12.png", "a1").sinAnimacion("a1"));
    const tablas = new MemoriaTablaDeGrh();
    await tablas.guardar(TablaDeGrh.desde([{ numero: 1, archivo: "12", x: 0, y: 0, ancho: 32, alto: 32, cuadros: [], msDelCiclo: 0 }]));
    const ids = new GeneradorDeIdsSecuencial();
    const repo = new MemoriaCuerpoRepositorio();
    const caso = new ImportarCuerposClasicos(
      new LectorAparienciasIni("body", "Walk", "cuerpos.dat"),
      tablas,
      new PuenteDeGrh(hojas, ids),
      hojas,
      new ImportarApariencias(repo, new FormatoAoBodies(), ids, ESPECIE_CUERPO),
      (hs) => new CatalogoGraficoDesdeHojas(hs),
      undefined,
      new LectorMoldesIni(),
    );
    return { hojas, repo, caso };
  }

  /** Una referencia vinculada guarda ids; para leerla en un test hay que volver al nombre. */
  async function animacionDe(hojas: MemoriaHojaRepositorio, ref: ReferenciaGrafica | null | undefined) {
    if (!ref || ref.tipo !== "vinculada") return null;
    const hoja = (await hojas.listar()).find((h) => h.id === ref.hojaId);
    return hoja?.animaciones.find((a) => a.id === ref.animacionId)?.nombre ?? null;
  }

  it("cada cuerpo con molde queda con sus cuatro direcciones", async () => {
    const { hojas, repo, caso } = await escenario();

    const r = await caso.ejecutar(CUERPOS_DAT, MOLDES_INI);

    expect(r.apariencias).toMatchObject({ agregados: 4, reemplazados: 0 });
    expect(r.sinMolde).toBe(0);
    const cuerpo = (await repo.listar()).find((c) => c.numero === 1)!;
    expect(await animacionDe(hojas, cuerpo.direcciones.sur)).toBe("molde1-sur");
    expect(await animacionDe(hojas, cuerpo.direcciones.norte)).toBe("molde1-norte");
    expect(await animacionDe(hojas, cuerpo.direcciones.este)).toBe("molde1-este");
    expect(await animacionDe(hojas, cuerpo.direcciones.oeste)).toBe("molde1-oeste");
    // El cuerpo 4 sigue siendo del clásico: su gráfico sale del GRH.
    const clasico = (await repo.listar()).find((c) => c.numero === 4)!;
    expect(await animacionDe(hojas, clasico.direcciones.sur)).toBe("grh1");
  });

  it("los cuerpos que comparten molde y hoja comparten la animación", async () => {
    const { hojas, caso } = await escenario();

    const r = await caso.ejecutar(CUERPOS_DAT, MOLDES_INI);

    // Cuatro del molde 1 (una por dirección) y una del GRH del cuerpo clásico: el BODY2 no suma
    // ninguna, aunque tenga otra velocidad, y el BODY3 no pudo porque le falta la hoja 99.
    expect(r.animacionesCreadas).toBe(5);
    expect(r.hojasFaltantes).toEqual(["99"]);
    const hoja = (await hojas.listar())[0]!;
    expect(hoja.animaciones.filter((a) => a.nombre.startsWith("molde")).length).toBe(4);
    // La velocidad es la del primero que la pidió; el 0.25 del BODY2 no vuelve a crear la animación.
    expect(hoja.animaciones.find((a) => a.nombre === "molde1-sur")!.msPorFrame).toBe(56);
  });

  it("volver a importar no duplica nada", async () => {
    const { caso } = await escenario();

    await caso.ejecutar(CUERPOS_DAT, MOLDES_INI);
    const segunda = await caso.ejecutar(CUERPOS_DAT, MOLDES_INI);

    expect(segunda.animacionesCreadas).toBe(0);
    expect(segunda.apariencias).toMatchObject({ agregados: 0, reemplazados: 4 });
  });

  it("sin el moldes.ini los cuerpos entran, pero sin gráfico y avisando", async () => {
    const { hojas, repo, caso } = await escenario();

    const r = await caso.ejecutar(CUERPOS_DAT);

    expect(r.apariencias).toMatchObject({ agregados: 4 });
    expect(r.sinMolde).toBe(3);
    const cuerpo = (await repo.listar()).find((c) => c.numero === 1)!;
    expect(cuerpo.direcciones.sur).toBeUndefined();
    // El corrimiento de la cabeza es lo que no se puede cargar a mano, y ese entra igual.
    expect(cuerpo.offsetCabezaY).toBe(-2);
    // Y el cuerpo del clásico no se entera de nada.
    const clasico = (await repo.listar()).find((c) => c.numero === 4)!;
    expect(await animacionDe(hojas, clasico.direcciones.sur)).toBe("grh1");
  });
});

describe("devolver un cuerpos.dat con moldes", () => {
  const originales = {
    1: ["[BODY1]", "Std=1", "FileNum=12", "HeadOffsetX=0", "HeadOffsetY=-2", ""].join(SALTO),
  };
  const escritor = () => new EscritorAparienciasIni("BODY", "Walk", "NumBodies");
  const cuerpo = () => Cuerpo.crear("c1", 1).conOffsetCabeza(0, -2);

  it("apaga el molde cuando devuelve las cuatro direcciones", () => {
    const texto = escritor().escribir([cuerpo()], originales, new Map([[1, { norte: 10, este: 11, sur: 12, oeste: 13 }]]));

    /* Con el Std prendido el cliente ni mira los Walk, así que escribirlos sin apagarlo sería
     * devolver el archivo igual que antes y creer que algo cambió. */
    expect(texto).toContain("Std=0");
    expect(texto).toContain("Walk1=10");
    expect(texto).toContain("Walk3=12");
    // Lo que el editor no maneja queda donde estaba, incluso lo que el molde apagado ya no usa.
    expect(texto).toContain("FileNum=12");
  });

  it("si falta una dirección deja el molde como estaba", () => {
    const texto = escritor().escribir([cuerpo()], originales, new Map([[1, { norte: 10, este: 11, sur: 12 }]]));

    expect(texto).toContain("Std=1");
  });

  it("a una cabeza no se le agrega un molde", () => {
    const deCabeza = { 1: ["[HEAD1]", "Head1=1", "Head2=2", "Head3=3", "Head4=4", ""].join(SALTO) };
    const texto = new EscritorAparienciasIni("HEAD", "Head", "NumHeads").escribir(
      [Cuerpo.crear("c1", 1)],
      deCabeza,
      new Map([[1, { norte: 1, este: 2, sur: 3, oeste: 4 }]]),
    );

    expect(texto).not.toContain("Std");
  });
});
