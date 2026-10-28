import { enviar, pedirJson } from "@/compartido/infraestructura/http";
import type { FamiliaClasica, OriginalesDeFamilia, OriginalesRepositorio } from "../../dominio/OriginalesRepositorio";

/** Lo mismo, por HTTP. Se piden de a una familia: son cientos de kilobytes cada una. */
export class HttpOriginales implements OriginalesRepositorio {
  constructor(private readonly base = "/api/importacion/originales") {}

  async leer(familia: FamiliaClasica): Promise<OriginalesDeFamilia> {
    return (await pedirJson<OriginalesDeFamilia | null>(`${this.base}/${familia}`)) ?? {};
  }

  async guardar(familia: FamiliaClasica, entradas: OriginalesDeFamilia): Promise<void> {
    await enviar(`${this.base}/${familia}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(entradas),
    });
  }
}
