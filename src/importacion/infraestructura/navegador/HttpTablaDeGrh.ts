import { enviar, pedirJson } from "@/compartido/infraestructura/http";
import type { TablaDeGrh } from "../../dominio/TablaDeGrh";
import type { TablaDeGrhRepositorio } from "../../dominio/TablaDeGrhRepositorio";
import { TablaDeGrhMapper, type TablaDeGrhDto } from "../TablaDeGrhDto";

/**
 * La tabla de un cliente entero son varios megas, y el editor de mapas la consulta a cada rato
 * (cada gráfico que cargás en el pincel). Por eso queda en memoria: se baja una vez y se refresca
 * sola cuando este mismo adaptador la guarda, que es la única forma de que cambie desde acá.
 */
export class HttpTablaDeGrh implements TablaDeGrhRepositorio {
  private enMemoria: TablaDeGrh | null = null;

  constructor(private readonly url = "/api/importacion/grh") {}

  async leer(): Promise<TablaDeGrh | null> {
    if (this.enMemoria) return this.enMemoria;
    const tabla = TablaDeGrhMapper.aDominio(await pedirJson<TablaDeGrhDto | null>(this.url));
    this.enMemoria = tabla;
    return tabla;
  }

  async guardar(tabla: TablaDeGrh): Promise<void> {
    await enviar(this.url, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(TablaDeGrhMapper.aDto(tabla)),
    });
    this.enMemoria = tabla;
  }
}
