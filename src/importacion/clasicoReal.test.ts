import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CatalogoGrafico } from "@/compartido/dominio/CatalogoGrafico";
import { ImportarObjetos } from "@/objetos/aplicacion/casosDeUso";
import { FormatoAoObjs } from "@/objetos/infraestructura/FormatoAoObjs";
import { MemoriaObjetoRepositorio } from "@/objetos/infraestructura/memoria";
import { ENCABEZADO } from "./dominio/OriginalesRepositorio";
import { EscritorObjDat } from "./infraestructura/EscritorObjDat";
import { ArchivoIni } from "./infraestructura/LectorIni";
import { LectorObjDat } from "./infraestructura/LectorObjDat";

/**
 * La prueba que de verdad dice si el ida y vuelta con el AO clásico sirve: tomar el `OBJ.dat` de
 * un servidor, importarlo, exportarlo y comparar. De las 90 claves que tiene el archivo el editor
 * entiende unas veinte, así que lo que se mide acá es que las otras setenta vuelvan intactas.
 *
 * Se compara clave por clave y no línea por línea a propósito: `Valor= 200` y `Valor=200` son el
 * mismo objeto, y el editor escribe sin el espacio de más.
 *
 * No se puede correr siempre porque esos archivos no son del proyecto. Apuntá `AO_DAT_DIR` a la
 * carpeta `Dat` de un servidor y el test se enciende solo:
 *
 *     AO_DAT_DIR="C:/.../ao-server/Dat" npm test
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
function claves(texto: string): Map<string, string> {
  const ini = ArchivoIni.parsear(texto);
  const out = new Map<string, string>();
  for (const { seccion } of ini.numeradas("obj")) {
    for (const linea of ini.lineasDe(seccion)) {
      const igual = linea.indexOf("=");
      if (igual < 0) continue;
      out.set(`${seccion}.${linea.slice(0, igual).trim().toLowerCase()}`, linea.slice(igual + 1).trim());
    }
  }
  return out;
}

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
    return { clasicos, objetos, originales, texto: new EscritorObjDat().escribir(objetos, originales) };
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

  it("editar un nombre cambia esa línea y ninguna otra", async () => {
    const original = leerDat("obj.dat");
    const { objetos, originales, texto: antes } = await idaYVuelta(original);

    const primero = [...objetos].sort((a, b) => a.numero - b.numero)[0]!;
    const despues = new EscritorObjDat().escribir(
      objetos.map((o) => (o.clave === primero.clave ? o.renombrado("Daga de pruebas") : o)),
      originales,
    );

    const lineasAntes = antes.split("\r\n");
    const lineasDespues = despues.split("\r\n");
    const distintas = lineasAntes.map((l, i) => [l, lineasDespues[i]] as const).filter(([a, b]) => a !== b);

    expect(lineasAntes).toHaveLength(lineasDespues.length);
    expect(distintas).toHaveLength(1);
    expect(distintas[0]![1]).toContain("Daga de pruebas");
  }, 60_000);
});
