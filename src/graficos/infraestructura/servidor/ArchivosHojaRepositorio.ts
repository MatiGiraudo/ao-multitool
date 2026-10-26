import "server-only";
import path from "node:path";
import { promises as fs } from "node:fs";
import { asegurarCarpeta, carpetaDeDatos, escribirAtomico, idSeguro, leerSiExiste } from "@/compartido/infraestructura/carpetaDeDatos";
import type { HojaDeSprites } from "../../dominio/HojaDeSprites";
import type { HojaRepositorio } from "../../dominio/HojaRepositorio";
import { HojaMapper, type HojaDto } from "../HojaDto";

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
    for (const f of archivos) {
      const crudo = await fs.readFile(path.join(this.carpeta, f), "utf8");
      hojas.push(HojaMapper.aDominio(JSON.parse(crudo) as HojaDto));
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
