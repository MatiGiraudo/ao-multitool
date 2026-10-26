import type { TablaDeGrh } from "../dominio/TablaDeGrh";
import type { TablaDeGrhRepositorio } from "../dominio/TablaDeGrhRepositorio";

export class MemoriaTablaDeGrh implements TablaDeGrhRepositorio {
  private tabla: TablaDeGrh | null = null;
  async leer() {
    return this.tabla;
  }
  async guardar(tabla: TablaDeGrh) {
    this.tabla = tabla;
  }
}
