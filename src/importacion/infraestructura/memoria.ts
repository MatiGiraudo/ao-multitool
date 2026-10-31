import type { TablaDeGrh } from "../dominio/TablaDeGrh";
import type { TablaDeGrhRepositorio } from "../dominio/TablaDeGrhRepositorio";

export class MemoriaTablaDeGrh implements TablaDeGrhRepositorio {
  private tabla: TablaDeGrh | null = null;
  async leer() {
    return this.tabla;
  }
  /* No hay caché que saltear: la tabla ES esta propiedad. */
  async releer() {
    return this.tabla;
  }
  async guardar(tabla: TablaDeGrh) {
    this.tabla = tabla;
  }
}
