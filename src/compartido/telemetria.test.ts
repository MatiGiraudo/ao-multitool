import { afterEach, describe, expect, it, vi } from "vitest";
import { tramoDe, type Evento } from "./aplicacion/Telemetria";
import { TelemetriaEnMemoria } from "./infraestructura/memoria";
import { TelemetriaSilenciosa } from "./infraestructura/TelemetriaSilenciosa";
import { TelemetriaUmami } from "./infraestructura/navegador/TelemetriaUmami";

/*
 * La medición tiene dos promesas que conviene tener probadas y no sólo escritas en un comentario:
 * que no manda números exactos de nada, y que no puede romper el editor.
 */

describe("tramoDe", () => {
  it("manda tramos y no números, así un tamaño no identifica a nadie", () => {
    expect(tramoDe(0)).toBe("vacío");
    expect(tramoDe(1)).toBe("1-10");
    expect(tramoDe(10)).toBe("1-10");
    expect(tramoDe(11)).toBe("11-100");
    expect(tramoDe(100)).toBe("11-100");
    expect(tramoDe(101)).toBe("101-1000");
    expect(tramoDe(1000)).toBe("101-1000");
    // Un cliente clásico entero son miles de hojas: todas caen acá, y eso es lo que se quiere saber.
    expect(tramoDe(6697)).toBe("1000+");
  });

  it("no se cae con un número raro", () => {
    expect(tramoDe(-1)).toBe("vacío");
  });
});

describe("TelemetriaSilenciosa", () => {
  it("no hace nada, que es lo que corre en tu máquina y en los tests", () => {
    expect(() => new TelemetriaSilenciosa().medir({ tipo: "carpeta elegida" })).not.toThrow();
  });
});

describe("TelemetriaEnMemoria", () => {
  it("guarda los eventos para poder afirmar sobre ellos", () => {
    const t = new TelemetriaEnMemoria();
    t.medir({ tipo: "carpeta elegida" });
    t.medir({ tipo: "mundo medido", coleccion: "hojas", tamanio: "1000+" });
    expect(t.eventos).toEqual<Evento[]>([
      { tipo: "carpeta elegida" },
      { tipo: "mundo medido", coleccion: "hojas", tamanio: "1000+" },
    ]);
  });
});

describe("TelemetriaUmami", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  /** El `window` que hay en el navegador, con lo poco que este adaptador usa. */
  function conUmami(track?: (nombre: string, datos?: Record<string, unknown>) => void) {
    Object.defineProperty(globalThis, "window", {
      value: track ? { umami: { track } } : {},
      configurable: true,
      writable: true,
    });
  }

  it("manda el tipo como nombre del evento y el resto como datos", () => {
    const track = vi.fn();
    conUmami(track);
    new TelemetriaUmami().medir({ tipo: "importado", paso: "graficos", resultado: "error" });
    expect(track).toHaveBeenCalledWith("importado", { paso: "graficos", resultado: "error" });
  });

  it("un evento sin datos va con el objeto vacío", () => {
    const track = vi.fn();
    conUmami(track);
    new TelemetriaUmami().medir({ tipo: "carpeta elegida" });
    expect(track).toHaveBeenCalledWith("carpeta elegida", {});
  });

  it("si el script no cargó, o un bloqueador se lo comió, no pasa nada", () => {
    conUmami();
    expect(() => new TelemetriaUmami().medir({ tipo: "carpeta elegida" })).not.toThrow();
  });

  it("si el script explota, el editor sigue andando", () => {
    conUmami(() => {
      throw new Error("se cayó el de afuera");
    });
    expect(() => new TelemetriaUmami().medir({ tipo: "carpeta elegida" })).not.toThrow();
  });
});
