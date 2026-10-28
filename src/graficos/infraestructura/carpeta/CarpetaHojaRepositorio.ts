import type { CarpetaDelProyecto } from "@/compartido/infraestructura/carpeta/CarpetaDelProyecto";
import { idSeguro } from "@/compartido/infraestructura/nombresSeguros";
import type { HojaDeSprites } from "../../dominio/HojaDeSprites";
import type { HojaRepositorio } from "../../dominio/HojaRepositorio";
import { HojaMapper, type HojaDto } from "../HojaDto";

/** Cuántos archivos se leen a la vez al listar. Más arriba no se gana nada: deja de ser el disco. */
const POR_TANDA = 64;

/**
 * Una hoja = un archivo `graficos/<id>.json` de la carpeta elegida, igual que en el servidor.
 *
 * Después de importar un cliente clásico hay miles de hojas, así que listar lee de a tandas: en
 * serie son segundos en cada pantalla, y todas juntas el navegador se atraganta.
 */
export class CarpetaHojaRepositorio implements HojaRepositorio {
  constructor(private readonly carpeta: CarpetaDelProyecto) {}

  private ruta(id: string): string[] {
    return ["graficos", `${idSeguro(id)}.json`];
  }

  async listar(): Promise<HojaDeSprites[]> {
    const archivos = (await this.carpeta.listar(["graficos"])).filter((f) => f.endsWith(".json"));
    const hojas: HojaDeSprites[] = [];
    for (let i = 0; i < archivos.length; i += POR_TANDA) {
      const tanda = await Promise.all(archivos.slice(i, i + POR_TANDA).map((f) => this.carpeta.leerTexto(["graficos", f])));
      for (const crudo of tanda) if (crudo) hojas.push(HojaMapper.aDominio(JSON.parse(crudo) as HojaDto));
    }
    return hojas;
  }

  async obtener(id: string): Promise<HojaDeSprites | null> {
    const crudo = await this.carpeta.leerTexto(this.ruta(id));
    return crudo ? HojaMapper.aDominio(JSON.parse(crudo) as HojaDto) : null;
  }

  async guardar(hoja: HojaDeSprites): Promise<void> {
    await this.carpeta.escribir(this.ruta(hoja.id), JSON.stringify(HojaMapper.aDto(hoja), null, 2) + "\n");
  }

  async eliminar(id: string): Promise<void> {
    await this.carpeta.borrar(this.ruta(id));
  }
}
