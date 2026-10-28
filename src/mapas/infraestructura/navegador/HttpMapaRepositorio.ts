import { enviar, pedirJson } from "@/compartido/infraestructura/http";
import type { MapaGuardado, MapaRepositorio, ResumenDeMapa } from "../../dominio/MapaRepositorio";
import { MapaMapper, type MapaDto } from "../MapaDto";

/** El mismo repositorio, visto desde el navegador: cada operación es una llamada a `/api/mapas`. */
export class HttpMapaRepositorio implements MapaRepositorio {
  constructor(private readonly base = "/api/mapas") {}

  listar(): Promise<ResumenDeMapa[]> {
    return pedirJson<ResumenDeMapa[]>(this.base);
  }

  async obtener(numero: number): Promise<MapaGuardado | null> {
    const dto = await pedirJson<MapaDto | null>(`${this.base}/${numero}`);
    return dto ? MapaMapper.aDominio(dto) : null;
  }

  guardar(guardado: MapaGuardado): Promise<void> {
    return enviar(`${this.base}/${guardado.mapa.numero}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(MapaMapper.aDto(guardado)),
    });
  }

  eliminar(numero: number): Promise<void> {
    return enviar(`${this.base}/${numero}`, { method: "DELETE" });
  }
}
