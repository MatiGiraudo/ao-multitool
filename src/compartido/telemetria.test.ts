import { afterEach, describe, expect, it, vi } from "vitest";
import { SECCIONES } from "@/app/_componentes/secciones";
import { pantallaDe, tramoDe, type Evento } from "./aplicacion/Telemetria";
import { ErrorDeDominio } from "./dominio/ErrorDeDominio";
import { clasificarError } from "./infraestructura/clasificarError";
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

describe("pantallaDe", () => {
  it("traduce las rutas del editor y deja afuera cualquier otra cosa", () => {
    expect(pantallaDe("/mapas")).toBe("mapas");
    expect(pantallaDe("/importar")).toBe("importar");
    // La raíz redirige a Animaciones, así que no es ninguna pantalla todavía.
    expect(pantallaDe("/")).toBe("otra");
    // Un pathname es texto que viene de afuera: esto es el filtro que evita que llegue crudo.
    expect(pantallaDe("/../../etc/passwd")).toBe("otra");
    expect(pantallaDe("/lo-que-sea")).toBe("otra");
  });

  it("todas las secciones del encabezado son una pantalla conocida", () => {
    /*
     * El guardia contra la deriva: `Pantalla` repite la lista de pestañas porque `compartido/` no
     * puede conocer la capa de entrega. Si mañana se suma una herramienta y se olvida acá, el
     * tablero la contaría como "otra" sin avisar. Este test avisa.
     */
    for (const s of SECCIONES) expect(pantallaDe(s.href), s.href).not.toBe("otra");
  });
});

describe("clasificarError", () => {
  /** Como llegan de la File System Access API: una `DOMException` con su nombre. */
  const dom = (nombre: string) => new DOMException("algo que no se manda", nombre);

  it("cancelar no es fallar", () => {
    // Cerrar el selector de carpetas tira AbortError. Medirlo sería inventar un problema.
    expect(clasificarError(dom("AbortError"))).toBeNull();
  });

  it("una regla del editor es su propia clase, y no un bug", () => {
    expect(clasificarError(new ErrorDeDominio("el ID 0 no existe"))).toBe("dominio");
    // Aunque haya cruzado un límite y llegue sin su prototipo.
    expect(clasificarError({ name: "ErrorDeDominio", message: "el ID 0 no existe" })).toBe("dominio");
  });

  it("separa los problemas de la carpeta por lo que hay que hacer con cada uno", () => {
    expect(clasificarError(dom("NotAllowedError"))).toBe("permiso-de-carpeta");
    expect(clasificarError(dom("SecurityError"))).toBe("permiso-de-carpeta");
    expect(clasificarError(dom("NoModificationAllowedError"))).toBe("permiso-de-carpeta");
    expect(clasificarError(dom("NotFoundError"))).toBe("no-esta");
    expect(clasificarError(dom("QuotaExceededError"))).toBe("sin-espacio");
  });

  it("reconoce quedarse sin memoria, que es el límite real del editor", () => {
    expect(clasificarError(new RangeError("Array buffer allocation failed"))).toBe("sin-memoria");
    expect(clasificarError(new RangeError("Invalid array length"))).toBe("sin-memoria");
    expect(clasificarError(new Error("Out of memory"))).toBe("sin-memoria");
  });

  it("un TypeError de red es red; cualquier otro TypeError es un bug y va a «otro»", () => {
    expect(clasificarError(new TypeError("Failed to fetch"))).toBe("red");
    expect(clasificarError(new TypeError("Load failed"))).toBe("red");
    // Éste es el que no hay que esconder detrás de una etiqueta tranquilizadora.
    expect(clasificarError(new TypeError("x.map is not a function"))).toBe("otro");
  });

  it("un trozo de la app que no se bajó es la conexión, no un bug", () => {
    expect(clasificarError({ name: "ChunkLoadError", message: "Loading chunk 3 failed" })).toBe("red");
  });

  it("lo que no reconoce cae en «otro», incluso si no es un Error", () => {
    expect(clasificarError(new Error("cualquier cosa"))).toBe("otro");
    expect(clasificarError("un string pelado")).toBe("otro");
    expect(clasificarError(undefined)).toBe("otro");
    expect(clasificarError(null)).toBe("otro");
  });
});
