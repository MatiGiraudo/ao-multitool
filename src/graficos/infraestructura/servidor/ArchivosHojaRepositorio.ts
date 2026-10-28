import "server-only";
import path from "node:path";
import { promises as fs } from "node:fs";
import { asegurarCarpeta, carpetaDeDatos, escribirAtomico, idSeguro, leerSiExiste } from "@/compartido/infraestructura/carpetaDeDatos";
import type { HojaDeSprites } from "../../dominio/HojaDeSprites";
import type { HojaRepositorio } from "../../dominio/HojaRepositorio";
import { HojaMapper, type HojaDto } from "../HojaDto";

/** Cuántos archivos se leen a la vez al listar. Más arriba no se gana nada: deja de ser el disco. */
const POR_TANDA = 64;

/**
 * Adaptador de persistencia en disco: una hoja = un archivo `data/graficos/<id>.json`.
 * Un archivo por hoja hace que los cambios se vean claros en git y que dos hojas no choquen.
 */
export class ArchivosHojaRepositorio implements HojaRepositorio {
  constructor(private readonly carpeta = carpetaDeDatos("graficos")) {}

  private ruta(id: string) {
    return path.join(this.carpeta, `${idSeguro(id)}.json`);
  }

  async listar(): Promise<HojaDeSprites[]> {
    await asegurarCarpeta(this.carpeta);
    const archivos = (await fs.readdir(this.carpeta)).filter((f) => f.endsWith(".json"));
    const hojas: HojaDeSprites[] = [];
    // De a tandas y no de a una: con las miles de hojas que deja importar un cliente clásico, leer
    // en serie son segundos de espera en cada pantalla. Todas juntas tampoco, que se queda sin
    // descriptores de archivo.
    for (let i = 0; i < archivos.length; i += POR_TANDA) {
      const tanda = await Promise.all(
        archivos.slice(i, i + POR_TANDA).map(async (f) => {
          const crudo = await fs.readFile(path.join(this.carpeta, f), "utf8");
          return HojaMapper.aDominio(JSON.parse(crudo) as HojaDto);
        }),
      );
      hojas.push(...tanda);
    }
    return hojas;
  }

  async obtener(id: string): Promise<HojaDeSprites | null> {
    const b = await leerSiExiste(this.ruta(id));
    return b ? HojaMapper.aDominio(JSON.parse(b.toString("utf8")) as HojaDto) : null;
  }

  async guardar(hoja: HojaDeSprites): Promise<void> {
    await escribirAtomico(this.ruta(hoja.id), JSON.stringify(HojaMapper.aDto(hoja), null, 2) + "\n");
  }

  async eliminar(id: string): Promise<void> {
    await fs.rm(this.ruta(id), { force: true });
  }
}
