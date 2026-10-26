import type { AlmacenDeImagenes, VarianteDeImagen } from "../aplicacion/puertos";
import type { HojaDeSprites } from "../dominio/HojaDeSprites";
import type { HojaRepositorio } from "../dominio/HojaRepositorio";

/** Adaptadores en memoria: para tests. Demuestran que los casos de uso no dependen del disco ni de HTTP. */
export class MemoriaHojaRepositorio implements HojaRepositorio {
  private readonly hojas = new Map<string, HojaDeSprites>();
  async listar() {
    return [...this.hojas.values()];
  }
  async obtener(id: string) {
    return this.hojas.get(id) ?? null;
  }
  async guardar(h: HojaDeSprites) {
    this.hojas.set(h.id, h);
  }
  async eliminar(id: string) {
    this.hojas.delete(id);
  }
}

export class MemoriaAlmacenDeImagenes implements AlmacenDeImagenes {
  readonly archivos = new Map<string, Blob>();
  async guardar(id: string, png: Blob, v: VarianteDeImagen) {
    this.archivos.set(`${id}:${v}`, png);
  }
  async leer(id: string, v: VarianteDeImagen) {
    return this.archivos.get(`${id}:${v}`) ?? null;
  }
  async eliminar(id: string) {
    this.archivos.delete(`${id}:actual`);
    this.archivos.delete(`${id}:original`);
  }
}
