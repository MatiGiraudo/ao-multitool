"use client";
import { useEffect, useState } from "react";
import { BotonArchivos } from "./componentes";

/*
 * Un probador del selector de carpetas, para cuando el editor no puede abrir una y nadie sabe por
 * qué.
 *
 * Existe porque el navegador cuenta todas sus negativas con el mismo nombre: `AbortError`, lo
 * mismo si cancelaste, si te negó la carpeta y si el sitio tiene bloqueado el permiso. Desde el
 * editor no hay forma de distinguirlas… pero sí se puede ver cuál variante del mismo pedido pasa
 * y cuál no, y eso ya dice dónde mirar: si abrir sin opciones anda y con `id` no, es el `id`; si
 * sólo falla la de lectura y la de escritura anda, es el modo; si no anda ninguna, es el permiso
 * del sitio y el editor no tiene nada que hacer ahí. Una carpeta que entra y dice cuántas cosas
 * tiene adentro cierra la discusión en la otra dirección: el navegador puede.
 *
 * Un botón por variante, y no uno solo que las corra todas, porque cada selector necesita su
 * propio clic: el navegador no abre ninguno sin un gesto del usuario, y un gesto alcanza para uno.
 *
 * Es una pantalla de diagnóstico, así que acá sí van las palabras del navegador tal cual, en
 * inglés y sin maquillar, y un botón para copiarlas: lo que se busca es poder pegarlas en otro
 * lado, no que se lean lindo.
 */

interface Variante {
  clave: string;
  que: string;
  abrir: () => Promise<FileSystemDirectoryHandle>;
}

const VARIANTES: readonly Variante[] = [
  { clave: "pelado", que: "Sin ninguna opción", abrir: () => window.showDirectoryPicker() },
  { clave: "lectura", que: "Sólo lectura", abrir: () => window.showDirectoryPicker({ mode: "read" }) },
  {
    clave: "con-id",
    que: "Lectura, recordándola — lo de «Mapas»",
    abrir: () => window.showDirectoryPicker({ id: "carpeta-mundos", mode: "read" }),
  },
  {
    clave: "escritura",
    que: "Lectura y escritura — lo del proyecto",
    abrir: () => window.showDirectoryPicker({ mode: "readwrite" }),
  },
];

/*
 * Y los que no pasan por esa API para nada: el `<input type=file>` de toda la vida, con y sin
 * `webkitdirectory`. Abren el mismo cuadro de Windows por otro camino del navegador, así que
 * separan las dos preguntas que de afuera se confunden: si éstos andan y los de arriba no, lo que
 * está roto es la File System Access API; si no anda ninguno, lo que está roto es el cuadro, y ahí
 * hay que mirar la máquina —un antivirus, un agente de la empresa— y no el navegador.
 *
 * Cancelar un `<input>` no avisa en ningún navegador, así que una fila que no dice nada no quiere
 * decir que falló: quiere decir que no volvió.
 */
const POR_INPUT = [
  { clave: "input-carpeta", que: "El <input> de siempre, una carpeta", carpeta: true },
  { clave: "input-archivo", que: "El <input> de siempre, un archivo", carpeta: false },
] as const;

/** Cuántas entradas se cuentan antes de cortar: alcanza para saber que se puede leer. */
const SUFICIENTES = 500;

export function ProbadorDeSelector() {
  const [resultados, setResultados] = useState<Record<string, string>>({});
  const [probando, setProbando] = useState("");
  /* En el servidor no hay `window`, y decidirlo al renderizar daría un HTML distinto al de la
   * hidratación. Es el mismo cuidado que en `SelectoresRecordados`. */
  const [entorno, setEntorno] = useState("");

  useEffect(() => {
    setEntorno(
      [
        `origen: ${location.origin}`,
        `contexto seguro: ${window.isSecureContext ? "sí" : "no"}`,
        `showDirectoryPicker: ${"showDirectoryPicker" in window ? "sí" : "no"}`,
        navigator.userAgent,
      ].join("\n"),
    );
  }, []);

  const probar = async (variante: Variante) => {
    setProbando(variante.clave);
    const empezo = performance.now();
    let linea: string;
    try {
      const carpeta = await variante.abrir();
      let entradas = 0;
      for await (const entrada of carpeta.entries()) {
        void entrada;
        if (++entradas >= SUFICIENTES) break;
      }
      linea = `✔ «${carpeta.name}», ${entradas}${entradas >= SUFICIENTES ? "+" : ""} entradas`;
    } catch (e) {
      const error = e as DOMException;
      linea = `✘ ${error?.name ?? "Error"}: ${error?.message ?? String(e)}`;
    }
    setResultados((previos) => ({ ...previos, [variante.clave]: `${linea} · ${Math.round(performance.now() - empezo)} ms` }));
    setProbando("");
  };

  const contar = (clave: string) => (archivos: File[]) =>
    setResultados((previos) => ({
      ...previos,
      [clave]: archivos.length ? `✔ ${archivos.length} archivo${archivos.length === 1 ? "" : "s"}` : "✘ no entregó nada",
    }));

  const informe = [...VARIANTES, ...POR_INPUT].map((v) => `${v.que}: ${resultados[v.clave] ?? "sin probar"}`).concat(entorno).join("\n");

  return (
    <section className="panel">
      <h3>El selector de carpetas</h3>
      <p className="hint">
        Si el editor no puede abrir una carpeta que vos sí ves, probá acá las cuatro formas de pedirla. La que pase y la que no dicen dónde está el
        problema. Cada una abre su propio cuadro: elegí la misma carpeta en todas.
      </p>
      <div className="olist-items">
        {VARIANTES.map((variante) => (
          <div key={variante.clave} className="row between">
            <span style={{ minWidth: 0 }}>
              <span className="nm">{variante.que}</span>
              <span className="meta">{resultados[variante.clave] ?? "sin probar"}</span>
            </span>
            <button disabled={!!probando} onClick={() => void probar(variante)}>
              {probando === variante.clave ? "Esperando…" : "Probar"}
            </button>
          </div>
        ))}
      </div>
      <p className="hint">
        Estos dos no usan esa API para nada: son el <code>&lt;input type=file&gt;</code> de toda la vida. Si éstos andan y los de arriba no, lo roto es
        la API del navegador; si no anda ninguno, lo roto es el cuadro de Windows y hay que mirar la máquina.
      </p>
      {/* El final del único caso real que tuvimos, puesto acá para que el próximo no tarde una tarde:
          Chrome 157 con esta API muerta, el mismo Windows con Edge andando perfecto. */}
      <p className="hint">
        Si las cuatro de arriba fallan y estas dos andan, probá esta misma dirección en <b>Edge</b>, que es el mismo Chromium en otra instalación. Hay
        Chrome donde esta parte del navegador simplemente no anda, y ahí no hay nada que el editor pueda hacer: se arregla en el navegador o se usa el
        otro.
      </p>
      <div className="olist-items">
        {POR_INPUT.map((fila) => (
          <div key={fila.clave} className="row between">
            <span style={{ minWidth: 0 }}>
              <span className="nm">{fila.que}</span>
              <span className="meta">{resultados[fila.clave] ?? "sin probar"}</span>
            </span>
            <BotonArchivos carpeta={fila.carpeta} accept="" onArchivos={contar(fila.clave)}>
              Probar
            </BotonArchivos>
          </div>
        ))}
      </div>
      <div className="row">
        <button onClick={() => void navigator.clipboard.writeText(informe)}>Copiar el informe</button>
      </div>
      <pre className="hint" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {entorno}
      </pre>
    </section>
  );
}
