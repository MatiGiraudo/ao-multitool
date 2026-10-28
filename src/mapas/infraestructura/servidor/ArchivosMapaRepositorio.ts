import "server-only";
import path from "node:path";
import { promises as fs } from "node:fs";
import { asegurarCarpeta, carpetaDeDatos, escribirAtomico, leerSiExiste } from "@/compartido/infraestructura/carpetaDeDatos";
import type { MapaGuardado, MapaRepositorio, ResumenDeMapa } from "../../dominio/MapaRepositorio";
import { MapaMapper, type MapaDto } from "../MapaDto";

/**
 * Un mapa = un archivo `data/mapas/<numero>.json`.
 *
 * Igual que con las hojas, un archivo por mapa: así dos mapas no chocan al guardarse y el diff de
 * git muestra cuál cambió.
 */
export class ArchivosMapaRepositorio implements MapaRepositorio {
  constructor(private readonly carpeta = carpetaDeDatos("mapas")) {}

  private ruta(numero: number) {
    return path.join(this.carpeta, `${numeroSeguro(numero)}.json`);
  }

  async listar(): Promise<ResumenDeMapa[]> {
    await asegurarCarpeta(this.carpeta);
    const archivos = (await fs.readdir(this.carpeta)).filter((f) => /^\d+\.json$/.test(f));
    const resumenes = await Promise.all(
      archivos.map(async (f) => {
        const crudo = await fs.readFile(path.join(this.carpeta, f), "utf8");
        return MapaMapper.resumen(JSON.parse(crudo) as MapaDto);
      }),
    );
    return resumenes.sort((a, b) => a.numero - b.numero);
  }

  async obtener(numero: number): Promise<MapaGuardado | null> {
    const b = await leerSiExiste(this.ruta(numero));
    return b ? MapaMapper.aDominio(JSON.parse(b.toString("utf8")) as MapaDto) : null;
  }

  async guardar(guardado: MapaGuardado): Promise<void> {
    await escribirAtomico(this.ruta(guardado.mapa.numero), JSON.stringify(MapaMapper.aDto(guardado)) + "\n");
  }

  async eliminar(numero: number): Promise<void> {
    await fs.rm(this.ruta(numero), { force: true });
  }
}

/** El número termina siendo un nombre de archivo: nada de rutas ni de signos. */
function numeroSeguro(numero: number): string {
  if (!Number.isInteger(numero) || numero < 1 || numero > 2_147_483_647) throw new Error("Número de mapa inválido.");
  return String(numero);
}
