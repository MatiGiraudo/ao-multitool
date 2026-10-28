import { pedirJson } from "@/compartido/infraestructura/http";
import type { AlmacenDeExportacion, ArchivoExportado, ResultadoDeGuardado } from "../../aplicacion/ExportarTodo";
import { ArchivoExportadoMapper } from "../ArchivoExportadoDto";

/** Los archivos los arma el navegador, pero quien los escribe es el servidor: él ve el disco. */
export class HttpAlmacenDeExportacion implements AlmacenDeExportacion {
  constructor(private readonly url = "/api/exportar") {}

  async guardar(archivos: readonly ArchivoExportado[]): Promise<ResultadoDeGuardado> {
    return pedirJson<ResultadoDeGuardado>(this.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(archivos.map(ArchivoExportadoMapper.aDto)),
    });
  }
}
