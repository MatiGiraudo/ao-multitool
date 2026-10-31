"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { NavegadorSinCarpetas } from "@/compartido/aplicacion/Telemetria";
import { CarpetaDelProyecto, type EstadoDeLaCarpeta } from "@/compartido/infraestructura/carpeta/CarpetaDelProyecto";
import { carpetaDelProyecto, MODO_DE_DATOS } from "@/contenedor/cliente";
import { useAplicacion } from "./Aplicacion";
import { Cargando } from "./componentes";

/*
 * La puerta del modo carpeta: hasta que no haya una carpeta elegida, no hay editor.
 *
 * En el modo servidor esto no se ve nunca —los datos están en el disco del servidor— y el
 * componente devuelve lo que envuelve sin tocar nada. En el modo carpeta, en cambio, no hay
 * ningún lugar donde leer ni escribir hasta que el usuario elige una carpeta suya, así que
 * montar las pantallas antes sería mostrar siete herramientas vacías que fallan al tocarlas.
 */
export function PuertaDeCarpeta({ children }: { children: ReactNode }) {
  const { telemetria } = useAplicacion();
  const [estado, setEstado] = useState<EstadoDeLaCarpeta | "mirando">("mirando");
  const [error, setError] = useState("");

  const mirar = useCallback(async () => {
    try {
      setEstado(await carpetaDelProyecto.recuperar());
    } catch {
      setEstado("sin-carpeta");
    }
  }, []);

  useEffect(() => {
    if (MODO_DE_DATOS === "carpeta" && CarpetaDelProyecto.disponible) void mirar();
  }, [mirar]);

  /*
   * Lo único que vale la pena medir de esta pantalla: quién la pasa y quién se queda afuera.
   *
   * «Carpeta elegida» es la medida de uso real del editor, y no las visitas: entrar a la dirección
   * no cuesta nada, y abrir una carpeta es ponerse a trabajar. Va con el estado "lista" y no con el
   * clic en el botón porque a la carpeta se llega de tres maneras —recuperada, elegida de nuevo o
   * con el permiso repedido— y las tres son lo mismo acá.
   *
   * «Navegador sin soporte» es la otra cara: cuánta gente rebota por estar en Firefox o en Safari.
   * Es el número que decide si vale la pena ofrecerles otra forma de entrar o no.
   *
   * Una sola vez por sesión, de ahí el ref.
   */
  const medido = useRef(false);

  useEffect(() => {
    if (medido.current || MODO_DE_DATOS !== "carpeta") return;
    if (!CarpetaDelProyecto.disponible) {
      medido.current = true;
      telemetria.medir({ tipo: "navegador sin soporte", navegador: cualNavegador() });
    } else if (estado === "lista") {
      medido.current = true;
      telemetria.medir({ tipo: "carpeta elegida" });
    }
  }, [estado, telemetria]);

  if (MODO_DE_DATOS !== "carpeta") return <>{children}</>;

  if (!CarpetaDelProyecto.disponible) {
    return (
      <main className="layout">
        <section className="panel">
          <h2>Este navegador no puede abrir carpetas</h2>
          <p className="hint">
            El editor trabaja directo contra una carpeta de tu máquina, y eso lo permiten sólo los navegadores basados en Chromium: Chrome, Edge,
            Brave, Opera. Firefox y Safari todavía no tienen la API que hace falta (<code>showDirectoryPicker</code>).
          </p>
          <p className="hint">Abrí esta misma dirección en alguno de ésos y vas a poder elegir tu carpeta.</p>
        </section>
      </main>
    );
  }

  if (estado === "mirando") return <Cargando bloque>Buscando la carpeta del proyecto…</Cargando>;
  if (estado === "lista") return <>{children}</>;

  const elegir = async () => {
    setError("");
    try {
      await carpetaDelProyecto.elegir();
      setEstado("lista");
    } catch (e) {
      // Cancelar el selector tira AbortError, y eso no es un problema que haya que mostrar.
      if ((e as DOMException)?.name !== "AbortError") setError(e instanceof Error ? e.message : String(e));
    }
  };

  const retomar = async () => {
    setError("");
    if (await carpetaDelProyecto.pedirPermiso()) setEstado("lista");
    else setError("El navegador no dio permiso sobre esa carpeta. Podés elegirla de nuevo.");
  };

  return (
    <main className="layout">
      <section className="panel">
        <h2>Elegí la carpeta del proyecto</h2>
        <p className="hint">
          Tus datos no se suben a ningún lado: el editor los lee y los escribe en una carpeta tuya, acá en tu máquina. Es la misma carpeta{" "}
          <code>data/</code> que usa la versión local, con el mismo formato, así que podés abrir una que ya tengas o una vacía para empezar de cero.
        </p>
        <div className="row">
          {estado === "falta-permiso" ? (
            <>
              <button className="primary" onClick={retomar}>
                Seguir con «{carpetaDelProyecto.nombre}»
              </button>
              <button onClick={elegir}>Elegir otra…</button>
            </>
          ) : (
            <button className="primary" onClick={elegir}>
              Elegir carpeta…
            </button>
          )}
        </div>
        {estado === "falta-permiso" && (
          <p className="hint">
            Ya habías elegido <code>{carpetaDelProyecto.nombre}</code>. El navegador pide el permiso de nuevo en cada sesión, y sólo lo puede pedir
            cuando hacés clic: por eso el botón.
          </p>
        )}
        {!!error && <p className="hint aviso">{error}</p>}
      </section>
    </main>
  );
}

/*
 * Cuál es el navegador que no abre carpetas. Sólo para saber a quién le estamos cerrando la puerta:
 * tres valores y nada más, ni versión ni sistema ni el user agent entero.
 *
 * Chrome y Edge también dicen «Safari» en el user agent; el verdadero Safari es el que no dice
 * «Chrom». De todos modos acá sólo llegan los navegadores sin la API de carpetas, así que los
 * basados en Chromium no deberían aparecer.
 */
function cualNavegador(): NavegadorSinCarpetas {
  const ua = navigator.userAgent;
  if (ua.includes("Firefox/")) return "firefox";
  if (ua.includes("Safari/") && !ua.includes("Chrom")) return "safari";
  return "otro";
}
