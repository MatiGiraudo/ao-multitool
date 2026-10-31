import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import { ImportarObjetos } from "@/objetos/aplicacion/casosDeUso";
import { FormatoAoObjs } from "@/objetos/infraestructura/FormatoAoObjs";
import { MemoriaObjetoRepositorio } from "@/objetos/infraestructura/memoria";
import { ENCABEZADO, type OriginalesDeFamilia, type OriginalesRepositorio } from "./dominio/OriginalesRepositorio";
import { ImportarHechizos } from "@/hechizos/aplicacion/casosDeUso";
import { FormatoAoSpells } from "@/hechizos/infraestructura/FormatoAoSpells";
import { MemoriaHechizoRepositorio } from "@/hechizos/infraestructura/memoria";
import { ImportarNpcs } from "@/npcs/aplicacion/casosDeUso";
import { FormatoAoNpcs } from "@/npcs/infraestructura/FormatoAoNpcs";
import { MemoriaNpcRepositorio } from "@/npcs/infraestructura/memoria";
import { EscritorHechizosDat } from "./infraestructura/EscritorHechizosDat";
import { EscritorNpcsDat } from "./infraestructura/EscritorNpcsDat";
import { EscritorObjDat } from "./infraestructura/EscritorObjDat";
import { LectorHechizosDat } from "./infraestructura/LectorHechizosDat";
import { LectorNpcsDat } from "./infraestructura/LectorNpcsDat";
import { ArchivoIni } from "./infraestructura/LectorIni";
import { LectorObjDat } from "./infraestructura/LectorObjDat";
import { ESPECIE_CABEZA } from "@/apariencias/dominio/Cabeza";
import { ESPECIE_CUERPO } from "@/apariencias/dominio/Cuerpo";
import { ImportarApariencias } from "@/apariencias/aplicacion/casosDeUso";
import { FormatoAoBodies } from "@/apariencias/infraestructura/FormatoAoBodies";
import { FormatoAoHeads } from "@/apariencias/infraestructura/FormatoAoHeads";
import { MemoriaCabezaRepositorio, MemoriaCuerpoRepositorio } from "@/apariencias/infraestructura/memoria";
import { ImportarEfectos } from "@/fx/aplicacion/casosDeUso";
import type { Efecto } from "@/fx/dominio/Efecto";
import { FormatoAoFx } from "@/fx/infraestructura/FormatoAoFx";
import { MemoriaEfectoRepositorio } from "@/fx/infraestructura/memoria";
import { HojaDeSprites } from "@/graficos/dominio/HojaDeSprites";
import { CatalogoGraficoDesdeHojas } from "@/graficos/infraestructura/CatalogoGraficoDesdeHojas";
import { MemoriaHojaRepositorio } from "@/graficos/infraestructura/memoria";
import {
  ExportarAparienciasClasicas,
  ExportarEfectosClasicos,
  GrhDelProyecto,
  ImportarCabezasClasicas,
  ImportarCuerposClasicos,
  ImportarEfectosClasicos,
} from "./aplicacion/casosDeUso";
import { GrhDeReferencias } from "./aplicacion/GrhDeReferencias";
import { PuenteDeGrh } from "./aplicacion/PuenteDeGrh";
import { TablaDeGrh } from "./dominio/TablaDeGrh";
import { EscritorAparienciasIni } from "./infraestructura/EscritorAparienciasIni";
import { EscritorFxsIni } from "./infraestructura/EscritorFxsIni";
import { LectorAparienciasIni } from "./infraestructura/LectorAparienciasIni";
import { LectorFxsIni } from "./infraestructura/LectorFxsIni";
import { LectorGraficosIni } from "./infraestructura/LectorGraficosIni";
import { MemoriaTablaDeGrh } from "./infraestructura/memoria";

/**
 * La prueba que de verdad dice si el ida y vuelta con el AO clásico sirve: tomar los archivos de
 * un servidor y de un cliente, importarlos, exportarlos y comparar. De las 90 claves que tiene un
 * `OBJ.dat` el editor entiende unas veinte, así que lo que se mide es que las otras setenta
 * vuelvan intactas.
 *
 * Se compara clave por clave y no línea por línea a propósito: `Valor= 200` y `Valor=200` son el
 * mismo objeto, y el editor escribe sin el espacio de más.
 *
 * Son dos grupos y dos carpetas, porque los archivos del clásico viven en dos lados: los tres del
 * servidor en su `Dat/` y los tres del cliente en su `INIT/`. No se pueden correr siempre porque
 * no son del proyecto; apuntá las variables y los tests se encienden solos, cada grupo con la suya:
 *
 *     AO_DAT_DIR="C:/.../ao-server/Dat" AO_INIT_DIR="C:/.../ao-cliente/INIT" npm test
 */
const CARPETA = process.env.AO_DAT_DIR;

/** El editor no tiene gráficos cargados en esta prueba, y el OBJ.dat no los necesita para volver. */
const SIN_GRAFICOS: CatalogoGrafico = { resolver: () => null, buscarPorNombre: () => null, hojas: () => [] };

/** Un generador de ids con cuenta propia: los ids no salen en el .dat, así que da igual cuáles son. */
function idsDePrueba() {
  let n = 0;
  return { nuevo: () => `id${++n}` };
}

/** Todas las claves de todas las secciones, para comparar dos archivos por lo que dicen. */
function claves(texto: string, prefijo = "obj"): Map<string, string> {
  const ini = ArchivoIni.parsear(texto);
  const out = new Map<string, string>();
  for (const { seccion } of ini.numeradas(prefijo)) {
    for (const linea of ini.lineasDe(seccion)) {
      const igual = linea.indexOf("=");
      if (igual < 0) continue;
      out.set(`${seccion}.${linea.slice(0, igual).trim().toLowerCase()}`, linea.slice(igual + 1).trim());
    }
  }
  return out;
}

/* Este test importa los objetos sin sus gráficos, así que no hay ningún GRH que resolver: lo que
 * se mide acá es que las claves del archivo vuelvan intactas. */
const SIN_GRH = new Map<number, number>();

describe.skipIf(!CARPETA)("OBJ.dat de verdad", () => {
  const carpeta = CARPETA ?? "";
  const leerDat = (nombre: string) => (carpeta ? new TextDecoder("windows-1252").decode(readFileSync(join(carpeta, nombre))) : "");

  async function idaYVuelta(texto: string) {
    const { objetos: clasicos, encabezado } = new LectorObjDat().leer(texto);
    const repo = new MemoriaObjetoRepositorio();
    await new ImportarObjetos(repo, new FormatoAoObjs(), idsDePrueba()).importar(
      clasicos.map(({ grhIcono: _, crudo: __, ...resto }) => ({ ...resto, graficos: { icono: null, suelo: null, equipado: {} } })),
      SIN_GRAFICOS,
    );
    const originales = { [ENCABEZADO]: encabezado, ...Object.fromEntries(clasicos.map((o) => [o.numero, o.crudo])) };
    const objetos = await repo.listar();
    return { clasicos, objetos, originales, texto: new EscritorObjDat().escribir(objetos, originales, SIN_GRH) };
  }

  it("devuelve todas las claves, también las setenta que el editor no entiende", async () => {
    const original = leerDat("obj.dat");
    const { clasicos, texto } = await idaYVuelta(original);
    expect(clasicos.length).toBeGreaterThan(1000);

    const antes = claves(original);
    const despues = claves(texto);
    const distintas = [...antes].filter(([clave, valor]) => despues.get(clave) !== valor).map(([clave, valor]) => `${clave}=${valor}`);

    console.log(`  ${clasicos.length} objetos · ${antes.size} claves · ${original.length} bytes · distintas ${distintas.length}`);
    expect(distintas).toEqual([]);
  }, 60_000);

  it("sin editar nada, sale el mismo archivo línea por línea", async () => {
    const original = leerDat("obj.dat");
    const { texto } = await idaYVuelta(original);

    /*
     * Lo esperado no es el archivo crudo sino el archivo *normalizado*: con las secciones en orden
     * y sin repetidas. Este `obj.dat` trae dos veces el `[OBJ1167]`, y tanto el lector como el
     * servidor se quedan con la última, así que al devolverlo sale una sola vez.
     */
    const ini = ArchivoIni.parsear(original);
    const esperado = [
      ...ini.encabezado("obj"),
      ...ini.numeradas("obj").flatMap(({ seccion }) => ini.lineasDe(seccion)),
    ].join("\r\n");

    const lineasEsperadas = esperado.split("\r\n");
    const lineasObtenidas = texto.split("\r\n");
    const distintas = lineasEsperadas.map((l, i) => [i, l, lineasObtenidas[i]] as const).filter(([, a, b]) => a !== b);

    console.log(`  ${original.split(/\r?\n/).length} líneas en el archivo · ${lineasEsperadas.length} esperadas · distintas ${distintas.length}`);
    expect(distintas).toEqual([]);
  }, 60_000);

  it("el NPCs.dat vuelve con sus 124 claves", async () => {
    const original = leerDat("NPCs.dat");
    const { npcs: clasicos, encabezado } = new LectorNpcsDat().leer(original);
    const repo = new MemoriaNpcRepositorio();
    await new ImportarNpcs(repo, new FormatoAoNpcs(), idsDePrueba()).importar(clasicos);
    const originales = { [ENCABEZADO]: encabezado, ...Object.fromEntries(clasicos.map((n) => [n.numero, n.crudo])) };

    const texto = new EscritorNpcsDat().escribir(await repo.listar(), originales);
    const antes = claves(original, "npc");
    const despues = claves(texto, "npc");
    const distintas = [...antes].filter(([clave, valor]) => despues.get(clave) !== valor).map(([c, v]) => [c, v, despues.get(c)] as const);

    /*
     * Lo único que cambia es el contador de items de los NPCs cuyo archivo se contradice: hay
     * comerciantes con `NROITEMS=10` y nueve líneas `Obj`. El editor escribe la cuenta real, que
     * es lo que el servidor puede leer sin encontrarse un item vacío.
     */
    const mal = distintas.filter(([clave, antesV, despuesV]) => !clave.endsWith(".nroitems") || Number(despuesV) >= Number(antesV));
    console.log(`  ${clasicos.length} NPCs · ${antes.size} claves · distintas ${distintas.length}, todas por el contador de items: ${distintas.slice(0, 3).map(([c, v, o]) => c + ": " + v + " -> " + o).join(" | ")}`);
    expect(mal).toEqual([]);
  }, 60_000);

  it("el Hechizos.dat vuelve con sus 60 claves", async () => {
    const original = leerDat("Hechizos.dat");
    const { hechizos: clasicos, crudos, encabezado } = new LectorHechizosDat().leer(original);
    const repo = new MemoriaHechizoRepositorio();
    await new ImportarHechizos(repo, new FormatoAoSpells(), idsDePrueba()).importar(clasicos);
    const originales = { [ENCABEZADO]: encabezado, ...crudos };

    const texto = new EscritorHechizosDat().escribir(await repo.listar(), originales);
    const antes = claves(original, "hechizo");
    const distintas = [...antes].filter(([clave, valor]) => claves(texto, "hechizo").get(clave) !== valor);

    console.log(`  ${clasicos.length} hechizos · ${antes.size} claves · distintas ${distintas.length}: ${distintas.slice(0, 4).map(([c, v]) => c + "=" + v).join(" | ")}`);
    expect(distintas).toEqual([]);
  }, 60_000);

  it("editar un nombre cambia esa línea y ninguna otra", async () => {
    const original = leerDat("obj.dat");
    const { objetos, originales, texto: antes } = await idaYVuelta(original);

    const primero = [...objetos].sort((a, b) => a.numero - b.numero)[0]!;
    const despues = new EscritorObjDat().escribir(
      objetos.map((o) => (o.clave === primero.clave ? o.renombrado("Daga de pruebas") : o)),
      originales,
      SIN_GRH,
    );

    const lineasAntes = antes.split("\r\n");
    const lineasDespues = despues.split("\r\n");
    const distintas = lineasAntes.map((l, i) => [l, lineasDespues[i]] as const).filter(([a, b]) => a !== b);

    expect(lineasAntes).toHaveLength(lineasDespues.length);
    expect(distintas).toHaveLength(1);
    expect(distintas[0]![1]).toContain("Daga de pruebas");
  }, 60_000);
});

/**
 * Los tres archivos del cliente, que son los que viven en `INIT/` y no en `Dat/`.
 *
 * Acá se mide algo más que en los del servidor. En el `OBJ.dat` el editor no toca los gráficos de
 * esta prueba; en estos tres los gráficos SON el archivo —el `Animacion` de un FX, los `Walk1..4`
 * de un cuerpo y los `Head1..4` de una cabeza son todos números de GRH— así que lo que se mide es
 * el camino de ida y el de vuelta juntos: del número a la animación del proyecto, y de la
 * animación de vuelta al número.
 *
 * Necesita el `Graficos.ini` del mismo cliente, que es el que dice qué recorte es cada número.
 * Apuntá `AO_INIT_DIR` a la carpeta `INIT` de un cliente y el test se enciende solo:
 *
 *     AO_INIT_DIR="C:/.../ao-cliente/INIT" npm test
 */
const INIT = process.env.AO_INIT_DIR;

describe.skipIf(!INIT)("los .ini del cliente de verdad", () => {
  const carpeta = INIT ?? "";
  const leerIni = (nombre: string) => (carpeta ? new TextDecoder("windows-1252").decode(readFileSync(join(carpeta, nombre))) : "");

  function originalesEnMemoria(): OriginalesRepositorio {
    const todo = new Map<string, OriginalesDeFamilia>();
    return { leer: async (f) => todo.get(f) ?? {}, guardar: async (f, e) => void todo.set(f, e) };
  }

  /**
   * Un proyecto con el cliente entero importado: la tabla de GRH del `Graficos.ini` y una hoja por
   * cada imagen que esa tabla menciona.
   *
   * Las hojas van sin imagen a propósito. El puente sólo necesita que exista una hoja con ese
   * nombre de archivo para crear la animación, y las miles de imágenes del cliente no hacen falta
   * para medir si los números vuelven.
   */
  async function proyectoDelCliente() {
    const tabla = TablaDeGrh.desde(new LectorGraficosIni().leer(leerIni("Graficos.ini")));
    const tablas = new MemoriaTablaDeGrh();
    await tablas.guardar(tabla);

    const hojas = new MemoriaHojaRepositorio();
    for (const archivo of tabla.archivos()) await hojas.guardar(HojaDeSprites.crear(archivo, archivo + ".png", archivo + "-1"));

    const fabricaDeCatalogo = (hs: readonly HojaDeSprites[]) => new CatalogoGraficoDesdeHojas(hs);
    const puente = new PuenteDeGrh(hojas, idsDePrueba());
    const grh = new GrhDeReferencias(hojas, new GrhDelProyecto(tablas, hojas));
    return { tabla, tablas, hojas, puente, grh, fabricaDeCatalogo, originales: originalesEnMemoria() };
  }

  /** Las claves que no volvieron iguales, con lo que decía el archivo y lo que salió. */
  function diferencias(original: string, devuelto: string, prefijo: string) {
    const antes = claves(original, prefijo);
    const despues = claves(devuelto, prefijo);
    const distintas = [...antes].filter(([clave, valor]) => despues.get(clave) !== valor).map(([c, v]) => [c, v, despues.get(c)] as const);
    return { claves: antes.size, distintas };
  }

  function contar(distintas: readonly (readonly [string, string, string | undefined])[]) {
    return distintas.length ? ": " + distintas.slice(0, 6).map(([c, v, o]) => c + ": " + v + " -> " + o).join(" | ") : "";
  }

  async function importarEfectos(p: Awaited<ReturnType<typeof proyectoDelCliente>>, texto: string) {
    const repo = new MemoriaEfectoRepositorio();
    const importado = await new ImportarEfectosClasicos(
      new LectorFxsIni(),
      p.tablas,
      p.puente,
      p.hojas,
      new ImportarEfectos(repo, new FormatoAoFx(), idsDePrueba()),
      p.fabricaDeCatalogo,
      p.originales,
    ).ejecutar(texto);
    return { repo, importado };
  }

  const exportarEfectos = (p: Awaited<ReturnType<typeof proyectoDelCliente>>, efectos: () => Promise<Efecto[]>) =>
    new ExportarEfectosClasicos(efectos, p.originales, new EscritorFxsIni(), p.grh).ejecutar();

  it("el fxs.ini vuelve con el gráfico de cada efecto", async () => {
    const p = await proyectoDelCliente();
    const original = leerIni("fxs.ini");
    const { repo, importado } = await importarEfectos(p, original);

    const [archivo] = await exportarEfectos(p, () => repo.listar());
    const { claves: cuantas, distintas } = diferencias(original, String(archivo!.contenido), "fx");

    console.log(
      "  " + importado.efectos.agregados + " FX · " + cuantas + " claves · " + p.tabla.cantidad + " GRH en la tabla · distintas " +
        distintas.length + contar(distintas),
    );
    expect(distintas).toEqual([]);
  }, 180_000);

  it("el Personajes.ini vuelve con los cuatro Walk de cada cuerpo", async () => {
    const p = await proyectoDelCliente();
    const original = leerIni("Personajes.ini");
    const repo = new MemoriaCuerpoRepositorio();

    await new ImportarCuerposClasicos(
      new LectorAparienciasIni("body", "Walk", "Personajes.ini"),
      p.tablas,
      p.puente,
      p.hojas,
      new ImportarApariencias(repo, new FormatoAoBodies(), idsDePrueba(), ESPECIE_CUERPO),
      p.fabricaDeCatalogo,
      p.originales,
    ).ejecutar(original);

    const [archivo] = await new ExportarAparienciasClasicas(
      () => repo.listar(),
      "cuerpos",
      "Personajes.ini",
      p.originales,
      new EscritorAparienciasIni("BODY", "Walk", "NumBodies"),
      p.grh,
      "animacion",
    ).ejecutar();

    const { claves: cuantas, distintas } = diferencias(original, String(archivo!.contenido), "body");
    console.log("  " + cuantas + " claves de cuerpos · distintas " + distintas.length + contar(distintas));
    expect(distintas).toEqual([]);
  }, 180_000);

  it("el Cabezas.ini vuelve con las cuatro caras de cada cabeza", async () => {
    const p = await proyectoDelCliente();
    const original = leerIni("Cabezas.ini");
    const repo = new MemoriaCabezaRepositorio();

    await new ImportarCabezasClasicas(
      new LectorAparienciasIni("head", "Head", "Cabezas.ini"),
      p.tablas,
      p.puente,
      p.hojas,
      new ImportarApariencias(repo, new FormatoAoHeads(), idsDePrueba(), ESPECIE_CABEZA),
      p.fabricaDeCatalogo,
      p.originales,
    ).ejecutar(original);

    const [archivo] = await new ExportarAparienciasClasicas(
      () => repo.listar(),
      "cabezas",
      "Cabezas.ini",
      p.originales,
      new EscritorAparienciasIni("HEAD", "Head", "NumHeads"),
      p.grh,
      "frame",
    ).ejecutar();

    const { claves: cuantas, distintas } = diferencias(original, String(archivo!.contenido), "head");
    console.log("  " + cuantas + " claves de cabezas · distintas " + distintas.length + contar(distintas));
    expect(distintas).toEqual([]);
  }, 180_000);

  it("sin editar nada, el fxs.ini sale igual línea por línea", async () => {
    const p = await proyectoDelCliente();
    const original = leerIni("fxs.ini");
    const { repo } = await importarEfectos(p, original);
    const [archivo] = await exportarEfectos(p, () => repo.listar());

    /* Lo esperado es el archivo normalizado, igual que con el OBJ.dat: las secciones en orden y
     * sin repetidas, que es con lo que se quedan tanto el lector como el cliente. */
    const ini = ArchivoIni.parsear(original);
    const esperado = [...ini.encabezado("fx"), ...ini.numeradas("fx").flatMap(({ seccion }) => ini.lineasDe(seccion))].join("\r\n");

    const lineasEsperadas = esperado.split("\r\n");
    const lineasObtenidas = String(archivo!.contenido).split("\r\n");
    const distintas = lineasEsperadas.map((l, i) => [i, l, lineasObtenidas[i]] as const).filter(([, a, b]) => a !== b);

    console.log("  " + lineasEsperadas.length + " líneas esperadas · distintas " + distintas.length);
    expect(distintas).toEqual([]);
  }, 180_000);

  it("editar el corrimiento de un FX cambia esa línea y ninguna otra", async () => {
    const p = await proyectoDelCliente();
    const { repo } = await importarEfectos(p, leerIni("fxs.ini"));

    const efectos = await repo.listar();
    const [antes] = await exportarEfectos(p, async () => efectos);
    const primero = [...efectos].sort((a, b) => a.numero - b.numero)[0]!;
    const movido = efectos.map((e) => (e.clave === primero.clave ? e.conOffset(primero.offsetX, primero.offsetY - 7) : e));
    const [despues] = await exportarEfectos(p, async () => movido);

    const lineasAntes = String(antes!.contenido).split("\r\n");
    const lineasDespues = String(despues!.contenido).split("\r\n");
    const distintas = lineasAntes.map((l, i) => [l, lineasDespues[i]] as const).filter(([a, b]) => a !== b);

    expect(lineasAntes).toHaveLength(lineasDespues.length);
    expect(distintas).toHaveLength(1);
    expect(distintas[0]![1]).toContain("OffsetY=" + (primero.offsetY - 7));
  }, 180_000);
});
