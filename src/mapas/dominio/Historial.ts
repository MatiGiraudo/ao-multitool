import { ANCHO, Mapa, type ObjetoEnElSuelo, type Traslado } from "./Mapa";

/*
 * Deshacer y rehacer, guardando diferencias.
 *
 * Es el primer módulo del editor donde deshacer es indispensable, y también donde la forma obvia
 * no sirve: sacarle una foto al mapa antes de cada pincelada serían 160 KB por paso. Lo que se
 * guarda es el cambio —qué celda, qué capa, qué había y qué quedó—, que para una pincelada son
 * unas pocas decenas de entradas.
 */

export type Cambio =
  | { tipo: "grafico"; indice: number; capa: number; antes: number; despues: number }
  | { tipo: "bloqueo"; indice: number; antes: boolean; despues: boolean }
  | { tipo: "trigger"; indice: number; antes: number; despues: number }
  | { tipo: "traslado"; indice: number; antes: Traslado | null; despues: Traslado | null }
  | { tipo: "npc"; indice: number; antes: number; despues: number }
  | { tipo: "objeto"; indice: number; antes: ObjetoEnElSuelo | null; despues: ObjetoEnElSuelo | null };

/** Todo lo que cambió de una sola acción del usuario: una pincelada, un rectángulo, un balde. */
export interface Trazo {
  nombre: string;
  cambios: Cambio[];
}

export class Historial {
  private readonly hechos: Trazo[] = [];
  private readonly deshechos: Trazo[] = [];

  constructor(private readonly maximo = 100) {}

  get puedeDeshacer(): boolean {
    return this.hechos.length > 0;
  }
  get puedeRehacer(): boolean {
    return this.deshechos.length > 0;
  }
  get pasos(): number {
    return this.hechos.length;
  }
  /** Qué se deshace con el próximo ctrl+Z, para poder decirlo en la interfaz. */
  get ultimo(): string | null {
    return this.hechos.at(-1)?.nombre ?? null;
  }

  /**
   * Aplica el trazo y lo anota. Un trazo sin cambios no entra: tocar una celda que ya tenía lo
   * mismo no debería gastar un paso de deshacer.
   *
   * `fundir` es para las pinceladas: mientras el botón del mouse está apretado llegan decenas de
   * tramos, y el usuario espera que ctrl+Z le saque la pincelada entera, no el último tramo. Los
   * cambios se van agregando al final del trazo anterior, así que deshacer sigue siendo correcto
   * aunque una celda se haya pintado dos veces en la misma pincelada.
   */
  aplicar(mapa: Mapa, trazo: Trazo, fundir = false): boolean {
    if (!trazo.cambios.length) return false;
    for (const cambio of trazo.cambios) escribir(mapa, cambio, "despues");
    const anterior = fundir ? this.hechos.at(-1) : undefined;
    if (anterior) anterior.cambios.push(...trazo.cambios);
    else this.hechos.push(trazo);
    if (this.hechos.length > this.maximo) this.hechos.shift();
    // Rehacer deja de tener sentido en cuanto se edita otra cosa.
    this.deshechos.length = 0;
    return true;
  }

  deshacer(mapa: Mapa): Trazo | null {
    const trazo = this.hechos.pop();
    if (!trazo) return null;
    // Al revés: lo último que se escribió es lo primero que se vuelve atrás.
    for (let i = trazo.cambios.length - 1; i >= 0; i--) escribir(mapa, trazo.cambios[i]!, "antes");
    this.deshechos.push(trazo);
    return trazo;
  }

  rehacer(mapa: Mapa): Trazo | null {
    const trazo = this.deshechos.pop();
    if (!trazo) return null;
    for (const cambio of trazo.cambios) escribir(mapa, cambio, "despues");
    this.hechos.push(trazo);
    return trazo;
  }

  limpiar(): void {
    this.hechos.length = 0;
    this.deshechos.length = 0;
  }
}

function escribir(mapa: Mapa, cambio: Cambio, lado: "antes" | "despues"): void {
  const x = (cambio.indice % ANCHO) + 1;
  const y = Math.floor(cambio.indice / ANCHO) + 1;
  switch (cambio.tipo) {
    case "grafico":
      return mapa.ponerGrafico(x, y, cambio.capa, cambio[lado]);
    case "bloqueo":
      return mapa.bloquear(x, y, cambio[lado]);
    case "trigger":
      return mapa.ponerTrigger(x, y, cambio[lado]);
    case "traslado":
      return mapa.ponerTraslado(x, y, cambio[lado]);
    case "npc":
      return mapa.ponerNpc(x, y, cambio[lado]);
    case "objeto":
      return mapa.ponerObjeto(x, y, cambio[lado]);
  }
}

/** Las celdas que tocó un trazo, para redibujar sólo esos bloques. */
export function celdasDelTrazo(trazo: Trazo): number[] {
  return [...new Set(trazo.cambios.map((c) => c.indice))];
}

export { Mapa };
