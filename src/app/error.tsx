"use client";
import { useEffect } from "react";
import { useAplicacion } from "@/compartido/ui/Aplicacion";

/*
 * La red abajo del trapecio: lo que se ve cuando una pantalla se cae al renderizar.
 *
 * Es el otro lugar por donde llegan los errores, y el menos frecuente de los dos: casi todo lo que
 * falla en el editor pasa por `intentar` y termina como un aviso, sin tirar la pantalla. Acá llega
 * lo que explotó renderizando, que sin este archivo deja la pestaña en blanco y sin forma de salir.
 *
 * El layout sigue montado —el encabezado, los avisos y el contenedor de casos de uso—, así que
 * desde acá se puede cambiar de pestaña, y medir con el mismo `medirError` que usa `intentar`: una
 * vez por pantalla y por clase de error, y nunca el mensaje.
 *
 * El mensaje sí se muestra, que es otra cosa: no sale de la máquina de quien lo lee, y es lo único
 * que le da una pista de qué pasó. Es lo mismo que hace el editor con cualquier otro error.
 */
export default function PantallaDeError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { medirError } = useAplicacion();

  useEffect(() => {
    medirError(error);
  }, [error, medirError]);

  return (
    <main className="layout">
      <section className="panel">
        <h2>Se rompió esta pantalla</h2>
        <p className="hint">
          No es algo que hayas hecho mal: el editor se cayó dibujando esta pestaña. Las demás siguen andando, así que podés seguir trabajando en
          otra mientras tanto.
        </p>
        <p className="hint aviso">{error.message}</p>
        <div className="row">
          <button className="primary" onClick={reset}>
            Volver a intentar
          </button>
        </div>
        <p className="hint">
          Lo que ya se había guardado está en tu carpeta: el editor escribe unos milisegundos después de cada cambio, así que lo único que puede
          haberse perdido es lo último que tocaste.
        </p>
      </section>
    </main>
  );
}
