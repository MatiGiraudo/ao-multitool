import "server-only";
import path from "node:path";
import { promises as fs } from "node:fs";
import { asegurarCarpeta, carpetaDeDatos, escribirAtomico, leerCabecera, leerSiExiste } from "@/compartido/infraestructura/carpetaDeDatos";
import type { MapaGuardado, MapaRepositorio, ResumenDeMapa } from "../../dominio/MapaRepositorio";
import { BYTES_DE_CABECERA, MapaMapper, resumenDeCabecera, type MapaDto } from "../MapaDto";

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

  /**
   * La lista lee sólo la cabecera de cada archivo.
   *
   * Un mundo entero son cientos de mapas de 83 KB, y la pantalla pide esto al montarse y después
   * de cada guardado automático: leerlos enteros eran decenas de megas parseadas para devolver
   * tres campos por mapa.
   */
  async listar(): Promise<ResumenDeMapa[]> {
    await asegurarCarpeta(this.carpeta);
    const archivos = (await fs.readdir(this.carpeta)).filter((f) => /^\d+\.json$/.test(f));
    const resumenes = await Promise.all(archivos.map((f) => this.resumenDe(path.join(this.carpeta, f))));
    return resumenes.filter((r) => r !== null).sort((a, b) => a.numero - b.numero);
  }

  /** Lo que no empieza como un mapa nuestro se lee entero: vale más la lista completa que el ahorro. */
  private async resumenDe(ruta: string): Promise<ResumenDeMapa | null> {
    const cabecera = await leerCabecera(ruta, BYTES_DE_CABECERA);
    if (cabecera === null) return null;
    const resumen = resumenDeCabecera(cabecera);
    if (resumen) return resumen;
    const crudo = await leerSiExiste(ruta);
    return crudo ? MapaMapper.resumen(JSON.parse(crudo.toString("utf8")) as MapaDto) : null;
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
