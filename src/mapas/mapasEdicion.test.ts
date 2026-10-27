import { describe, expect, it } from "vitest";
import { Historial, celdasDelTrazo } from "./dominio/Historial";
import { AJUSTES_POR_DEFECTO, calcular, type Ajustes } from "./dominio/herramientas";
import { ALTO, ANCHO, Mapa } from "./dominio/Mapa";

/** Un mapa con el piso parejo, que es el punto de partida real de cualquier edición. */
function conPiso(grh = 1000): Mapa {
  const mapa = Mapa.vacio(1);
  for (let y = 1; y <= ALTO; y++) for (let x = 1; x <= ANCHO; x++) mapa.ponerGrafico(x, y, 1, grh);
  return mapa;
}

function ajustes(cambios: Partial<Ajustes>): Ajustes {
  return { ...AJUSTES_POR_DEFECTO, ...cambios };
}

describe("herramientas", () => {
  it("el pincel pinta el cuadrado de su tamaño y lo recorta en el borde", () => {
    const mapa = conPiso();
    const centro = calcular(mapa, ajustes({ grh: 7, tamanio: 3 }), { x: 50, y: 50 });
    expect(centro.cambios).toHaveLength(9);

    const esquina = calcular(mapa, ajustes({ grh: 7, tamanio: 3 }), { x: 1, y: 1 });
    expect(esquina.cambios).toHaveLength(4);
  });

  it("no deja huecos cuando el mouse salta celdas", () => {
    const mapa = conPiso();
    // Entre un cuadro y el siguiente el puntero puede moverse diez celdas; la pincelada tiene que
    // ser una línea, no una serie de puntos sueltos.
    const trazo = calcular(mapa, ajustes({ grh: 7 }), { x: 1, y: 1 }, { x: 10, y: 10 });
    expect(celdasDelTrazo(trazo)).toHaveLength(10);
    const horizontal = calcular(mapa, ajustes({ grh: 7 }), { x: 1, y: 1 }, { x: 5, y: 1 });
    expect(celdasDelTrazo(horizontal)).toHaveLength(5);
  });

  it("no anota cambios donde ya estaba lo mismo", () => {
    const mapa = conPiso(7);
    expect(calcular(mapa, ajustes({ grh: 7, tamanio: 3 }), { x: 50, y: 50 }).cambios).toHaveLength(0);
  });

  it("el rectángulo pinta el área, se dibuje para donde se dibuje", () => {
    const mapa = conPiso();
    const alDerecho = calcular(mapa, ajustes({ herramienta: "rectangulo", grh: 7 }), { x: 2, y: 3 }, { x: 5, y: 6 });
    const alReves = calcular(mapa, ajustes({ herramienta: "rectangulo", grh: 7 }), { x: 5, y: 6 }, { x: 2, y: 3 });
    expect(alDerecho.cambios).toHaveLength(16);
    expect(celdasDelTrazo(alDerecho).sort()).toEqual(celdasDelTrazo(alReves).sort());
  });

  it("el balde llena sólo la región pegada y del mismo gráfico", () => {
    const mapa = conPiso();
    // Una pared vertical que parte el mapa en dos.
    for (let y = 1; y <= ALTO; y++) mapa.ponerGrafico(50, y, 1, 999);

    const izquierda = calcular(mapa, ajustes({ herramienta: "balde", grh: 7 }), { x: 10, y: 10 });
    expect(izquierda.cambios).toHaveLength(49 * ALTO);
    expect(izquierda.cambios.every((c) => c.tipo === "grafico" && c.antes === 1000)).toBe(true);
  });

  it("la goma borra, y bloquear y desbloquear sólo cambian lo que hace falta", () => {
    const mapa = conPiso();
    const historial = new Historial();

    historial.aplicar(mapa, calcular(mapa, ajustes({ herramienta: "goma" }), { x: 4, y: 4 }));
    expect(mapa.grafico(4, 4, 1)).toBe(0);

    historial.aplicar(mapa, calcular(mapa, ajustes({ herramienta: "bloquear", tamanio: 3 }), { x: 4, y: 4 }));
    expect(mapa.bloqueada(4, 4)).toBe(true);
    expect(mapa.contar().bloqueadas).toBe(9);

    // Las nueve ya están bloqueadas: volver a bloquear no es un cambio.
    expect(calcular(mapa, ajustes({ herramienta: "bloquear", tamanio: 3 }), { x: 4, y: 4 }).cambios).toHaveLength(0);

    historial.aplicar(mapa, calcular(mapa, ajustes({ herramienta: "desbloquear", tamanio: 3 }), { x: 4, y: 4 }));
    expect(mapa.contar().bloqueadas).toBe(0);
  });

  it("sin gráfico elegido, las herramientas que ponen gráficos no borran nada", () => {
    const mapa = conPiso();
    for (const herramienta of ["pincel", "rectangulo", "balde"] as const) {
      expect(calcular(mapa, ajustes({ herramienta, grh: 0 }), { x: 4, y: 4 }, { x: 9, y: 9 }).cambios).toHaveLength(0);
    }
    // La goma sí borra: es para lo que está.
    expect(calcular(mapa, ajustes({ herramienta: "goma" }), { x: 4, y: 4 }).cambios).toHaveLength(1);
  });

  it("el cuentagotas no cambia nada", () => {
    const mapa = conPiso();
    expect(calcular(mapa, ajustes({ herramienta: "cuentagotas" }), { x: 4, y: 4 }).cambios).toHaveLength(0);
  });
});

describe("Historial", () => {
  it("deshace y rehace dejando el mapa igual que antes", () => {
    const mapa = conPiso();
    const historial = new Historial();
    const antes = [...mapa.datosCrudos().capas[0]!];

    historial.aplicar(mapa, calcular(mapa, ajustes({ herramienta: "rectangulo", grh: 7 }), { x: 2, y: 2 }, { x: 40, y: 40 }));
    expect(mapa.grafico(20, 20, 1)).toBe(7);
    expect(historial.puedeDeshacer).toBe(true);

    historial.deshacer(mapa);
    expect([...mapa.datosCrudos().capas[0]!]).toEqual(antes);
    expect(historial.puedeDeshacer).toBe(false);
    expect(historial.puedeRehacer).toBe(true);

    historial.rehacer(mapa);
    expect(mapa.grafico(20, 20, 1)).toBe(7);
    expect(historial.pasos).toBe(1);
  });

  it("deshace varios pasos en orden, incluso si se pisan entre ellos", () => {
    const mapa = conPiso();
    const historial = new Historial();
    for (const grh of [11, 22, 33]) {
      historial.aplicar(mapa, calcular(mapa, ajustes({ grh }), { x: 5, y: 5 }));
    }
    expect(mapa.grafico(5, 5, 1)).toBe(33);
    historial.deshacer(mapa);
    expect(mapa.grafico(5, 5, 1)).toBe(22);
    historial.deshacer(mapa);
    expect(mapa.grafico(5, 5, 1)).toBe(11);
    historial.deshacer(mapa);
    expect(mapa.grafico(5, 5, 1)).toBe(1000);
    expect(historial.deshacer(mapa)).toBeNull();
  });

  it("una pincelada entera es un solo paso, aunque llegue en tramos", () => {
    const mapa = conPiso();
    const historial = new Historial();
    const ajuste = ajustes({ grh: 7 });

    // Como llega de verdad desde el lienzo: un tramo por cada movimiento del mouse.
    historial.aplicar(mapa, calcular(mapa, ajuste, { x: 10, y: 10 }), false);
    for (let x = 11; x <= 20; x++) {
      historial.aplicar(mapa, calcular(mapa, ajuste, { x: x - 1, y: 10 }, { x, y: 10 }), true);
    }
    expect(historial.pasos).toBe(1);
    expect(mapa.grafico(20, 10, 1)).toBe(7);

    historial.deshacer(mapa);
    expect(mapa.grafico(10, 10, 1)).toBe(1000);
    expect(mapa.grafico(20, 10, 1)).toBe(1000);
  });

  it("deshace bien una pincelada que se pisa a sí misma", () => {
    const mapa = conPiso();
    const historial = new Historial();
    // Ir y volver por la misma celda: el valor «antes» del segundo tramo ya es el pintado.
    historial.aplicar(mapa, calcular(mapa, ajustes({ grh: 7 }), { x: 5, y: 5 }), false);
    historial.aplicar(mapa, calcular(mapa, ajustes({ grh: 8 }), { x: 5, y: 5 }), true);
    expect(mapa.grafico(5, 5, 1)).toBe(8);
    historial.deshacer(mapa);
    expect(mapa.grafico(5, 5, 1)).toBe(1000);
  });

  it("un trazo vacío no gasta un paso", () => {
    const mapa = conPiso(7);
    const historial = new Historial();
    expect(historial.aplicar(mapa, calcular(mapa, ajustes({ grh: 7 }), { x: 5, y: 5 }))).toBe(false);
    expect(historial.puedeDeshacer).toBe(false);
  });

  it("editar después de deshacer tira abajo el rehacer", () => {
    const mapa = conPiso();
    const historial = new Historial();
    historial.aplicar(mapa, calcular(mapa, ajustes({ grh: 11 }), { x: 5, y: 5 }));
    historial.deshacer(mapa);
    expect(historial.puedeRehacer).toBe(true);
    historial.aplicar(mapa, calcular(mapa, ajustes({ grh: 22 }), { x: 6, y: 6 }));
    expect(historial.puedeRehacer).toBe(false);
  });

  it("tiene tope de pasos: lo más viejo se olvida", () => {
    const mapa = conPiso();
    const historial = new Historial(3);
    for (const grh of [11, 22, 33, 44]) {
      historial.aplicar(mapa, calcular(mapa, ajustes({ grh }), { x: 5, y: 5 }));
    }
    expect(historial.pasos).toBe(3);
    for (let i = 0; i < 3; i++) historial.deshacer(mapa);
    // El primer paso ya no está, así que el 11 queda puesto: es el precio de tener tope.
    expect(mapa.grafico(5, 5, 1)).toBe(11);
    expect(historial.puedeDeshacer).toBe(false);
  });

  it("dice qué se deshace, para poder mostrarlo", () => {
    const mapa = conPiso();
    const historial = new Historial();
    expect(historial.ultimo).toBeNull();
    historial.aplicar(mapa, calcular(mapa, ajustes({ herramienta: "balde", grh: 7 }), { x: 5, y: 5 }));
    expect(historial.ultimo).toBe("Balde");
    expect(ANCHO).toBe(100);
  });
});
