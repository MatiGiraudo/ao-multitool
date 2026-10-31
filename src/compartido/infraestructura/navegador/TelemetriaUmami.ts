import type { Evento, Telemetria } from "@/compartido/aplicacion/Telemetria";

/**
 * Los eventos a Umami, que es quien los cuenta.
 *
 * El script lo carga el layout, y sólo en el sitio publicado; acá sólo se le habla. Umami no usa
 * cookies ni guarda nada que identifique a nadie: por eso el editor no tiene que pedir permiso.
 *
 * Dos cosas que este adaptador no hace, y es a propósito:
 *
 * - **No espera.** Si el script todavía no cargó, o un bloqueador se lo comió, `window.umami` no
 *   existe y el evento se pierde. Perder una medición no es un problema; encolarla para después
 *   sería código que vive esperando algo que capaz nunca llega.
 * - **No falla.** El `try` está porque medir no puede romper el editor. Si algo explota del otro
 *   lado, el usuario tiene que seguir trabajando sin enterarse.
 *
 * El nombre del evento es su `tipo` y el resto de los campos van como datos, tal como vienen: la
 * forma del puerto ya garantiza que ahí no hay nada que no se pueda mandar.
 */
export class TelemetriaUmami implements Telemetria {
  medir(evento: Evento): void {
    const { tipo, ...datos } = evento;
    try {
      window.umami?.track(tipo, datos);
    } catch {
      /* Medir no puede romper el editor. */
    }
  }
}
