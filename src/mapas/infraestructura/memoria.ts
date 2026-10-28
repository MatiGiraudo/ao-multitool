import type { MapaGuardado, MapaRepositorio, ResumenDeMapa } from "../dominio/MapaRepositorio";

/** El repositorio de mapas en memoria: para los tests y para probar sin tocar el disco. */
export class MemoriaMapaRepositorio implements MapaRepositorio {
  private readonly porNumero = new Map<number, MapaGuardado>();

  async listar(): Promise<ResumenDeMapa[]> {
    return [...this.porNumero.values()]
      .map((g) => ({ numero: g.mapa.numero, nombre: g.mapa.info.nombre, nombreArchivo: g.nombreArchivo }))
      .sort((a, b) => a.numero - b.numero);
  }

  async obtener(numero: number): Promise<MapaGuardado | null> {
    return this.porNumero.get(numero) ?? null;
  }

  async guardar(guardado: MapaGuardado): Promise<void> {
    this.porNumero.set(guardado.mapa.numero, guardado);
  }

  async eliminar(numero: number): Promise<void> {
    this.porNumero.delete(numero);
  }
}
