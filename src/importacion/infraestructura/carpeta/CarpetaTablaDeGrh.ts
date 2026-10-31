import type { CarpetaDelProyecto } from "@/compartido/infraestructura/carpeta/CarpetaDelProyecto";
import type { TablaDeGrh } from "../../dominio/TablaDeGrh";
import type { TablaDeGrhRepositorio } from "../../dominio/TablaDeGrhRepositorio";
import { TablaDeGrhMapper, type TablaDeGrhDto } from "../TablaDeGrhDto";

/**
 * La tabla en `importacion/grh.json` de la carpeta elegida, con el mismo formato que el servidor:
 * una línea por GRH, que son miles y así el archivo se puede mirar y diffear.
 *
 * Queda en memoria después de la primera lectura, igual que el adaptador HTTP: el editor de mapas
 * la consulta con cada gráfico que ponés en el pincel, y son varios megas de JSON.
 */
export class CarpetaTablaDeGrh implements TablaDeGrhRepositorio {
  private enMemoria: TablaDeGrh | null = null;

  constructor(private readonly carpeta: CarpetaDelProyecto) {}

  async leer(): Promise<TablaDeGrh | null> {
    if (this.enMemoria) return this.enMemoria;
    const crudo = await this.carpeta.leerTexto(["importacion", "grh.json"]);
    if (!crudo) return null;
    this.enMemoria = TablaDeGrhMapper.aDominio(JSON.parse(crudo) as TablaDeGrhDto);
    return this.enMemoria;
  }

  async releer(): Promise<TablaDeGrh | null> {
    this.enMemoria = null;
    return this.leer();
  }

  async guardar(tabla: TablaDeGrh): Promise<void> {
    const dto = TablaDeGrhMapper.aDto(tabla);
    const lineas = dto.grhs.map((g) => "    " + JSON.stringify(g));
    await this.carpeta.escribir(["importacion", "grh.json"], `{\n  "formato": "ao-grh",\n  "version": 1,\n  "grhs": [\n${lineas.join(",\n")}\n  ]\n}\n`);
    this.enMemoria = tabla;
  }
}
