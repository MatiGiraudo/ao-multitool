import type { Evento, Telemetria } from "@/compartido/aplicacion/Telemetria";
import type { ColeccionRepositorio } from "@/compartido/dominio/ColeccionRepositorio";

/** Adaptador para los tests: la colección en un Map, sin disco ni servidor. */
export class MemoriaColeccionRepositorio<T> implements ColeccionRepositorio<T> {
  private readonly items = new Map<string, T>();

  constructor(private readonly claveDe: (item: T) => string) {}

  async listar(): Promise<T[]> {
    return [...this.items.values()];
  }
  async guardar(item: T): Promise<void> {
    this.items.set(this.claveDe(item), item);
  }
  async guardarVarios(items: readonly T[]): Promise<void> {
    for (const i of items) this.items.set(this.claveDe(i), i);
  }
  async eliminar(clave: string): Promise<void> {
    this.items.delete(clave);
  }
}

/** Adaptador para los tests: los eventos medidos en una lista, en vez de mandarlos a ningún lado. */
export class TelemetriaEnMemoria implements Telemetria {
  readonly eventos: Evento[] = [];

  medir(evento: Evento): void {
    this.eventos.push(evento);
  }
}
