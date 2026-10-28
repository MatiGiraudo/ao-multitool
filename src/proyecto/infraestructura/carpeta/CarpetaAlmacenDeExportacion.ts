import type { CarpetaDelProyecto } from "@/compartido/infraestructura/carpeta/CarpetaDelProyecto";
import { nombreSeguroDeArchivo } from "@/compartido/infraestructura/nombresSeguros";
import type { AlmacenDeExportacion, ArchivoExportado, ResultadoDeGuardado } from "../../aplicacion/ExportarTodo";

/**
 * Deja la exportación en `exportado/` de la carpeta elegida, igual que el modo servidor.
 *
 * Acá no hace falta que los archivos crucen a ningún lado: el navegador ya los tiene armados y
 * la carpeta es del usuario, así que se escriben derecho. Los `.map` y los `.inf` van como bytes,
 * sin pasar por base64.
 */
export class CarpetaAlmacenDeExportacion implements AlmacenDeExportacion {
  constructor(private readonly carpeta: CarpetaDelProyecto) {}

  async guardar(archivos: readonly ArchivoExportado[]): Promise<ResultadoDeGuardado> {
    for (const archivo of archivos) {
      const partes = ["exportado"];
      if (archivo.carpeta) partes.push(nombreSeguroDeArchivo(archivo.carpeta));
      partes.push(nombreSeguroDeArchivo(archivo.nombreArchivo));
      await this.carpeta.escribir(partes, archivo.contenido);
    }
    // El nombre es el de la carpeta elegida: es todo lo que el navegador deja saber de ella (no
    // hay ruta completa), y alcanza para que el usuario sepa dónde ir a buscar.
    return { carpeta: this.carpeta.nombre ? `${this.carpeta.nombre}/exportado` : "exportado", escritos: archivos.length };
  }
}
