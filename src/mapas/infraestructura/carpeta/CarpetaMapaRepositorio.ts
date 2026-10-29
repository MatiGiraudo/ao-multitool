import type { CarpetaDelProyecto } from "@/compartido/infraestructura/carpeta/CarpetaDelProyecto";
import type { MapaGuardado, MapaRepositorio, ResumenDeMapa } from "../../dominio/MapaRepositorio";
import { BYTES_DE_CABECERA, MapaMapper, resumenDeCabecera, type MapaDto } from "../MapaDto";

/** Un mapa = un archivo `mapas/<numero>.json` de la carpeta elegida. */
export class CarpetaMapaRepositorio implements MapaRepositorio {
  constructor(private readonly carpeta: CarpetaDelProyecto) {}

  private ruta(numero: number): string[] {
    return ["mapas", `${numeroSeguro(numero)}.json`];
  }

  async listar(): Promise<ResumenDeMapa[]> {
    const archivos = (await this.carpeta.listar(["mapas"])).filter((f) => /^\d+\.json$/.test(f));
    const resumenes: ResumenDeMapa[] = [];
    // De a uno y sólo la cabecera: son 83 KB cada uno y un mundo entero son cientos. Leerlos
    // enteros deja al navegador masticando megas antes de poder mostrar la lista.
    for (const archivo of archivos) {
      const resumen = await this.resumenDe(archivo);
      if (resumen) resumenes.push(resumen);
    }
    return resumenes.sort((a, b) => a.numero - b.numero);
  }

  /** Lo que no empieza como un mapa nuestro se lee entero: vale más la lista completa que el ahorro. */
  private async resumenDe(archivo: string): Promise<ResumenDeMapa | null> {
    const cabecera = await this.carpeta.leerCabecera(["mapas", archivo], BYTES_DE_CABECERA);
    if (cabecera === null) return null;
    const resumen = resumenDeCabecera(cabecera);
    if (resumen) return resumen;
    const crudo = await this.carpeta.leerTexto(["mapas", archivo]);
    return crudo ? MapaMapper.resumen(JSON.parse(crudo) as MapaDto) : null;
  }

  async obtener(numero: number): Promise<MapaGuardado | null> {
    const crudo = await this.carpeta.leerTexto(this.ruta(numero));
    return crudo ? MapaMapper.aDominio(JSON.parse(crudo) as MapaDto) : null;
  }

  async guardar(guardado: MapaGuardado): Promise<void> {
    await this.carpeta.escribir(this.ruta(guardado.mapa.numero), JSON.stringify(MapaMapper.aDto(guardado)) + "\n");
  }

  async eliminar(numero: number): Promise<void> {
    await this.carpeta.borrar(this.ruta(numero));
  }
}

/** El número termina siendo un nombre de archivo: nada de rutas ni de signos. */
function numeroSeguro(numero: number): string {
  if (!Number.isInteger(numero) || numero < 1 || numero > 2_147_483_647) throw new Error("Número de mapa inválido.");
  return String(numero);
}
