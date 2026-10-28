import type { CarpetaDelProyecto } from "@/compartido/infraestructura/carpeta/CarpetaDelProyecto";
import type { FamiliaClasica, OriginalesDeFamilia, OriginalesRepositorio } from "../../dominio/OriginalesRepositorio";

/** Un archivo por familia en `importacion/originales/` de la carpeta elegida. */
export class CarpetaOriginales implements OriginalesRepositorio {
  constructor(private readonly carpeta: CarpetaDelProyecto) {}

  private ruta(familia: FamiliaClasica): string[] {
    return ["importacion", "originales", `${familia}.json`];
  }

  async leer(familia: FamiliaClasica): Promise<OriginalesDeFamilia> {
    const crudo = await this.carpeta.leerTexto(this.ruta(familia));
    return crudo ? (JSON.parse(crudo) as OriginalesDeFamilia) : {};
  }

  async guardar(familia: FamiliaClasica, entradas: OriginalesDeFamilia): Promise<void> {
    await this.carpeta.escribir(this.ruta(familia), JSON.stringify(entradas, null, 1) + "\n");
  }
}
