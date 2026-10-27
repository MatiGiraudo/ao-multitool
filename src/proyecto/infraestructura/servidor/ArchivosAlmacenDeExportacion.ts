import "server-only";
import path from "node:path";
import { asegurarCarpeta, carpetaDeDatos, escribirAtomico, nombreSeguroDeArchivo } from "@/compartido/infraestructura/carpetaDeDatos";
import type { AlmacenDeExportacion, ArchivoExportado, ResultadoDeGuardado } from "../../aplicacion/ExportarTodo";

/**
 * Deja la exportación en `data/exportado/`, que es la carpeta a la que apunta el lado de Unity.
 *
 * Los nombres vienen del nombre de archivo de cada hoja, que lo escribe quien carga la imagen, así
 * que pasan por `nombreSeguroDeArchivo` antes de tocar el disco: nada de carpetas ni de `..`.
 */
export class ArchivosAlmacenDeExportacion implements AlmacenDeExportacion {
  constructor(private readonly carpeta = carpetaDeDatos("exportado")) {}

  async guardar(archivos: readonly ArchivoExportado[]): Promise<ResultadoDeGuardado> {
    await asegurarCarpeta(this.carpeta);
    for (const archivo of archivos) {
      await escribirAtomico(path.join(this.carpeta, nombreSeguroDeArchivo(archivo.nombreArchivo)), archivo.contenido);
    }
    return { carpeta: this.carpeta, escritos: archivos.length };
  }
}
