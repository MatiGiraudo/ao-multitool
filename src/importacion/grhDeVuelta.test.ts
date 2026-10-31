import { describe, expect, it } from "vitest";
import { Referencia } from "@/compartido/dominio/ReferenciaGrafica";
import { Animacion } from "@/graficos/dominio/Animacion";
import { Frame } from "@/graficos/dominio/Frame";
import { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import { MemoriaHojaRepositorio } from "@/graficos/infraestructura/memoria";
import { Cabeza } from "@/apariencias/dominio/Cabeza";
import { Cuerpo } from "@/apariencias/dominio/Cuerpo";
import { Efecto } from "@/fx/dominio/Efecto";
import { Objeto } from "@/objetos/dominio/Objeto";
import { ExportarAparienciasClasicas, ExportarEfectosClasicos, ExportarObjetosClasicos, GrhDelProyecto } from "./aplicacion/casosDeUso";
import { GrhDeReferencias } from "./aplicacion/GrhDeReferencias";
import { ENCABEZADO, SIN_ORIGINALES, type OriginalesDeFamilia, type OriginalesRepositorio } from "./dominio/OriginalesRepositorio";
import { TablaDeGrh, type Grh } from "./dominio/TablaDeGrh";
import { EscritorAparienciasIni } from "./infraestructura/EscritorAparienciasIni";
import { EscritorFxsIni } from "./infraestructura/EscritorFxsIni";
import { EscritorObjDat } from "./infraestructura/EscritorObjDat";
import { MemoriaTablaDeGrh } from "./infraestructura/memoria";

/*
 * El camino de vuelta: de una animación del proyecto al número de GRH del clásico.
 *
 * Es lo que le faltaba al ida y vuelta de los archivos del cliente. El `Fxs.ini`, el
 * `Personajes.ini`, el `Cabezas.ini` y el `GrhIndex` del `OBJ.dat` sólo podían devolver el número
 * que traían: cambiar el gráfico en el editor no se veía allá.
 */

const SALTO = String.fromCharCode(13, 10);

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

const animado = (numero: number, cuadros: number[], msDelCiclo = 400): Grh => ({
  numero,
  archivo: "",
  x: 0,
  y: 0,
  ancho: 0,
  alto: 0,
  cuadros,
  msDelCiclo,
});

/** Una hoja con una animación de tantos cuadros de 32×32, uno al lado del otro. */
function hojaCon(nombreArchivo: string, nombreAnimacion: string, cuadros: number): HojaDeSprites {
  const frames = Array.from({ length: cuadros }, (_, i) => Frame.deCoordenadas(i * 32, 0, 32, 32));
  const animacion = Animacion.crear("a1", nombreAnimacion).conMsPorFrame(100).conFramesAgregados(frames);
  return HojaDeSprites.reconstituir({
    ...HojaDeSprites.crear(nombreArchivo.replace(/\.[^.]+$/, ""), nombreArchivo, "vacia").datos(),
    animaciones: [animacion],
  });
}

function originalesCon(familia: string, entradas: OriginalesDeFamilia): OriginalesRepositorio {
  return { leer: async (f) => (f === familia ? entradas : {}), guardar: async () => undefined };
}

async function proyecto(hojas: HojaDeSprites[], grhs: Grh[]) {
  const repoHojas = new MemoriaHojaRepositorio();
  for (const hoja of hojas) await repoHojas.guardar(hoja);
  const repoTabla = new MemoriaTablaDeGrh();
  if (grhs.length) await repoTabla.guardar(TablaDeGrh.desde(grhs));
  const grh = new GrhDeReferencias(repoHojas, new GrhDelProyecto(repoTabla, repoHojas));
  return { repoHojas, repoTabla, grh };
}

describe("TablaDeGrh.buscarGrafico", () => {
  it("encuentra el GRH estático de un recorte", () => {
    const tabla = TablaDeGrh.desde([estatico(505, "12", 32, 64)]);
    expect(tabla.buscarGrafico("12", [{ x: 32, y: 64, ancho: 32, alto: 32 }])?.numero).toBe(505);
    expect(tabla.buscarGrafico("13", [{ x: 32, y: 64, ancho: 32, alto: 32 }])).toBeNull();
  });

  it("encuentra el GRH animado cuyos cuadros son ésos, en ese orden", () => {
    const tabla = TablaDeGrh.desde([estatico(1, "12", 0, 0), estatico(2, "12", 32, 0), animado(700, [1, 2])]);
    const rects = [
      { x: 0, y: 0, ancho: 32, alto: 32 },
      { x: 32, y: 0, ancho: 32, alto: 32 },
    ];
    expect(tabla.buscarGrafico("12", rects)?.numero).toBe(700);
    expect(tabla.buscarGrafico("12", [...rects].reverse())).toBeNull();
  });

  it("la velocidad no entra en la comparación: los mismos cuadros son el mismo dibujo", () => {
    const tabla = TablaDeGrh.desde([estatico(1, "12", 0, 0), estatico(2, "12", 32, 0), animado(700, [1, 2], 1000)]);
    const rects = [
      { x: 0, y: 0, ancho: 32, alto: 32 },
      { x: 32, y: 0, ancho: 32, alto: 32 },
    ];
    expect(tabla.buscarGrafico("12", rects)?.numero).toBe(700);
  });

  it("si dos GRH dibujan lo mismo, el índice se queda con el de número más chico", () => {
    const tabla = TablaDeGrh.desde([estatico(9, "12", 0, 0), estatico(4, "12", 0, 0)]);
    expect(tabla.indicePorFirma().get("12|0,0,32,32")?.numero).toBe(4);
  });
});

describe("GrhDeReferencias", () => {
  it("una animación que vino del clásico vuelve con el número que traía", async () => {
    const { grh } = await proyecto(
      [hojaCon("12.png", "grh700", 2)],
      [estatico(1, "12", 0, 0), estatico(2, "12", 32, 0), animado(700, [1, 2])],
    );
    const ref = Referencia.vinculada("12", "a1", 0);
    expect(await grh.resolver([{ referencia: ref, modo: "animacion" }])).toEqual([700]);
  });

  it("en modo frame devuelve el GRH del cuadro al que apunta, no el de la animación", async () => {
    const { grh } = await proyecto(
      [hojaCon("12.png", "caras", 2)],
      [estatico(1, "12", 0, 0), estatico(2, "12", 32, 0), animado(700, [1, 2])],
    );
    expect(await grh.resolver([{ referencia: Referencia.vinculada("12", "a1", 1), modo: "frame" }])).toEqual([2]);
    expect(await grh.resolver([{ referencia: Referencia.vinculada("12", "a1", 0), modo: "frame" }])).toEqual([1]);
  });

  it("en modo icono, el primer cuadro de una animación es la animación entera", async () => {
    const { grh } = await proyecto(
      [hojaCon("12.png", "antorcha", 2)],
      [estatico(1, "12", 0, 0), estatico(2, "12", 32, 0), animado(700, [1, 2])],
    );
    expect(await grh.resolver([{ referencia: Referencia.vinculada("12", "a1", 0), modo: "icono" }])).toEqual([700]);
    // Y elegir otro cuadro a mano es haber elegido ese dibujo.
    expect(await grh.resolver([{ referencia: Referencia.vinculada("12", "a1", 1), modo: "icono" }])).toEqual([2]);
  });

  it("una animación hecha acá se lleva un número nuevo, y la hoja un nombre para el juego", async () => {
    const { grh, repoTabla, repoHojas } = await proyecto([hojaCon("pasto.png", "ondea", 2)], []);

    const [numero] = await grh.resolver([{ referencia: Referencia.vinculada("pasto", "a1", 0), modo: "animacion" }]);

    const tabla = (await repoTabla.leer())!;
    // El 1 y el 2 son los cuadros; el animado que los junta va después, como en el juego.
    expect(numero).toBe(3);
    expect(tabla.obtener(numero!)?.cuadros).toEqual([1, 2]);
    expect(tabla.obtener(numero!)?.propio).toBe(true);
    // Sin número de archivo, el `Graficos.ini` la nombraría como el archivo 0.
    expect((await repoHojas.obtener("pasto"))?.numeroDeArchivo).toBe(1);
    expect(tabla.obtener(1)?.archivo).toBe("1");
  });

  it("pedir dos veces el mismo gráfico no inventa dos números", async () => {
    const { grh } = await proyecto([hojaCon("pasto.png", "ondea", 2)], []);
    const ref = Referencia.vinculada("pasto", "a1", 0);
    const numeros = await grh.resolver([
      { referencia: ref, modo: "animacion" },
      { referencia: ref, modo: "animacion" },
    ]);
    expect(numeros[0]).toBe(numeros[1]);
  });

  it("lo que no se puede resolver vuelve como null", async () => {
    const { grh } = await proyecto([hojaCon("12.png", "algo", 1)], []);
    expect(
      await grh.resolver([
        { referencia: null, modo: "animacion" },
        { referencia: Referencia.vinculada("no-esta", "a1", 0), modo: "animacion" },
        { referencia: Referencia.pendiente("12.png", "no-existe", 0), modo: "animacion" },
      ]),
    ).toEqual([null, null, null]);
  });

  it("una referencia pendiente se resuelve por nombre si la hoja ya está cargada", async () => {
    const { grh } = await proyecto([hojaCon("12.png", "algo", 1)], [estatico(505, "12", 0, 0)]);
    expect(await grh.resolver([{ referencia: Referencia.pendiente("12.png", "algo", 0), modo: "animacion" }])).toEqual([505]);
  });

  /*
   * Un `Graficos.ini` puede definir el mismo dibujo dos veces: el del cliente que tenemos a mano
   * tiene la animación del dragón marrón con dos juegos de números. Los dos son el mismo dibujo y
   * el editor los ve iguales, así que sin desempate elegiría siempre el más chico, y un archivo
   * exportado sin tocar nada cambiaría de número sin motivo.
   */
  describe("dos GRH que dibujan lo mismo", () => {
    /** Los cuadros 1 y 2, el GRH 700 que los junta, y el 900 que junta otros dos cuadros iguales. */
    const DUPLICADOS: Grh[] = [
      estatico(1, "12", 0, 0),
      estatico(2, "12", 32, 0),
      animado(700, [1, 2]),
      estatico(801, "12", 0, 0),
      estatico(802, "12", 32, 0),
      animado(900, [801, 802]),
    ];

    it("vuelve el GRH del que salió la animación, no el de número más chico", async () => {
      const { grh } = await proyecto([hojaCon("12.png", "grh900", 2)], DUPLICADOS);
      expect(await grh.resolver([{ referencia: Referencia.vinculada("12", "a1", 0), modo: "animacion" }])).toEqual([900]);
    });

    it("una animación con otro nombre no desempata, y gana el más chico", async () => {
      const { grh } = await proyecto([hojaCon("12.png", "dragon", 2)], DUPLICADOS);
      expect(await grh.resolver([{ referencia: Referencia.vinculada("12", "a1", 0), modo: "animacion" }])).toEqual([700]);
    });

    it("el nombre no alcanza si ese GRH ya dibuja otra cosa", async () => {
      // Se llama grh900 pero sus cuadros son otros: el nombre quedó viejo y no manda.
      const { grh } = await proyecto([hojaCon("12.png", "grh900", 2)], [...DUPLICADOS, animado(900, [2, 1])]);
      expect(await grh.resolver([{ referencia: Referencia.vinculada("12", "a1", 0), modo: "animacion" }])).toEqual([700]);
    });
  });
});

describe("los archivos del cliente con los gráficos adentro", () => {
  const FXS_INI = ["[INIT]", "NumFxs=1", "", "[FX1]", "Animacion=700", "OffsetX=0", "OffsetY=-32", ""].join(SALTO);

  it("el Fxs.ini vuelve igual si el FX sigue apuntando al gráfico que importó", async () => {
    const { grh } = await proyecto(
      [hojaCon("12.png", "grh700", 2)],
      [estatico(1, "12", 0, 0), estatico(2, "12", 32, 0), animado(700, [1, 2])],
    );
    const efecto = Efecto.crear("e1", 1).conAnimacion(Referencia.vinculada("12", "a1", 0)).conOffset(0, -32);
    const originales = originalesCon("fxs", {
      [ENCABEZADO]: ["[INIT]", "NumFxs=1", ""].join(SALTO),
      1: ["[FX1]", "Animacion=700", "OffsetX=0", "OffsetY=-32", ""].join(SALTO),
    });

    const [archivo] = await new ExportarEfectosClasicos(async () => [efecto], originales, new EscritorFxsIni(), grh).ejecutar();

    expect(archivo!.contenido).toBe(FXS_INI + SALTO);
  });

  it("cambiarle el gráfico al FX cambia el Animacion, que antes volvía como vino", async () => {
    const { grh } = await proyecto(
      [hojaCon("12.png", "grh700", 2), hojaCon("13.png", "otra", 1)],
      [estatico(1, "12", 0, 0), estatico(2, "12", 32, 0), animado(700, [1, 2]), estatico(900, "13", 0, 0)],
    );
    const efecto = Efecto.crear("e1", 1).conAnimacion(Referencia.vinculada("13", "a1", 0)).conOffset(0, -32);
    const originales = originalesCon("fxs", { 1: ["[FX1]", "Animacion=700", "OffsetX=0", "OffsetY=-32", ""].join(SALTO) });

    const [archivo] = await new ExportarEfectosClasicos(async () => [efecto], originales, new EscritorFxsIni(), grh).ejecutar();

    expect(archivo!.contenido).toContain("Animacion=900");
  });

  it("un cuerpo devuelve los cuatro Walk, y una cabeza los cuatro Head de su cuadro", async () => {
    const { grh } = await proyecto(
      [hojaCon("12.png", "caminar", 2), hojaCon("20.png", "caras", 4)],
      [
        estatico(1, "12", 0, 0),
        estatico(2, "12", 32, 0),
        animado(700, [1, 2]),
        estatico(10, "20", 0, 0),
        estatico(11, "20", 32, 0),
        estatico(12, "20", 64, 0),
        estatico(13, "20", 96, 0),
      ],
    );
    const caminar = Referencia.vinculada("12", "a1", 0);
    const cuerpo = Cuerpo.crear("c1", 1)
      .conDireccion("norte", caminar)
      .conDireccion("este", caminar)
      .conDireccion("sur", caminar)
      .conDireccion("oeste", caminar);
    const cabeza = Cabeza.crear("h1", 1)
      .conDireccion("norte", Referencia.vinculada("20", "a1", 0))
      .conDireccion("este", Referencia.vinculada("20", "a1", 1))
      .conDireccion("sur", Referencia.vinculada("20", "a1", 2))
      .conDireccion("oeste", Referencia.vinculada("20", "a1", 3));

    const [cuerpos] = await new ExportarAparienciasClasicas(
      async () => [cuerpo],
      "cuerpos",
      "Personajes.ini",
      SIN_ORIGINALES,
      new EscritorAparienciasIni("BODY", "Walk", "NumBodies"),
      grh,
      "animacion",
    ).ejecutar();
    const [cabezas] = await new ExportarAparienciasClasicas(
      async () => [cabeza],
      "cabezas",
      "Cabezas.ini",
      SIN_ORIGINALES,
      new EscritorAparienciasIni("HEAD", "Head", "NumHeads"),
      grh,
      "frame",
    ).ejecutar();

    for (const i of [1, 2, 3, 4]) expect(cuerpos!.contenido).toContain(`Walk${i}=700`);
    expect(cabezas!.contenido).toContain("Head1=10");
    expect(cabezas!.contenido).toContain("Head2=11");
    expect(cabezas!.contenido).toContain("Head3=12");
    expect(cabezas!.contenido).toContain("Head4=13");
  });

  it("el GrhIndex del OBJ.dat sale del icono, y el objeto sin icono deja su línea como estaba", async () => {
    const { grh } = await proyecto([hojaCon("12.png", "icono", 1)], [estatico(505, "12", 0, 0)]);
    const conIcono = Objeto.crear("o1", 1).renombrado("Daga").conTipo("arma").conIcono(Referencia.vinculada("12", "a1", 0));
    const sinIcono = Objeto.crear("o2", 2).renombrado("Pocion").conTipo("pocion");
    const originales = originalesCon("obj", {
      1: ["[OBJ1]", "Name=Daga", "GrhIndex=999", ""].join(SALTO),
      2: ["[OBJ2]", "Name=Pocion", "GrhIndex=888", ""].join(SALTO),
    });

    const [archivo] = await new ExportarObjetosClasicos(
      async () => [conIcono, sinIcono],
      originales,
      new EscritorObjDat(),
      grh,
    ).ejecutar();

    expect(archivo!.contenido).toContain("GrhIndex=505");
    expect(archivo!.contenido).toContain("GrhIndex=888");
  });
});
