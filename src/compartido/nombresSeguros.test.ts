import { describe, expect, it } from "vitest";
import { idSeguro, nombreSeguroDeArchivo } from "./infraestructura/nombresSeguros";

/*
 * Los nombres seguros son lo único que separa un nombre elegido por quien cargó una imagen de una
 * escritura fuera de la carpeta del proyecto. Ahora los usan los dos modos —el servidor y el
 * navegador contra la carpeta del usuario—, así que conviene que estén probados y no sólo leídos.
 */

describe("nombreSeguroDeArchivo", () => {
  it("se queda con el último tramo, venga con barras de Unix o de Windows", () => {
    expect(nombreSeguroDeArchivo("../../etc/passwd")).toBe("passwd");
    expect(nombreSeguroDeArchivo("..\\..\\windows\\system32\\algo.png")).toBe("algo.png");
    expect(nombreSeguroDeArchivo("C:\\Proyectos\\mapa.map")).toBe("mapa.map");
  });

  it("reemplaza lo que no es seguro y no deja que empiece con punto", () => {
    expect(nombreSeguroDeArchivo("mi hoja (1).png")).toBe("mi_hoja__1_.png");
    expect(nombreSeguroDeArchivo("...oculto")).toBe("oculto");
  });

  it("no deja pasar un nombre que quedaría vacío", () => {
    expect(() => nombreSeguroDeArchivo("..")).toThrow();
    expect(() => nombreSeguroDeArchivo("/")).toThrow();
  });

  it("recorta los nombres larguísimos", () => {
    expect(nombreSeguroDeArchivo("a".repeat(300))).toHaveLength(120);
  });
});

describe("idSeguro", () => {
  it("acepta los ids que genera el editor y rechaza cualquier otra cosa", () => {
    expect(idSeguro("12297960af59")).toBe("12297960af59");
    expect(idSeguro("hoja_1-2")).toBe("hoja_1-2");
    expect(() => idSeguro("../otro")).toThrow();
    expect(() => idSeguro("con punto.json")).toThrow();
    expect(() => idSeguro("")).toThrow();
  });
});
