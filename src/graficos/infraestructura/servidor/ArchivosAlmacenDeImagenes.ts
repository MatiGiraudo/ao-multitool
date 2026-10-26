import "server-only";
import path from "node:path";
import { promises as fs } from "node:fs";
import { carpetaDeDatos, escribirAtomico, idSeguro, leerSiExiste } from "@/compartido/infraestructura/carpetaDeDatos";
import type { AlmacenDeImagenes, VarianteDeImagen } from "../../aplicacion/puertos";

/** PNG en disco junto al JSON de la hoja: `<id>.png` y, si se redimensionó, `<id>.original.png`. */
export class ArchivosAlmacenDeImagenes implements AlmacenDeImagenes {
  constructor(private readonly carpeta = carpetaDeDatos("graficos")) {}

  private ruta(id: string, v: VarianteDeImagen) {
    return path.join(this.carpeta, `${idSeguro(id)}${v === "original" ? ".original" : ""}.png`);
  }

  async guardar(hojaId: string, png: Blob, variante: VarianteDeImagen): Promise<void> {
    await escribirAtomico(this.ruta(hojaId, variante), new Uint8Array(await png.arrayBuffer()));
  }

  async leer(hojaId: string, variante: VarianteDeImagen): Promise<Blob | null> {
    const b = await leerSiExiste(this.ruta(hojaId, variante));
    return b ? new Blob([new Uint8Array(b)], { type: "image/png" }) : null;
  }

  async eliminar(hojaId: string): Promise<void> {
    await fs.rm(this.ruta(hojaId, "actual"), { force: true });
    await fs.rm(this.ruta(hojaId, "original"), { force: true });
  }
}
