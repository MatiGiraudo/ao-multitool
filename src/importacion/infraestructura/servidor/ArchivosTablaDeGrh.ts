import "server-only";
import { carpetaDeDatos, escribirAtomico, leerSiExiste } from "@/compartido/infraestructura/carpetaDeDatos";
import type { TablaDeGrh } from "../../dominio/TablaDeGrh";
import type { TablaDeGrhRepositorio } from "../../dominio/TablaDeGrhRepositorio";
import { TablaDeGrhMapper, type TablaDeGrhDto } from "../TablaDeGrhDto";

/** La tabla en `data/importacion/grh.json`. Son miles de entradas: se guarda en una línea por GRH. */
export class ArchivosTablaDeGrh implements TablaDeGrhRepositorio {
  constructor(private readonly ruta = carpetaDeDatos("importacion", "grh.json")) {}

  async leer(): Promise<TablaDeGrh | null> {
    const b = await leerSiExiste(this.ruta);
    return b ? TablaDeGrhMapper.aDominio(JSON.parse(b.toString("utf8")) as TablaDeGrhDto) : null;
  }

  async guardar(tabla: TablaDeGrh): Promise<void> {
    const dto = TablaDeGrhMapper.aDto(tabla);
    const lineas = dto.grhs.map((g) => "    " + JSON.stringify(g));
    await escribirAtomico(this.ruta, `{\n  "formato": "ao-grh",\n  "version": 1,\n  "grhs": [\n${lineas.join(",\n")}\n  ]\n}\n`);
  }
}
