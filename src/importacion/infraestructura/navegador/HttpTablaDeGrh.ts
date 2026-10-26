import { enviar, pedirJson } from "@/compartido/infraestructura/http";
import type { TablaDeGrh } from "../../dominio/TablaDeGrh";
import type { TablaDeGrhRepositorio } from "../../dominio/TablaDeGrhRepositorio";
import { TablaDeGrhMapper, type TablaDeGrhDto } from "../TablaDeGrhDto";

export class HttpTablaDeGrh implements TablaDeGrhRepositorio {
  constructor(private readonly url = "/api/importacion/grh") {}

  async leer(): Promise<TablaDeGrh | null> {
    return TablaDeGrhMapper.aDominio(await pedirJson<TablaDeGrhDto | null>(this.url));
  }

  async guardar(tabla: TablaDeGrh): Promise<void> {
    await enviar(this.url, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(TablaDeGrhMapper.aDto(tabla)),
    });
  }
}
