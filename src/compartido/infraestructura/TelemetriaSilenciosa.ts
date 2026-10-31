import type { Evento, Telemetria } from "@/compartido/aplicacion/Telemetria";

/**
 * La que no mide nada, y es la que corre casi siempre: en tu máquina, en desarrollo y en los tests.
 *
 * No es un caso degenerado ni un placeholder: es el comportamiento por defecto del editor. Medir es
 * la excepción, y pasa sólo en el sitio publicado.
 */
export class TelemetriaSilenciosa implements Telemetria {
  medir(_evento: Evento): void {}
}
