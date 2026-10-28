import "server-only";
import { carpetaDeDatos, escribirAtomico, leerSiExiste } from "@/compartido/infraestructura/carpetaDeDatos";
import type { FamiliaClasica, OriginalesDeFamilia, OriginalesRepositorio } from "../../dominio/OriginalesRepositorio";

/** Un archivo por familia: `data/importacion/originales/obj.json`. */
export class ArchivosOriginales implements OriginalesRepositorio {
  constructor(private readonly carpeta = carpetaDeDatos("importacion", "originales")) {}

  private ruta(familia: FamiliaClasica) {
    return `${this.carpeta}/${familia}.json`;
  }

  async leer(familia: FamiliaClasica): Promise<OriginalesDeFamilia> {
    const b = await leerSiExiste(this.ruta(familia));
    return b ? (JSON.parse(b.toString("utf8")) as OriginalesDeFamilia) : {};
  }

  async guardar(familia: FamiliaClasica, entradas: OriginalesDeFamilia): Promise<void> {
    await escribirAtomico(this.ruta(familia), JSON.stringify(entradas, null, 1) + "\n");
  }
}
